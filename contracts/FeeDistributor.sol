// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// INQAI FeeDistributor — Autonomous Value Accrual
//
// Distributes vault performance fees:
//   60% → Systematic open-market INQAI buybacks (distributed to stakers)
//   20% → Permanently burned (deflationary)
//   15% → Treasury for protocol operations
//    5% → Chainlink Automation upkeep top-up (self-sustaining automation)
//
// Called by Chainlink Automation or anyone. Zero private keys required.
// ─────────────────────────────────────────────────────────────────────────────

// ── Interfaces ──────────────────────────────────────────────────────────────
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface INQAIStaking {
    function distributeRewards(uint256 amount) external;
}

// Chainlink LINK token — transferAndCall funds the upkeep directly
interface ILinkToken {
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// ── FeeDistributor Contract ─────────────────────────────────────────────────
contract FeeDistributor {

    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant BUYBACK_SHARE   = 60; // 60% to stakers via buyback
    uint256 public constant BURN_SHARE      = 20; // 20% burned
    uint256 public constant TREASURY_SHARE  = 15; // 15% to treasury
    uint256 public constant CHAINLINK_SHARE =  5; // 5%  auto-tops up upkeep
    uint256 public constant TOTAL_SHARES    = 100;

    uint24 public constant POOL_FEE         = 3000; // 0.3% Uniswap V3 tier
    uint24 public constant LINK_POOL_FEE    = 3000; // WETH/LINK 0.3% pool
    uint256 public constant SLIPPAGE_TOLERANCE = 50; // 0.5%

    // ── Protocol Addresses ───────────────────────────────────────────────────
    address public constant INQAI       = 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5;
    address public constant WETH        = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant LINK        = 0x514910771AF9Ca656af840dff83E8264EcF986CA;
    address public constant TEAM_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    address public constant VAULT       = 0x721B0c1fcf28646D6e0f608A15495F7227cB6CFb;

    // Uniswap V3 SwapRouter
    address public constant SWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    // Chainlink Automation Registry v2.1 (Mainnet)
    address public constant AUTOMATION_REGISTRY = 0x6593c7De001fC8542bB1703532EE1E5aA0D458fD;

    // ── State ────────────────────────────────────────────────────────────────
    address public owner;
    address public stakingContract;
    bool    public paused;

    // Chainlink upkeep ID — set by owner after registering at automation.chain.link
    uint256 public upkeepId;
    // When false, the 5% chainlink share is sent to treasury instead
    bool    public chainlinkFundingEnabled;

    // Accumulated stats
    uint256 public totalFeesCollected;
    uint256 public totalBuybacks;
    uint256 public totalBurned;
    uint256 public totalToTreasury;
    uint256 public totalToChainlink;
    uint256 public distributionCount;

    // ── Events ───────────────────────────────────────────────────────────────
    event FeesDistributed(
        uint256 totalAmount,
        uint256 buybackAmount,
        uint256 burnAmount,
        uint256 treasuryAmount,
        uint256 chainlinkAmount,
        uint256 inqaiBought
    );
    event FeesCollected(uint256 amount);
    event StakingContractSet(address staking);
    event UpkeepIdSet(uint256 upkeepId);
    event ChainlinkFunded(uint256 ethIn, uint256 linkFunded);

    // ── Modifiers ───────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    // ── Constructor ─────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ── Receive ETH from Vault ───────────────────────────────────────────────
    receive() external payable {
        totalFeesCollected += msg.value;
        emit FeesCollected(msg.value);
    }

    // ── Collect Fees from Vault ─────────────────────────────────────────────
    function collectFromVault() external whenNotPaused {
        (bool success, ) = payable(VAULT).call{value: 0}(
            abi.encodeWithSignature("collectFees()")
        );
        require(success, "Vault collection failed");
    }

    // ── Main Distribution Function ────────────────────────────────────────────
    function distributeFees() external whenNotPaused {
        uint256 balance = address(this).balance;
        require(balance > 0.01 ether, "Insufficient balance");

        // Calculate shares
        uint256 buybackAmount   = (balance * BUYBACK_SHARE)   / TOTAL_SHARES;
        uint256 burnAmount      = (balance * BURN_SHARE)       / TOTAL_SHARES;
        uint256 chainlinkAmount = (balance * CHAINLINK_SHARE)  / TOTAL_SHARES;
        uint256 treasuryAmount  = balance - buybackAmount - burnAmount - chainlinkAmount;

        // 1. Wrap ETH to WETH for swapping (buyback + burn portions)
        IWETH(WETH).deposit{value: buybackAmount + burnAmount}();

        // 2. Buy INQAI with buyback portion → send to stakers
        uint256 inqaiBought = _buyINQAI(buybackAmount);
        if (stakingContract != address(0) && inqaiBought > 0) {
            IERC20(INQAI).transfer(stakingContract, inqaiBought);
            INQAIStaking(stakingContract).distributeRewards(inqaiBought);
        }

        // 3. Buy INQAI with burn portion → burn it
        uint256 inqaiToBurn = _buyINQAI(burnAmount);
        if (inqaiToBurn > 0) {
            IERC20(INQAI).transfer(address(0xdead), inqaiToBurn);
        }

        // 4. Chainlink Automation top-up — buy LINK and fund the upkeep
        if (chainlinkFundingEnabled && upkeepId != 0) {
            _fundChainlinkUpkeep(chainlinkAmount);
        } else {
            // Fall back: chainlink share goes to treasury until upkeep is registered
            treasuryAmount += chainlinkAmount;
            chainlinkAmount = 0;
        }

        // 5. Treasury
        (bool ok, ) = payable(TEAM_WALLET).call{value: treasuryAmount}("");
        require(ok, "Treasury transfer failed");

        // Update stats
        totalBuybacks     += buybackAmount;
        totalBurned       += burnAmount;
        totalToTreasury   += treasuryAmount;
        totalToChainlink  += chainlinkAmount;
        distributionCount++;

        emit FeesDistributed(balance, buybackAmount, burnAmount, treasuryAmount, chainlinkAmount, inqaiBought + inqaiToBurn);
    }

    // ── Internal: Buy INQAI on Uniswap V3 ────────────────────────────────────
    function _buyINQAI(uint256 ethAmount) internal returns (uint256 inqaiReceived) {
        IWETH(WETH).approve(SWAP_ROUTER, ethAmount);
        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
            tokenIn:           WETH,
            tokenOut:          INQAI,
            fee:               POOL_FEE,
            recipient:         address(this),
            deadline:          block.timestamp + 300,
            amountIn:          ethAmount,
            amountOutMinimum:  0,
            sqrtPriceLimitX96: 0
        });
        inqaiReceived = IUniswapV3Router(SWAP_ROUTER).exactInputSingle(params);
    }

    // ── Internal: Buy LINK and top up Chainlink upkeep ───────────────────────
    function _fundChainlinkUpkeep(uint256 ethAmount) internal {
        // Wrap ETH → WETH
        IWETH(WETH).deposit{value: ethAmount}();
        // Swap WETH → LINK via Uniswap V3 0.3% pool
        IWETH(WETH).approve(SWAP_ROUTER, ethAmount);
        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
            tokenIn:           WETH,
            tokenOut:          LINK,
            fee:               LINK_POOL_FEE,
            recipient:         address(this),
            deadline:          block.timestamp + 300,
            amountIn:          ethAmount,
            amountOutMinimum:  0,
            sqrtPriceLimitX96: 0
        });
        uint256 linkReceived = IUniswapV3Router(SWAP_ROUTER).exactInputSingle(params);

        if (linkReceived > 0) {
            // transferAndCall funds the upkeep atomically — no separate approve needed
            ILinkToken(LINK).transferAndCall(
                AUTOMATION_REGISTRY,
                linkReceived,
                abi.encode(upkeepId)
            );
            emit ChainlinkFunded(ethAmount, linkReceived);
        }
    }

    // ── View Functions ───────────────────────────────────────────────────────
    function getStats() external view returns (
        uint256 feesCollected_,
        uint256 buybacks_,
        uint256 burned_,
        uint256 toTreasury_,
        uint256 toChainlink_,
        uint256 distributions_,
        uint256 currentBalance
    ) {
        return (
            totalFeesCollected,
            totalBuybacks,
            totalBurned,
            totalToTreasury,
            totalToChainlink,
            distributionCount,
            address(this).balance
        );
    }

    function pendingDistribution() external view returns (uint256) {
        return address(this).balance;
    }

    // ── Admin Functions ──────────────────────────────────────────────────────
    function setStakingContract(address _staking) external onlyOwner {
        require(_staking != address(0), "Invalid address");
        stakingContract = _staking;
        emit StakingContractSet(_staking);
    }

    // Call after registering your upkeep at automation.chain.link
    function setUpkeepId(uint256 _upkeepId) external onlyOwner {
        upkeepId = _upkeepId;
        chainlinkFundingEnabled = true;
        emit UpkeepIdSet(_upkeepId);
    }

    function setChainlinkFundingEnabled(bool _enabled) external onlyOwner {
        chainlinkFundingEnabled = _enabled;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        (bool success, ) = payable(TEAM_WALLET).call{value: balance}("");
        require(success, "Transfer failed");
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
