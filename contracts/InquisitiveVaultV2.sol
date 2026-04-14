// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Inline interfaces to avoid dependency issues
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IWETH9 {
    function deposit() external payable;
    function withdraw(uint256) external;
}

interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

/// @title INQUISITIVE Vault V2 — Signal-Based AI Trading
/// @notice Trades individual assets based on AI brain BUY/SELL signals
/// @dev UUPS upgradeable - can be updated if problems arise
contract InquisitiveVaultV2 is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable, AutomationCompatibleInterface {
    
    // ── Constants ─────────────────────────────────────────────────────────────
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant SWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant CHAINLINK_REGISTRY = 0x6593c7De001fC8542bB1703532EE1E5aA0D458fD; // Chainlink Automation v2.1 mainnet
    address public constant GELATO_RELAY       = 0xaBcC9b596420A9E9172FD5938620E265a0f9Df92; // Gelato 1Balance relay mainnet
    
    // ── State Variables ─────────────────────────────────────────────────────────
    bool public automationEnabled;
    uint256 public lastTradeTime;
    uint256 public MIN_TRADE_GAP; // Minimum seconds between trades
    uint256 public MIN_TRADE_AMOUNT; // Minimum ETH per trade (0.001 ether)
    
    // AI Oracle address authorized to submit signals
    address public aiOracle;
    
    // Trading signals: asset => signal (1=BUY, 2=SELL, 0=HOLD)
    mapping(address => uint8) public tradingSignals;
    mapping(address => uint256) public signalTimestamp;
    
    // Portfolio positions
    mapping(address => uint256) public positions;
    address[] public trackedAssets;
    
    // Trade history
    uint256 public totalTrades;
    uint256 public totalVolume;
    
    // ── Events ─────────────────────────────────────────────────────────────────
    event SignalReceived(address indexed asset, uint8 signal, uint256 timestamp);
    event TradeExecuted(address indexed asset, uint8 action, uint256 amountIn, uint256 amountOut, uint256 price);
    event AutomationToggled(bool enabled);
    event AIOracleSet(address indexed oracle);
    event FundsDeposited(uint256 amount);
    event FundsWithdrawn(uint256 amount);
    
    // ── Modifiers ───────────────────────────────────────────────────────────────
    modifier onlyAIOracle() {
        require(msg.sender == aiOracle, "Only AI oracle");
        _;
    }

    modifier onlyKeeper() {
        require(
            msg.sender == CHAINLINK_REGISTRY ||
            msg.sender == GELATO_RELAY       ||
            msg.sender == aiOracle           ||
            msg.sender == owner(),
            "Not authorized keeper"
        );
        _;
    }
    
    // ── Initializer (replaces constructor) ────────────────────────────────
    function initialize(address _owner, address _aiOracle) public initializer {
        __Ownable_init();
        transferOwnership(_owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        
        aiOracle = _aiOracle;
        automationEnabled = true;
        MIN_TRADE_GAP = 300;
        MIN_TRADE_AMOUNT = 0.001 ether;
        
        emit AIOracleSet(_aiOracle);
        emit AutomationToggled(true);
    }
    
    // ── Upgrade Authorization ───────────────────────────────────────────────
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    // ── AI Signal Interface ─────────────────────────────────────────────────────
    
    /// @notice Submit trading signal from AI brain (BUY=1, SELL=2, HOLD=0)
    /// @param asset Token address to trade
    /// @param signal 1=BUY, 2=SELL, 0=HOLD
    function submitSignal(address asset, uint8 signal) external onlyAIOracle {
        require(signal <= 2, "Invalid signal");
        require(asset != address(0), "Invalid asset");
        
        tradingSignals[asset] = signal;
        signalTimestamp[asset] = block.timestamp;
        
        emit SignalReceived(asset, signal, block.timestamp);
    }
    
    /// @notice Batch submit signals for multiple assets
    function submitSignalsBatch(address[] calldata assets, uint8[] calldata signals) external onlyAIOracle {
        require(assets.length == signals.length, "Length mismatch");
        for (uint256 i = 0; i < assets.length; i++) {
            tradingSignals[assets[i]] = signals[i];
            signalTimestamp[assets[i]] = block.timestamp;
            emit SignalReceived(assets[i], signals[i], block.timestamp);
        }
    }
    
    // ── Chainlink Automation ──────────────────────────────────────────────────
    
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        // Check if any asset has pending signal and we have ETH + cooldown passed
        bool hasFunds = address(this).balance >= MIN_TRADE_AMOUNT;
        bool cooldown = block.timestamp >= lastTradeTime + MIN_TRADE_GAP;
        bool enabled = automationEnabled;
        
        // Find first asset with active signal
        address targetAsset = address(0);
        uint8 signal = 0;
        
        if (hasFunds && cooldown && enabled) {
            for (uint256 i = 0; i < trackedAssets.length; i++) {
                address asset = trackedAssets[i];
                uint8 sig = tradingSignals[asset];
                if (sig == 1 || sig == 2) { // BUY or SELL
                    // For SELL, check we have position
                    if (sig == 2 && positions[asset] == 0) continue;
                    targetAsset = asset;
                    signal = sig;
                    break;
                }
            }
        }
        
        upkeepNeeded = targetAsset != address(0);
        performData = abi.encode(targetAsset, signal);
    }
    
    /// @notice Execute trade based on signal (Chainlink, Gelato, aiOracle, or owner only)
    function performUpkeep(bytes calldata performData) external onlyKeeper nonReentrant whenNotPaused override {
        (address asset, uint8 signal) = abi.decode(performData, (address, uint8));
        
        require(automationEnabled, "Automation disabled");
        require(block.timestamp >= lastTradeTime + MIN_TRADE_GAP, "Cooldown");
        require(asset != address(0), "No asset");
        require(signal == tradingSignals[asset], "Signal mismatch");
        
        if (signal == 1) {
            _executeBuy(asset);
        } else if (signal == 2) {
            _executeSell(asset);
        }
        
        // Clear signal after execution
        tradingSignals[asset] = 0;
        lastTradeTime = block.timestamp;
    }
    
    // ── Internal Trading Functions ───────────────────────────────────────────
    
    function _executeBuy(address token) internal {
        uint256 ethBalance = address(this).balance;
        require(ethBalance > MIN_TRADE_AMOUNT, "Insufficient ETH");
        
        // Calculate trade size (1% of balance per trade for risk management)
        uint256 tradeAmount = ethBalance / 100;
        if (tradeAmount < MIN_TRADE_AMOUNT) tradeAmount = MIN_TRADE_AMOUNT;
        
        // Wrap ETH to WETH
        IWETH9(WETH).deposit{value: tradeAmount}();
        
        // Approve router
        IERC20(WETH).approve(SWAP_ROUTER, tradeAmount);
        
        // Execute swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: WETH,
            tokenOut: token,
            fee: 3000, // 0.3% tier
            recipient: address(this),
            amountIn: tradeAmount,
            amountOutMinimum: 0, // Use oracle for slippage protection in production
            sqrtPriceLimitX96: 0
        });
        
        uint256 amountOut = ISwapRouter(SWAP_ROUTER).exactInputSingle(params);
        positions[token] += amountOut;
        
        totalTrades++;
        totalVolume += tradeAmount;
        
        emit TradeExecuted(token, 1, tradeAmount, amountOut, 0);
    }
    
    function _executeSell(address token) internal {
        uint256 positionSize = positions[token];
        require(positionSize > 0, "No position");
        
        // Approve router
        IERC20(token).approve(SWAP_ROUTER, positionSize);
        
        // Execute swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: token,
            tokenOut: WETH,
            fee: 3000,
            recipient: address(this),
            amountIn: positionSize,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });
        
        uint256 amountOut = ISwapRouter(SWAP_ROUTER).exactInputSingle(params);
        
        // Unwrap WETH to ETH
        IWETH9(WETH).withdraw(amountOut);
        
        positions[token] = 0;
        
        totalTrades++;
        totalVolume += amountOut;
        
        emit TradeExecuted(token, 2, positionSize, amountOut, 0);
    }
    
    // ── Admin Functions ────────────────────────────────────────────────────────
    
    function setAIOracle(address _newOracle) external onlyOwner {
        aiOracle = _newOracle;
        emit AIOracleSet(_newOracle);
    }
    
    function setAutomationEnabled(bool _enabled) external onlyOwner {
        automationEnabled = _enabled;
        emit AutomationToggled(_enabled);
    }

    /// @notice Pause all vault execution immediately (emergency use only)
    function pause() external onlyOwner {
        automationEnabled = false;
        _pause();
    }

    /// @notice Resume vault execution
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function setTradeGap(uint256 _seconds) external onlyOwner {
        MIN_TRADE_GAP = _seconds;
    }
    
    function setMinTradeAmount(uint256 _amount) external onlyOwner {
        MIN_TRADE_AMOUNT = _amount;
    }
    
    function addTrackedAsset(address _asset) external onlyOwner {
        require(_asset != address(0), "Invalid asset");
        trackedAssets.push(_asset);
    }
    
    function removeTrackedAsset(address _asset) external onlyOwner {
        for (uint256 i = 0; i < trackedAssets.length; i++) {
            if (trackedAssets[i] == _asset) {
                trackedAssets[i] = trackedAssets[trackedAssets.length - 1];
                trackedAssets.pop();
                break;
            }
        }
    }
    
    // ── Fund Management ───────────────────────────────────────────────────────
    
    receive() external payable {
        emit FundsDeposited(msg.value);
    }
    
    function deposit() external payable {
        emit FundsDeposited(msg.value);
    }
    
    /// @notice Withdraw all ETH to owner (emergency only)
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
        emit FundsWithdrawn(balance);
    }
    
    /// @notice Withdraw specific token (emergency only)
    function emergencyWithdrawToken(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(_token).transfer(owner(), balance);
    }
    
    // ── View Functions ─────────────────────────────────────────────────────────
    
    function getTrackedAssets() external view returns (address[] memory) {
        return trackedAssets;
    }
    
    function getPosition(address _asset) external view returns (uint256) {
        return positions[_asset];
    }
    
    function getSignal(address _asset) external view returns (uint8 signal, uint256 timestamp) {
        return (tradingSignals[_asset], signalTimestamp[_asset]);
    }
    
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getImplementation() external view returns (address) {
        return _getImplementation();
    }
}
