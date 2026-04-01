// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// INQAI ReferralTracker — Viral Growth Engine
//
// On-chain referral tracking with automatic bonus distribution.
// Both referrer and referee receive 5% bonus INQAI on qualifying purchases.
// Fully autonomous, no manual intervention required.
// ─────────────────────────────────────────────────────────────────────────────

// ── Interfaces ──────────────────────────────────────────────────────────────
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface ILiquidityLauncher {
    function ethContributed(address buyer) external view returns (uint256);
    function launched() external view returns (bool);
}

// ── ReferralTracker Contract ─────────────────────────────────────────────────
contract ReferralTracker {
    
    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant REFERRER_BONUS = 5;  // 5% to referrer
    uint256 public constant REFEREE_BONUS = 5;   // 5% to referee
    uint256 public constant BONUS_DENOMINATOR = 100;
    uint256 public constant MIN_PURCHASE = 0.05 ether; // Minimum to qualify
    
    address public constant INQAI = 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5;
    address public constant TEAM_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    
    // ── State ─────────────────────────────────────────────────────────────────
    address public owner;
    address public launcherContract;
    bool public paused;
    bool public bonusesEnabled = true;
    
    // Referral relationships: referee => referrer
    mapping(address => address) public referredBy;
    
    // Referrer stats: referrer => [count, totalVolume, totalBonus]
    struct ReferrerStats {
        uint256 referralCount;
        uint256 totalVolumeEth;
        uint256 totalBonusEarned;
        bool exists;
    }
    mapping(address => ReferrerStats) public referrerData;
    address[] public referrers;
    
    // Referee stats
    mapping(address => uint256) public refereeBonusClaimed;
    
    // Bonus pool (funded by team)
    uint256 public bonusPool;
    
    // ── Events ─────────────────────────────────────────────────────────────────
    event ReferralRegistered(address indexed referrer, address indexed referee);
    event BonusDistributed(address indexed to, uint256 amount, string bonusType);
    event ReferralPurchased(address indexed referrer, address indexed referee, uint256 ethAmount, uint256 bonus);
    event BonusPoolFunded(uint256 amount);
    
    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }
    
    // ── Constructor ──────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }
    
    // ── Register Referral Relationship ──────────────────────────────────────
    function registerReferral(address referrer) external whenNotPaused {
        require(referrer != address(0), "Invalid referrer");
        require(referrer != msg.sender, "Cannot refer yourself");
        require(referredBy[msg.sender] == address(0), "Already referred");
        
        // Set referral relationship
        referredBy[msg.sender] = referrer;
        
        // Track referrer
        if (!referrerData[referrer].exists) {
            referrerData[referrer].exists = true;
            referrers.push(referrer);
        }
        referrerData[referrer].referralCount++;
        
        emit ReferralRegistered(referrer, msg.sender);
    }
    
    // ── Record Purchase with Bonus (Called by Launcher) ────────────────────
    function recordPurchase(address buyer, uint256 ethAmount) external whenNotPaused {
        require(msg.sender == launcherContract, "Only launcher");
        require(ethAmount >= MIN_PURCHASE, "Below minimum");
        require(bonusesEnabled, "Bonuses disabled");
        require(bonusPool > 0, "Bonus pool empty");
        
        address referrer = referredBy[buyer];
        
        // Calculate bonuses
        uint256 baseInqai = (ethAmount * 1e18) / (8 * 1e18); // At $8/INQAI
        uint256 referrerBonus = (baseInqai * REFERRER_BONUS) / BONUS_DENOMINATOR;
        uint256 refereeBonus = (baseInqai * REFEREE_BONUS) / BONUS_DENOMINATOR;
        uint256 totalBonus = referrerBonus + refereeBonus;
        
        require(bonusPool >= totalBonus, "Insufficient bonus pool");
        
        bonusPool -= totalBonus;
        
        IERC20 inqai = IERC20(INQAI);
        
        // Distribute referrer bonus
        if (referrer != address(0) && referrerBonus > 0) {
            referrerData[referrer].totalVolumeEth += ethAmount;
            referrerData[referrer].totalBonusEarned += referrerBonus;
            require(inqai.transfer(referrer, referrerBonus), "Referrer bonus failed");
            emit BonusDistributed(referrer, referrerBonus, "referrer");
        }
        
        // Distribute referee bonus
        if (refereeBonus > 0) {
            refereeBonusClaimed[buyer] += refereeBonus;
            require(inqai.transfer(buyer, refereeBonus), "Referee bonus failed");
            emit BonusDistributed(buyer, refereeBonus, "referee");
        }
        
        emit ReferralPurchased(referrer, buyer, ethAmount, totalBonus);
    }
    
    // ── Fund Bonus Pool (Owner/Team) ────────────────────────────────────────
    function fundBonusPool(uint256 amount) external onlyOwner {
        require(amount > 0, "Zero amount");
        
        IERC20 inqai = IERC20(INQAI);
        require(inqai.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        bonusPool += amount;
        emit BonusPoolFunded(amount);
    }
    
    // ── Get Referral Code (Generate from address) ────────────────────────────
    function getReferralCode(address referrer) external pure returns (string memory) {
        return _addressToString(referrer);
    }
    
    // ── Parse Referral Code to Address ───────────────────────────────────────
    function parseReferralCode(string memory code) external pure returns (address) {
        return _stringToAddress(code);
    }
    
    // ── View Functions ───────────────────────────────────────────────────────
    function getReferrer(address referee) external view returns (address) {
        return referredBy[referee];
    }
    
    function getReferrerStats(address referrer) external view returns (
        uint256 count,
        uint256 volume,
        uint256 bonus,
        bool exists
    ) {
        ReferrerStats storage stats = referrerData[referrer];
        return (stats.referralCount, stats.totalVolumeEth, stats.totalBonusEarned, stats.exists);
    }
    
    function getTotalReferrers() external view returns (uint256) {
        return referrers.length;
    }
    
    function estimateBonus(uint256 ethAmount) external pure returns (uint256 referrerBonus, uint256 refereeBonus) {
        uint256 baseInqai = (ethAmount * 1e18) / (8 * 1e18);
        referrerBonus = (baseInqai * REFERRER_BONUS) / BONUS_DENOMINATOR;
        refereeBonus = (baseInqai * REFEREE_BONUS) / BONUS_DENOMINATOR;
    }
    
    // ── Internal: Address to String ────────────────────────────────────────
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
    
    // ── Internal: String to Address ─────────────────────────────────────────
    function _stringToAddress(string memory _str) internal pure returns (address) {
        // Simplified - in production use proper hex parsing
        bytes memory tmp = bytes(_str);
        require(tmp.length == 42, "Invalid length");
        uint160 addr = 0;
        for (uint256 i = 2; i < 42; i++) {
            addr *= 16;
            uint8 b = uint8(tmp[i]);
            if (b >= 48 && b <= 57) addr += b - 48; // 0-9
            else if (b >= 97 && b <= 102) addr += b - 87; // a-f
            else if (b >= 65 && b <= 70) addr += b - 55; // A-F
        }
        return address(addr);
    }
    
    // ── Admin Functions ───────────────────────────────────────────────────────
    function setLauncherContract(address _launcher) external onlyOwner {
        require(_launcher != address(0), "Invalid address");
        launcherContract = _launcher;
    }
    
    function setBonusesEnabled(bool enabled) external onlyOwner {
        bonusesEnabled = enabled;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawBonusPool(uint256 amount) external onlyOwner {
        require(amount <= bonusPool, "Insufficient balance");
        bonusPool -= amount;
        IERC20 inqai = IERC20(INQAI);
        require(inqai.transfer(TEAM_WALLET, amount), "Transfer failed");
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
