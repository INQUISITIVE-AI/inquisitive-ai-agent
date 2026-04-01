// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// INQAI Insurance Fund — Protocol Protection Backstop
//
// Accumulates safety reserves from protocol fees to:
// - Cover extreme losses (>15% drawdown)
// - Compensate users in black swan events
// - Fund emergency liquidity
//
// Funded by 5% of treasury allocation. Governance controlled.
// ─────────────────────────────────────────────────────────────────────────────

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

contract INQAIInsurance {
    
    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant MAX_COVERAGE_PERCENT = 5000; // 50% max payout
    uint256 public constant BASIS_POINTS = 10000;
    
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant INQAI = 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5;
    address public constant TEAM_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    
    // ── State ────────────────────────────────────────────────────────────────
    address public owner;
    address public governance;
    address public emergencyBreak;
    
    uint256 public totalContributions;
    uint256 public totalPayouts;
    uint256 public coverageRatio = 1000; // 10% of losses covered by default
    
    // Claims
    struct Claim {
        uint256 id;
        address claimant;
        uint256 amount;
        uint256 lossAmount;
        string reason;
        uint256 timestamp;
        bool approved;
        bool paid;
    }
    
    mapping(uint256 => Claim) public claims;
    uint256 public claimCount;
    
    // User coverage tracking
    mapping(address => uint256) public userPremiumPaid;
    mapping(address => uint256) public userClaimsPaid;
    
    // ── Events ─────────────────────────────────────────────────────────────────
    event Contribution(address indexed from, uint256 amount);
    event ClaimFiled(uint256 indexed claimId, address claimant, uint256 amount, string reason);
    event ClaimApproved(uint256 indexed claimId, uint256 payoutAmount);
    event ClaimPaid(uint256 indexed claimId, address claimant, uint256 amount);
    event CoverageRatioUpdated(uint256 newRatio);
    
    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyGovernance() {
        require(msg.sender == governance || msg.sender == owner, "Not authorized");
        _;
    }
    
    // ── Constructor ─────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }
    
    // ── Receive Contributions ─────────────────────────────────────────────────
    receive() external payable {
        if (msg.value > 0) {
            totalContributions += msg.value;
            emit Contribution(msg.sender, msg.value);
        }
    }
    
    function contributeETH() external payable {
        require(msg.value > 0, "Zero contribution");
        totalContributions += msg.value;
        emit Contribution(msg.sender, msg.value);
    }
    
    function contributeINQAI(uint256 amount) external {
        require(amount > 0, "Zero contribution");
        IERC20 inqai = IERC20(INQAI);
        require(inqai.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        totalContributions += amount; // Count in INQAI units
        emit Contribution(msg.sender, amount);
    }
    
    // ── File Claim (users who suffered losses) ────────────────────────────────
    function fileClaim(uint256 lossAmount, string memory reason) external returns (uint256) {
        require(lossAmount > 0, "Zero loss");
        
        claimCount++;
        uint256 claimId = claimCount;
        
        // Calculate potential payout based on coverage ratio
        uint256 potentialPayout = (lossAmount * coverageRatio) / BASIS_POINTS;
        
        claims[claimId] = Claim({
            id: claimId,
            claimant: msg.sender,
            amount: potentialPayout,
            lossAmount: lossAmount,
            reason: reason,
            timestamp: block.timestamp,
            approved: false,
            paid: false
        });
        
        emit ClaimFiled(claimId, msg.sender, potentialPayout, reason);
        
        return claimId;
    }
    
    // ── Approve Claim (governance) ────────────────────────────────────────────
    function approveClaim(uint256 claimId) external onlyGovernance {
        Claim storage claim = claims[claimId];
        require(claim.id != 0, "Claim not found");
        require(!claim.approved, "Already approved");
        require(!claim.paid, "Already paid");
        
        // Verify we have funds
        require(address(this).balance >= claim.amount, "Insufficient funds");
        
        claim.approved = true;
        
        emit ClaimApproved(claimId, claim.amount);
    }
    
    // ── Pay Approved Claim ──────────────────────────────────────────────────
    function payClaim(uint256 claimId) external {
        Claim storage claim = claims[claimId];
        require(claim.approved, "Not approved");
        require(!claim.paid, "Already paid");
        
        claim.paid = true;
        totalPayouts += claim.amount;
        userClaimsPaid[claim.claimant] += claim.amount;
        
        // Transfer ETH to claimant
        (bool success, ) = payable(claim.claimant).call{value: claim.amount}("");
        require(success, "Transfer failed");
        
        emit ClaimPaid(claimId, claim.claimant, claim.amount);
    }
    
    // ── Emergency Auto-Payout (from EmergencyBreak contract) ───────────────
    function emergencyPayout(address[] calldata victims, uint256[] calldata amounts) external {
        require(msg.sender == emergencyBreak, "Not authorized");
        require(victims.length == amounts.length, "Length mismatch");
        
        uint256 totalPayout = 0;
        for (uint i = 0; i < amounts.length; i++) {
            totalPayout += amounts[i];
        }
        
        require(address(this).balance >= totalPayout, "Insufficient funds");
        
        for (uint i = 0; i < victims.length; i++) {
            if (amounts[i] > 0) {
                (bool success, ) = payable(victims[i]).call{value: amounts[i]}("");
                if (success) {
                    totalPayouts += amounts[i];
                    userClaimsPaid[victims[i]] += amounts[i];
                }
            }
        }
    }
    
    // ── Governance Functions ────────────────────────────────────────────────
    function setCoverageRatio(uint256 newRatio) external onlyGovernance {
        require(newRatio <= MAX_COVERAGE_PERCENT, "Ratio too high");
        coverageRatio = newRatio;
        emit CoverageRatioUpdated(newRatio);
    }
    
    function setGovernance(address _governance) external onlyOwner {
        governance = _governance;
    }
    
    function setEmergencyBreak(address _emergency) external onlyOwner {
        emergencyBreak = _emergency;
    }
    
    // ── View Functions ───────────────────────────────────────────────────────
    function getFundStats() external view returns (
        uint256 totalContributions_,
        uint256 totalPayouts_,
        uint256 currentBalance,
        uint256 coverageRatio_,
        uint256 claimCount_
    ) {
        return (
            totalContributions,
            totalPayouts,
            address(this).balance,
            coverageRatio,
            claimCount
        );
    }
    
    function getClaim(uint256 claimId) external view returns (
        uint256 id,
        address claimant,
        uint256 amount,
        uint256 lossAmount,
        string memory reason,
        uint256 timestamp,
        bool approved,
        bool paid
    ) {
        Claim storage c = claims[claimId];
        return (
            c.id,
            c.claimant,
            c.amount,
            c.lossAmount,
            c.reason,
            c.timestamp,
            c.approved,
            c.paid
        );
    }
    
    function calculatePayout(uint256 lossAmount) external view returns (uint256) {
        return (lossAmount * coverageRatio) / BASIS_POINTS;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
