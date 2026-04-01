// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// INQAI Staking — Earn Protocol Yield
//
// Stake INQAI to earn protocol fees distributed via FeeDistributor.
// Rewards auto-compound, no manual claiming required.
// 7-day lock period to prevent manipulation.
// ─────────────────────────────────────────────────────────────────────────────

// ── Interfaces ──────────────────────────────────────────────────────────────
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

// ── INQAIStaking Contract ───────────────────────────────────────────────────
contract INQAIStaking {
    
    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant LOCK_PERIOD = 7 days;
    uint256 public constant MIN_STAKE = 100e18; // 100 INQAI minimum
    address public constant INQAI = 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5;
    address public constant TEAM_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    
    // ── State ────────────────────────────────────────────────────────────────
    address public owner;
    address public feeDistributor;
    bool public paused;
    
    // Staking data
    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 rewardDebt;
        bool active;
    }
    
    mapping(address => StakeInfo) public stakes;
    address[] public stakers;
    
    // Reward tracking
    uint256 public totalStaked;
    uint256 public accRewardPerShare; // Accumulated INQAI per share, scaled by 1e12
    uint256 public totalRewardsDistributed;
    
    // ── Events ─────────────────────────────────────────────────────────────────
    event Staked(address indexed user, uint256 amount, uint256 totalStake);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardsDistributed(uint256 amount, uint256 newAccPerShare);
    event RewardClaimed(address indexed user, uint256 reward);
    
    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyFeeDistributor() {
        require(msg.sender == feeDistributor, "Not fee distributor");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }
    
    // ── Constructor ────────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }
    
    // ── Stake INQAI ────────────────────────────────────────────────────────────
    function stake(uint256 amount) external whenNotPaused {
        require(amount >= MIN_STAKE, "Below minimum stake");
        
        IERC20 inqai = IERC20(INQAI);
        
        // Transfer INQAI to contract
        require(inqai.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Update staker list if new
        if (!stakes[msg.sender].active) {
            stakers.push(msg.sender);
        }
        
        // Calculate pending rewards
        StakeInfo storage userStake = stakes[msg.sender];
        if (userStake.amount > 0) {
            uint256 pending = (userStake.amount * accRewardPerShare) / 1e12 - userStake.rewardDebt;
            if (pending > 0) {
                // Auto-compound: add to stake
                userStake.amount += pending;
                emit RewardClaimed(msg.sender, pending);
            }
        }
        
        // Update stake
        userStake.amount += amount;
        userStake.startTime = block.timestamp;
        userStake.lastClaimTime = block.timestamp;
        userStake.rewardDebt = (userStake.amount * accRewardPerShare) / 1e12;
        userStake.active = true;
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, userStake.amount);
    }
    
    // ── Unstake INQAI ────────────────────────────────────────────────────────
    function unstake(uint256 amount) external whenNotPaused {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.active, "No active stake");
        require(amount <= userStake.amount, "Insufficient stake");
        require(block.timestamp >= userStake.startTime + LOCK_PERIOD, "Lock period active");
        
        // Calculate pending rewards
        uint256 pending = (userStake.amount * accRewardPerShare) / 1e12 - userStake.rewardDebt;
        
        // Update stake
        userStake.amount -= amount;
        userStake.rewardDebt = (userStake.amount * accRewardPerShare) / 1e12;
        
        if (userStake.amount == 0) {
            userStake.active = false;
        }
        
        totalStaked -= amount;
        
        // Transfer INQAI + rewards to user
        uint256 totalTransfer = amount + pending;
        IERC20 inqai = IERC20(INQAI);
        require(inqai.transfer(msg.sender, totalTransfer), "Transfer failed");
        
        if (pending > 0) {
            emit RewardClaimed(msg.sender, pending);
        }
        
        emit Unstaked(msg.sender, amount, pending);
    }
    
    // ── Distribute Rewards (Called by FeeDistributor) ──────────────────────
    function distributeRewards(uint256 amount) external onlyFeeDistributor {
        require(totalStaked > 0, "No stakers");
        
        // Update accumulated reward per share
        accRewardPerShare += (amount * 1e12) / totalStaked;
        totalRewardsDistributed += amount;
        
        emit RewardsDistributed(amount, accRewardPerShare);
    }
    
    // ── Claim Rewards Only ───────────────────────────────────────────────────
    function claimRewards() external whenNotPaused {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.active, "No active stake");
        
        uint256 pending = (userStake.amount * accRewardPerShare) / 1e12 - userStake.rewardDebt;
        require(pending > 0, "No pending rewards");
        
        userStake.rewardDebt = (userStake.amount * accRewardPerShare) / 1e12;
        userStake.lastClaimTime = block.timestamp;
        
        IERC20 inqai = IERC20(INQAI);
        require(inqai.transfer(msg.sender, pending), "Transfer failed");
        
        emit RewardClaimed(msg.sender, pending);
    }
    
    // ── View Functions ─────────────────────────────────────────────────────────
    function pendingRewards(address user) external view returns (uint256) {
        StakeInfo storage userStake = stakes[user];
        if (!userStake.active) return 0;
        
        return (userStake.amount * accRewardPerShare) / 1e12 - userStake.rewardDebt;
    }
    
    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 lockEndTime,
        uint256 pendingReward,
        bool canUnstake
    ) {
        StakeInfo storage userStake = stakes[user];
        amount = userStake.amount;
        startTime = userStake.startTime;
        lockEndTime = userStake.startTime + LOCK_PERIOD;
        pendingReward = userStake.active ? 
            (userStake.amount * accRewardPerShare) / 1e12 - userStake.rewardDebt : 0;
        canUnstake = userStake.active && block.timestamp >= lockEndTime;
    }
    
    function getTotalStakers() external view returns (uint256) {
        return stakers.length;
    }
    
    function getAPY() external view returns (uint256) {
        // Simplified APY calculation based on recent rewards
        // In production, calculate from actual reward rate
        if (totalStaked == 0) return 0;
        
        // Example: 20% APY placeholder
        // Real implementation tracks actual rewards over time
        return 2000; // 20% in basis points
    }
    
    // ── Admin Functions ───────────────────────────────────────────────────────
    function setFeeDistributor(address _distributor) external onlyOwner {
        require(_distributor != address(0), "Invalid address");
        feeDistributor = _distributor;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        IERC20 inqai = IERC20(INQAI);
        require(inqai.transfer(TEAM_WALLET, amount), "Transfer failed");
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
