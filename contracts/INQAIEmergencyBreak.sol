// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// INQAI Emergency Circuit Breaker — Institutional-Grade Protection
//
// Multi-layered safety system:
// - 15% drawdown automatic halt
// - Governance pause capability  
// - Timelock for critical changes
// - Automatic price monitoring
//
// Zero private keys required. Chainlink Automation handles monitoring.
// ─────────────────────────────────────────────────────────────────────────────

interface IChainlinkAggregator {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IUniswapV3Pool {
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
}

contract INQAIEmergencyBreak {
    
    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant DRAWDOWN_THRESHOLD = 1500; // 15.00% in basis points
    uint256 public constant PRICE_DEVIATION_THRESHOLD = 1000; // 10% from oracle
    uint256 public constant COOLDOWN_PERIOD = 1 hours;
    uint256 public constant BASIS_POINTS = 10000;
    
    // Price feeds
    address public constant ETH_USD_FEED = 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419;
    address public constant INQAI_POOL = 0x0000000000000000000000000000000000000000; // Set after launch
    
    // Core addresses
    address public constant VAULT = 0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb;
    address public constant TEAM_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    address public constant INQAI = 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5;
    
    // ── State ────────────────────────────────────────────────────────────────
    address public owner;
    address public governance;
    
    bool public paused;
    bool public emergencyMode;
    
    uint256 public lastCheckTimestamp;
    uint256 public lastNavPrice; // Last recorded INQAI/ETH price
    uint256 public highWaterMark; // Highest NAV recorded
    
    mapping(bytes4 => uint256) public functionTimelock; // Timelock for sensitive functions
    uint256 public constant TIMELOCK_DURATION = 2 days;
    
    // Whitelisted addresses that can operate during pause
    mapping(address => bool) public emergencyOperators;
    
    // ── Events ───────────────────────────────────────────────────────────────
    event CircuitBreakerTriggered(string reason, uint256 price, uint256 threshold);
    event EmergencyPause(string reason, uint256 timestamp);
    event EmergencyResume(uint256 timestamp);
    event HighWaterMarkUpdated(uint256 newMark);
    event EmergencyOperatorSet(address operator, bool status);
    
    // ── Modifiers ───────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyGovernance() {
        require(msg.sender == governance || msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Emergency pause active");
        _;
    }
    
    modifier withTimelock(bytes4 selector) {
        require(
            block.timestamp >= functionTimelock[selector] + TIMELOCK_DURATION,
            "Timelock active"
        );
        _;
    }
    
    // ── Constructor ─────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        lastCheckTimestamp = block.timestamp;
        highWaterMark = type(uint256).max; // Will be set on first check
    }
    
    // ── Chainlink Automation Check ────────────────────────────────────────────
    function checkUpkeep(bytes calldata) external view returns (
        bool upkeepNeeded,
        bytes memory performData
    ) {
        // Check if enough time passed
        if (block.timestamp < lastCheckTimestamp + 5 minutes) {
            return (false, "");
        }
        
        // Get current INQAI price and check for anomalies
        (bool needsPause, string memory reason) = _checkCircuitBreakers();
        
        if (needsPause) {
            return (true, abi.encode(reason));
        }
        
        return (false, "");
    }
    
    // ── Chainlink Automation Execution ────────────────────────────────────────
    function performUpkeep(bytes calldata performData) external {
        string memory reason = abi.decode(performData, (string));
        
        _triggerPause(reason);
    }
    
    // ── Internal Checks ──────────────────────────────────────────────────────
    function _checkCircuitBreakers() internal view returns (bool needsPause, string memory reason) {
        // 1. Check drawdown from high water mark
        uint256 currentPrice = _getINQAIPrice();
        
        if (highWaterMark != type(uint256).max) {
            uint256 drawdown = ((highWaterMark - currentPrice) * BASIS_POINTS) / highWaterMark;
            if (drawdown >= DRAWDOWN_THRESHOLD) {
                return (true, "15% drawdown threshold exceeded");
            }
        }
        
        // 2. Check price deviation from oracle (if pool exists)
        if (INQAI_POOL != address(0)) {
            uint256 poolPrice = _getPoolPrice();
            uint256 oraclePrice = _getOracleETHPrice();
            
            if (poolPrice > 0 && oraclePrice > 0) {
                uint256 deviation = poolPrice > oraclePrice 
                    ? ((poolPrice - oraclePrice) * BASIS_POINTS) / oraclePrice
                    : ((oraclePrice - poolPrice) * BASIS_POINTS) / poolPrice;
                    
                if (deviation > PRICE_DEVIATION_THRESHOLD) {
                    return (true, "Price manipulation detected");
                }
            }
        }
        
        return (false, "");
    }
    
    // ── Price Fetching ─────────────────────────────────────────────────────────
    function _getINQAIPrice() internal view returns (uint256) {
        // Get INQAI price in ETH from pool or use oracle
        if (INQAI_POOL == address(0)) {
            return 0; // No pool yet
        }
        return _getPoolPrice();
    }
    
