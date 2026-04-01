// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// INQAI Airdrop Distributor — Fair Launch Token Distribution
//
// Distributes INQAI to:
// - Early community members
// - Strategic partners  
// - Bug bounty participants
// - Marketing campaign participants
//
// Linear vesting over 12 months. No private keys required.
// ─────────────────────────────────────────────────────────────────────────────

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract INQAIAirdrop {
    
    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant VESTING_DURATION = 365 days; // 12 months
    uint256 public constant CLIFF_DURATION = 30 days;    // 1 month cliff
    
    address public constant INQAI = "0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5";
    address public constant TEAM_WALLET = "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746";
    
    // ── State ─────────────────────────────────────────────────────────────────
    address public owner;
    bool public airdropFinalized;
    
    struct Allocation {
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 startTime;
        uint256 cliffEnd;
        uint256 vestingEnd;
        bool exists;
        bool revoked;
    }
    
    mapping(address => Allocation) public allocations;
    address[] public recipients;
    
    uint256 public totalAllocated;
    uint256 public totalClaimed;
    
    // ── Events ─────────────────────────────────────────────────────────────────
    event AllocationAdded(address indexed recipient, uint256 amount);
    event AllocationRevoked(address indexed recipient, uint256 unclaimed);
    event TokensClaimed(address indexed recipient, uint256 amount, uint256 remaining);
    event AirdropFinalized(uint256 totalRecipients, uint256 totalAmount);
    
    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notFinalized() {
        require(!airdropFinalized, "Airdrop finalized");
        _;
    }
    
    // ── Constructor ─────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }
    
    // ── Add Allocations (batch) ────────────────────────────────────────────
    function addAllocations(
        address[] calldata _recipients,
        uint256[] calldata amounts
    ) external onlyOwner notFinalized {
        require(_recipients.length == amounts.length, "Length mismatch");
        require(_recipients.length > 0, "Empty batch");
        
        uint256 batchTotal = 0;
        
        for (uint i = 0; i < _recipients.length; i++) {
            address recipient = _recipients[i];
            uint256 amount = amounts[i];
            
            require(recipient != address(0), "Invalid address");
            require(amount > 0, "Zero amount");
            
            // Update existing or create new
            Allocation storage alloc = allocations[recipient];
            if (!alloc.exists) {
                recipients.push(recipient);
                alloc.exists = true;
                alloc.startTime = block.timestamp;
                alloc.cliffEnd = block.timestamp + CLIFF_DURATION;
                alloc.vestingEnd = block.timestamp + VESTING_DURATION;
            }
            
            alloc.totalAmount += amount;
            batchTotal += amount;
            
            emit AllocationAdded(recipient, amount);
        }
        
        totalAllocated += batchTotal;
    }
    
    // ── Add Single Allocation ───────────────────────────────────────────────
    function addAllocation(address recipient, uint256 amount) external onlyOwner notFinalized {
        require(recipient != address(0), "Invalid address");
        require(amount > 0, "Zero amount");
        
        Allocation storage alloc = allocations[recipient];
        if (!alloc.exists) {
            recipients.push(recipient);
            alloc.exists = true;
            alloc.startTime = block.timestamp;
            alloc.cliffEnd = block.timestamp + CLIFF_DURATION;
            alloc.vestingEnd = block.timestamp + VESTING_DURATION;
        }
        
        alloc.totalAmount += amount;
        totalAllocated += amount;
        
        emit AllocationAdded(recipient, amount);
    }
    
    // ── Finalize Airdrop ───────────────────────────────────────────────────
    function finalize() external onlyOwner {
        require(!airdropFinalized, "Already finalized");
        require(recipients.length > 0, "No recipients");
        
        // Transfer total allocation from team wallet
        IERC20 inqai = IERC20(INQAI);
        require(
            inqai.transferFrom(TEAM_WALLET, address(this), totalAllocated),
            "Transfer failed"
        );
        
        airdropFinalized = true;
        
        emit AirdropFinalized(recipients.length, totalAllocated);
    }
    
    // ── Calculate Claimable ────────────────────────────────────────────────
    function calculateClaimable(address recipient) public view returns (uint256) {
        Allocation storage alloc = allocations[recipient];
        
        if (!alloc.exists || alloc.revoked) return 0;
        if (!airdropFinalized) return 0;
        if (block.timestamp < alloc.cliffEnd) return 0;
        
        uint256 elapsed = block.timestamp > alloc.vestingEnd 
            ? VESTING_DURATION 
            : block.timestamp - alloc.startTime;
        
        uint256 vested = (alloc.totalAmount * elapsed) / VESTING_DURATION;
        
        return vested > alloc.claimedAmount ? vested - alloc.claimedAmount : 0;
    }
    
    // ── Claim Tokens ──────────────────────────────────────────────────────────
    function claim() external {
        Allocation storage alloc = allocations[msg.sender];
        
        require(alloc.exists, "No allocation");
        require(!alloc.revoked, "Allocation revoked");
        require(airdropFinalized, "Not finalized");
        require(block.timestamp >= alloc.cliffEnd, "Cliff not ended");
        
        uint256 claimable = calculateClaimable(msg.sender);
        require(claimable > 0, "Nothing to claim");
        
        alloc.claimedAmount += claimable;
        totalClaimed += claimable;
        
        IERC20 inqai = IERC20(INQAI);
        require(inqai.transfer(msg.sender, claimable), "Transfer failed");
        
        uint256 remaining = alloc.totalAmount - alloc.claimedAmount;
        emit TokensClaimed(msg.sender, claimable, remaining);
    }
    
    // ── Revoke Allocation (if needed) ────────────────────────────────────
    function revokeAllocation(address recipient) external onlyOwner {
        Allocation storage alloc = allocations[recipient];
        require(alloc.exists, "No allocation");
        require(!alloc.revoked, "Already revoked");
        
        uint256 unclaimed = alloc.totalAmount - alloc.claimedAmount;
        alloc.revoked = true;
        
        // Return unclaimed tokens to owner
        if (unclaimed > 0) {
            IERC20 inqai = IERC20(INQAI);
            require(inqai.transfer(owner, unclaimed), "Transfer failed");
        }
        
        emit AllocationRevoked(recipient, unclaimed);
    }
    
    // ── View Functions ─────────────────────────────────────────────────────
    function getAllocation(address recipient) external view returns (
        uint256 totalAmount,
        uint256 claimedAmount,
        uint256 claimableNow,
        uint256 startTime,
        uint256 cliffEnd,
        uint256 vestingEnd,
        bool revoked,
        bool exists
    ) {
        Allocation storage alloc = allocations[recipient];
        return (
            alloc.totalAmount,
            alloc.claimedAmount,
            calculateClaimable(recipient),
            alloc.startTime,
            alloc.cliffEnd,
            alloc.vestingEnd,
            alloc.revoked,
            alloc.exists
        );
    }
    
    function getStats() external view returns (
        uint256 totalRecipients,
        uint256 totalAllocated_,
        uint256 totalClaimed_,
        uint256 remaining,
        bool finalized
    ) {
        return (
            recipients.length,
            totalAllocated,
            totalClaimed,
            totalAllocated - totalClaimed,
            airdropFinalized
        );
    }
    
    function getRecipients(uint256 start, uint256 limit) external view returns (address[] memory) {
        require(start < recipients.length, "Out of bounds");
        
        uint256 end = start + limit > recipients.length ? recipients.length : start + limit;
        address[] memory result = new address[](end - start);
        
        for (uint i = start; i < end; i++) {
            result[i - start] = recipients[i];
        }
        
        return result;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
