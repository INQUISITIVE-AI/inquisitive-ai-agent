// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// INQAI FeeDistributor — Autonomous Value Accrual
//
// Distributes vault performance fees according to documentation:
//   60% → Systematic open-market INQAI buybacks (distributed to stakers)
//   20% → Permanently burned (deflationary)
//   20% → Treasury for protocol operations
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

// ── FeeDistributor Contract ─────────────────────────────────────────────────
contract FeeDistributor {
    
    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant BUYBACK_SHARE = 60;  // 60% to stakers
    uint256 public constant BURN_SHARE = 20;     // 20% burned
    uint256 public constant TREASURY_SHARE = 20;  // 20% to treasury
    uint256 public constant TOTAL_SHARES = 100;
    
    uint24 public constant POOL_FEE = 3000; // 0.3% Uniswap fee
    uint256 public constant SLIPPAGE_TOLERANCE = 50; // 0.5% max slippage
    
    // ── Protocol Addresses ───────────────────────────────────────────────────
    address public constant INQAI = 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5;
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant TEAM_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    address public constant VAULT = 0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb;
    
    // Uniswap V3 SwapRouter
    address public constant SWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    
    // ── State ────────────────────────────────────────────────────────────────
    address public owner;
    address public stakingContract;
    bool public paused;
    
    // Accumulated stats
    uint256 public totalFeesCollected;
    uint256 public totalBuybacks;
    uint256 public totalBurned;
    uint256 public totalToTreasury;
    uint256 public distributionCount;
    
    // ── Events ───────────────────────────────────────────────────────────────
    event FeesDistributed(
        uint256 totalAmount,
        uint256 buybackAmount,
        uint256 burnAmount,
        uint256 treasuryAmount,
        uint256 inqaiBought
    );
    event FeesCollected(uint256 amount);
    event StakingContractSet(address staking);
    
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
        // Call vault to send accumulated fees
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
        uint256 buybackAmount = (balance * BUYBACK_SHARE) / TOTAL_SHARES;
        uint256 burnAmount = (balance * BURN_SHARE) / TOTAL_SHARES;
        uint256 treasuryAmount = balance - buybackAmount - burnAmount;
        
        // 1. Wrap ETH to WETH for swapping
        IWETH weth = IWETH(WETH);
        weth.deposit{value: buybackAmount + burnAmount}();
        
        // 2. Buy INQAI with buyback portion
        uint256 inqaiBought = _buyINQAI(buybackAmount);
        
        // 3. Send INQAI to staking contract
        if (stakingContract != address(0) && inqaiBought > 0) {
            IERC20 inqai = IERC20(INQAI);
            inqai.transfer(stakingContract, inqaiBought);
            INQAIStaking(stakingContract).distributeRewards(inqaiBought);
        }
        
        // 4. Buy INQAI with burn portion and burn it
        uint256 inqaiToBurn = _buyINQAI(burnAmount);
        if (inqaiToBurn > 0) {
            _burnINQAI(inqaiToBurn);
        }
        
        // 5. Send treasury portion to team wallet
        (bool success, ) = payable(TEAM_WALLET).call{value: treasuryAmount}("");
        require(success, "Treasury transfer failed");
        
        // Update stats
        totalBuybacks += buybackAmount;
        totalBurned += burnAmount;
        totalToTreasury += treasuryAmount;
        distributionCount++;
        
        emit FeesDistributed(
            balance,
            buybackAmount,
            burnAmount,
            treasuryAmount,
            inqaiBought + inqaiToBurn
        );
    }
    
    // ── Internal: Buy INQAI on Uniswap V3 ────────────────────────────────────
    function _buyINQAI(uint256 ethAmount) internal returns (uint256 inqaiReceived) {
        IWETH weth = IWETH(WETH);
        IUniswapV3Router router = IUniswapV3Router(SWAP_ROUTER);
        
        // Approve router
        weth.approve(SWAP_ROUTER, ethAmount);
        
        // Build swap params
        // Note: This is a simplified version - assumes INQAI/WETH pool exists
        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: WETH,
            tokenOut: INQAI,
            fee: POOL_FEE,
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: ethAmount,
            amountOutMinimum: 0, // Accept any amount (use price oracle in production)
            sqrtPriceLimitX96: 0
        });
        
        // Execute swap
        inqaiReceived = router.exactInputSingle(params);
        
        return inqaiReceived;
    }
    
    // ── Internal: Burn INQAI ────────────────────────────────────────────────
    function _burnINQAI(uint256 amount) internal {
        IERC20 inqai = IERC20(INQAI);
        // Transfer to burn address (0xdead)
        inqai.transfer(address(0xdead), amount);
    }
    
    // ── View Functions ───────────────────────────────────────────────────────
    function getStats() external view returns (
        uint256 feesCollected_,
        uint256 buybacks_,
        uint256 burned_,
        uint256 toTreasury_,
        uint256 distributions_,
        uint256 currentBalance
    ) {
        return (
            totalFeesCollected,
            totalBuybacks,
            totalBurned,
            totalToTreasury,
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