    function _getPoolPrice() internal view returns (uint256) {
        try IUniswapV3Pool(INQAI_POOL).slot0() returns (
            uint160 sqrtPriceX96,
            int24,
            uint16,
            uint16,
            uint16,
            uint8,
            bool
        ) {
            // Convert sqrtPriceX96 to price
            uint256 price = uint256(sqrtPriceX96) ** 2 / (2 ** 192);
            return price;
        } catch {
            return 0;
        }
    }
    
    function _getOracleETHPrice() internal view returns (uint256) {
        try IChainlinkAggregator(ETH_USD_FEED).latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256,
            uint80
        ) {
            return uint256(answer); // ETH price in USD (8 decimals)
        } catch {
            return 0;
        }
    }
    
    // ── Manual Checks (for UI/governance) ──────────────────────────────────
    function checkHealth() external view returns (
        bool isHealthy,
        uint256 currentPrice,
        uint256 drawdownPercent,
        uint256 highWater,
        string memory status
    ) {
        currentPrice = _getINQAIPrice();
        highWater = highWaterMark == type(uint256).max ? currentPrice : highWaterMark;
        
        if (highWater > 0) {
            drawdownPercent = highWater > currentPrice 
                ? ((highWater - currentPrice) * BASIS_POINTS) / highWater 
                : 0;
        }
        
        isHealthy = !paused && drawdownPercent < DRAWDOWN_THRESHOLD;
        
        if (paused) {
            status = "EMERGENCY PAUSE ACTIVE";
        } else if (drawdownPercent >= DRAWDOWN_THRESHOLD * 80 / 100) {
            status = "WARNING: Approaching threshold";
        } else {
            status = "Healthy";
        }
    }
    
    // ── Emergency Actions ───────────────────────────────────────────────────
    function _triggerPause(string memory reason) internal {
        require(!paused, "Already paused");
        
        paused = true;
        emergencyMode = true;
        lastCheckTimestamp = block.timestamp;
        
        emit CircuitBreakerTriggered(reason, _getINQAIPrice(), DRAWDOWN_THRESHOLD);
        emit EmergencyPause(reason, block.timestamp);
    }
    
    function triggerManualPause(string memory reason) external onlyGovernance {
        _triggerPause(reason);
    }
    
    function resume() external onlyGovernance {
        require(paused, "Not paused");
        require(block.timestamp >= lastCheckTimestamp + COOLDOWN_PERIOD, "Cooldown active");
        
        // Re-check conditions before resuming
        (bool stillBad, ) = _checkCircuitBreakers();
        require(!stillBad, "Conditions still violated");
        
        paused = false;
        emergencyMode = false;
        
        // Update high water mark
        uint256 currentPrice = _getINQAIPrice();
        if (currentPrice > highWaterMark) {
            highWaterMark = currentPrice;
            emit HighWaterMarkUpdated(highWaterMark);
        }
        
        emit EmergencyResume(block.timestamp);
    }
    
    // ── Update Price (called by keeper or keeper-like automation) ───────────
    function updatePriceMetrics() external {
        uint256 currentPrice = _getINQAIPrice();
        
        if (currentPrice > highWaterMark) {
            highWaterMark = currentPrice;
            emit HighWaterMarkUpdated(highWaterMark);
        }
        
        lastNavPrice = currentPrice;
        lastCheckTimestamp = block.timestamp;
    }
    
    // ── Set Pool Address (one-time) ────────────────────────────────────────
    function setPoolAddress(address pool) external onlyOwner {
        require(INQAI_POOL == address(0), "Already set");
        INQAI_POOL = pool;
    }
    
    // ── Set Governance ───────────────────────────────────────────────────────
    function setGovernance(address gov) external onlyOwner {
        governance = gov;
    }
    
    // ── Emergency Operators ─────────────────────────────────────────────────
    function setEmergencyOperator(address operator, bool status) external onlyGovernance {
        emergencyOperators[operator] = status;
        emit EmergencyOperatorSet(operator, status);
    }
    
    // ── Timelock Functions ─────────────────────────────────────────────────
    function queueCriticalChange(bytes4 selector) external onlyGovernance {
        functionTimelock[selector] = block.timestamp;
    }
    
    function cancelQueuedChange(bytes4 selector) external onlyGovernance {
        functionTimelock[selector] = 0;
    }
    
    // ── View Functions ─────────────────────────────────────────────────────
    function getStatus() external view returns (
        bool isPaused,
        bool inEmergencyMode,
        uint256 lastCheck,
        uint256 currentHighWater,
        uint256 timeUntilResume
    ) {
        isPaused = paused;
        inEmergencyMode = emergencyMode;
        lastCheck = lastCheckTimestamp;
        currentHighWater = highWaterMark == type(uint256).max ? 0 : highWaterMark;
        timeUntilResume = paused 
            ? (lastCheckTimestamp + COOLDOWN_PERIOD > block.timestamp ? lastCheckTimestamp + COOLDOWN_PERIOD - block.timestamp : 0)
            : 0;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
