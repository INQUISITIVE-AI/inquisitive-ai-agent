// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ── Vault interface for execution ─────────────────────────────────────────────
interface IInquisitiveVault {
    function rebalance(
        address[] calldata tokens,
        uint256[] calldata amounts,
        bool[]    calldata isBuy,
        uint24[]  calldata poolFees
    ) external payable;
    function buyAsset(address tokenOut, uint256 amountIn, uint256 minOut, uint24 fee, string calldata label) external payable returns (uint256);
    function sellAsset(address tokenIn, uint256 amountIn, uint256 minOut, uint24 fee, string calldata label) external returns (uint256);
    function lendAsset(address asset, uint256 amount) external;
    function stakeETH(uint256 amount) external returns (uint256);
    function getETHBalance() external view returns (uint256);
    function cycleCount() external view returns (uint256);
}

// ── AIStrategyManager — receives AI decisions and executes via vault ──────────
// This contract is called by the AI execution backend (Node.js) with the
// private key set as AI_EXECUTOR_PRIVATE_KEY in environment variables.
// The backend reads the 5-engine scoring signals and calls executeSignals().
contract AIStrategyManager {
    // ── State ─────────────────────────────────────────────────────────────────
    address public owner;
    address public vault;
    address public strategy;

    // Signal thresholds (mirrors _brain.ts CT constants)
    uint256 public constant BUY_THRESHOLD        = 72;  // finalScore >= 0.72 → BUY
    uint256 public constant ACCUMULATE_THRESHOLD = 65;  // finalScore >= 0.65 → ACCUMULATE
    uint256 public constant SELL_THRESHOLD       = 35;  // finalScore <= 0.35 → SELL
    uint256 public constant REDUCE_THRESHOLD     = 42;  // finalScore <= 0.42 → REDUCE
    uint256 public constant MAX_TRADE_PCT        = 200; // 2% max portfolio risk per trade (200 bps)

    // Execution stats
    uint256 public totalExecutedCycles;
    uint256 public totalTradesExecuted;
    mapping(address => uint256) public lastTradeBlock; // prevent sandwich attacks

    // ── Events ────────────────────────────────────────────────────────────────
    event SignalExecuted(address indexed token, string action, uint256 ethAmount, uint256 confidence);
    event CycleComplete(uint256 cycle, uint256 tradesExecuted, uint256 ethDeployed);
    event VaultUpdated(address indexed newVault);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor(address _strategy, address _vault) {
        owner    = msg.sender;
        strategy = _strategy;
        vault    = _vault;
    }

    // ── Admin ──────────────────────────────────────────────────────────────────
    function updateVault(address _vault) external onlyOwner {
        vault = _vault;
        emit VaultUpdated(_vault);
    }

    function updateStrategy(address _strategy) external onlyOwner {
        strategy = _strategy;
    }

    // ── Core: execute AI signals on-chain ──────────────────────────────────────
    // Called by the Node.js AI backend when signals exceed confidence thresholds.
    // tokens:       Array of ERC-20 token addresses to trade
    // actions:      "BUY", "SELL", "ACCUMULATE", "REDUCE", "LEND", "STAKE"
    // ethAmounts:   ETH wei to spend per trade (0 for sell = sell 10% of position)
    // poolFees:     Uniswap V3 pool fee (500, 3000, or 10000)
    // confidences:  AI confidence score × 100 (e.g. 87 = 87%)
    function executeSignals(
        address[] calldata tokens,
        string[]  calldata actions,
        uint256[] calldata ethAmounts,
        uint24[]  calldata poolFees,
        uint256[] calldata confidences
    ) external payable onlyOwner {
        require(tokens.length == actions.length, "Length mismatch");
        require(vault != address(0), "Vault not set");

        uint256 ethDeployed     = 0;
        uint256 tradesExecuted  = 0;
        totalExecutedCycles++;

        uint256 vaultEth = IInquisitiveVault(vault).getETHBalance();

        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(0)) continue;
            if (confidences[i] < BUY_THRESHOLD && _isBytes32Equal(actions[i], "BUY")) continue;

            // Anti-sandwich: skip if traded in same block
            if (lastTradeBlock[tokens[i]] == block.number) continue;

            bytes32 actionHash = keccak256(bytes(actions[i]));
            string memory label = string(abi.encodePacked(actions[i], " ", _toStr(confidences[i]), "%"));

            if (actionHash == keccak256("BUY") || actionHash == keccak256("ACCUMULATE")) {
                uint256 amount = ethAmounts[i];
                if (amount == 0) continue;
                // Hard limit: max 2% of vault per trade
                uint256 maxAllowed = vaultEth * MAX_TRADE_PCT / 10000;
                if (amount > maxAllowed) amount = maxAllowed;

                try IInquisitiveVault(vault).buyAsset{value: amount}(
                    tokens[i], amount, 0, poolFees[i], label
                ) {
                    lastTradeBlock[tokens[i]] = block.number;
                    ethDeployed += amount;
                    tradesExecuted++;
                    emit SignalExecuted(tokens[i], actions[i], amount, confidences[i]);
                } catch {}

            } else if (actionHash == keccak256("SELL") || actionHash == keccak256("REDUCE")) {
                // Sell via vault — amount represents token amount to sell
                try IInquisitiveVault(vault).sellAsset(
                    tokens[i], ethAmounts[i], 0, poolFees[i], label
                ) {
                    lastTradeBlock[tokens[i]] = block.number;
                    tradesExecuted++;
                    emit SignalExecuted(tokens[i], actions[i], ethAmounts[i], confidences[i]);
                } catch {}

            } else if (actionHash == keccak256("LEND")) {
                try IInquisitiveVault(vault).lendAsset(tokens[i], ethAmounts[i]) {
                    tradesExecuted++;
                    emit SignalExecuted(tokens[i], "LEND", ethAmounts[i], confidences[i]);
                } catch {}

            } else if (actionHash == keccak256("STAKE")) {
                uint256 stakeAmt = ethAmounts[i];
                try IInquisitiveVault(vault).stakeETH(stakeAmt) {
                    ethDeployed += stakeAmt;
                    tradesExecuted++;
                    emit SignalExecuted(tokens[i], "STAKE", stakeAmt, confidences[i]);
                } catch {}
            }
        }

        totalTradesExecuted += tradesExecuted;
        emit CycleComplete(totalExecutedCycles, tradesExecuted, ethDeployed);
    }

    // ── Simple management call (for compatibility) ─────────────────────────────
    function executeManagement() external onlyOwner returns (bool) {
        totalExecutedCycles++;
        return true;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function _isBytes32Equal(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    function _toStr(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 temp = v; uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buf = new bytes(digits);
        while (v != 0) { digits--; buf[digits] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(buf);
    }

    receive() external payable {}
}
