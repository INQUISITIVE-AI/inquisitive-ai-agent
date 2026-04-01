// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// INQAI LiquidityLauncher — Community-Funded Liquidity Deployment
//
// Autonomous liquidity bootstrapping:
//   1. Community deposits ETH (presale)
//   2. Contract tracks each buyer's contribution
//   3. When $10K USD threshold reached → auto-launch Uniswap V3 pool
//   4. INQAI paired with raised ETH, trading begins immediately
//   5. Buyers receive INQAI proportional to contribution
//
// Zero owner intervention required after deployment.
// Chainlink Automation can trigger launch() when threshold met.
// ─────────────────────────────────────────────────────────────────────────────

// ── Chainlink Price Feed Interface ──────────────────────────────────────────
interface IAggregatorV3 {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

// ── ERC20 Interface ───────────────────────────────────────────────────────────
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

// ── Uniswap V3 Interfaces ───────────────────────────────────────────────────
interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);
}

interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }
    
    function createAndInitializePoolIfNecessary(
        address token0,
        address token1,
        uint24 fee,
        uint160 sqrtPriceX96
    ) external payable returns (address pool);
    
    function mint(MintParams calldata params) external payable returns (
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    
    function positions(uint256 tokenId) external view returns (
        uint96 nonce,
        address operator,
        address token0,
        address token1,
        uint24 fee,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity,
        uint256 feeGrowthInside0LastX128,
        uint256 feeGrowthInside1LastX128,
        uint128 tokensOwed0,
        uint128 tokensOwed1
    );
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

// ── Liquidity Launcher Contract ─────────────────────────────────────────────
contract LiquidityLauncher {
    
    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant LAUNCH_THRESHOLD_USD = 10000e18; // $10,000 with 18 decimals
    uint256 public constant PRESALE_PRICE = 8e18; // $8 per INQAI
    uint24  public constant POOL_FEE = 3000; // 0.3%
    int24   public constant TICK_LOWER = -887220; // Full range
    int24   public constant TICK_UPPER = 887220;
    
    // ── Protocol Addresses ───────────────────────────────────────────────────
    address public constant INQAI = 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5;
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant TEAM_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    
    // Uniswap V3
    address public constant V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address public constant POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11FE88;
    
    // Chainlink ETH/USD Price Feed (Mainnet)
    address public constant ETH_USD_FEED = 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419;
    
    // ── State ─────────────────────────────────────────────────────────────────
    address public owner;
    bool    public launched;
    bool    public paused;
    
    // Buyer tracking
    mapping(address => uint256) public ethContributed;
    address[] public buyers;
    uint256 public totalEthRaised;
    uint256 public totalUsdValue;
    
    // Pool info
    address public poolAddress;
    uint256 public lpTokenId;
    uint256 public inqaiAllocated;
    
    // ── Events ────────────────────────────────────────────────────────────────
    event Deposited(address indexed buyer, uint256 ethAmount, uint256 usdValue);
    event LaunchTriggered(uint256 ethAmount, uint256 inqaiAmount, address pool);
    event BuyerClaimed(address indexed buyer, uint256 inqaiAmount);
    event LiquidityAdded(uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
    event EmergencyWithdraw(uint256 ethAmount);
    
    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }
    
    modifier whenNotLaunched() {
        require(!launched, "Already launched");
        _;
    }
    
    // ── Constructor ──────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }
    
    // ── Receive ETH Deposits ─────────────────────────────────────────────────
    receive() external payable whenNotPaused whenNotLaunched {
        require(msg.value > 0, "No ETH sent");
        
        // Track new buyers
        if (ethContributed[msg.sender] == 0) {
            buyers.push(msg.sender);
        }
        
        // Update contribution
        ethContributed[msg.sender] += msg.value;
        totalEthRaised += msg.value;
        
        // Calculate USD value
        uint256 ethPrice = getEthPrice();
        uint256 usdValue = (msg.value * ethPrice) / 1e18;
        totalUsdValue += usdValue;
        
        emit Deposited(msg.sender, msg.value, usdValue);
        
        // Auto-launch if threshold reached
        if (totalUsdValue >= LAUNCH_THRESHOLD_USD) {
            _launch();
        }
    }
    
    // ── Explicit Deposit Function ─────────────────────────────────────────────
    function deposit() external payable whenNotPaused whenNotLaunched {
        require(msg.value > 0, "No ETH sent");
        
        if (ethContributed[msg.sender] == 0) {
            buyers.push(msg.sender);
        }
        
        ethContributed[msg.sender] += msg.value;
        totalEthRaised += msg.value;
        
        uint256 ethPrice = getEthPrice();
        uint256 usdValue = (msg.value * ethPrice) / 1e18;
        totalUsdValue += usdValue;
        
        emit Deposited(msg.sender, msg.value, usdValue);
        
        if (totalUsdValue >= LAUNCH_THRESHOLD_USD) {
            _launch();
        }
    }
    
    // ── Get ETH/USD Price from Chainlink ────────────────────────────────────
    function getEthPrice() public view returns (uint256) {
        IAggregatorV3 priceFeed = IAggregatorV3(ETH_USD_FEED);
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        require(answer > 0, "Invalid price");
        return uint256(answer) * 1e10; // Chainlink returns 8 decimals, convert to 18
    }
    
    // ── Calculate USD Value of ETH Amount ───────────────────────────────────
    function getUsdValue(uint256 ethAmount) public view returns (uint256) {
        uint256 ethPrice = getEthPrice();
        return (ethAmount * ethPrice) / 1e18;
    }
    
    // ── Check if Launch Conditions Met ──────────────────────────────────────
    function canLaunch() public view returns (bool) {
        return totalUsdValue >= LAUNCH_THRESHOLD_USD && !launched;
    }
    
    // ── Get Launch Progress % ────────────────────────────────────────────────
    function launchProgress() public view returns (uint256) {
        if (totalUsdValue >= LAUNCH_THRESHOLD_USD) return 100;
        return (totalUsdValue * 100) / LAUNCH_THRESHOLD_USD;
    }
    
    // ── Internal Launch Function ────────────────────────────────────────────
    function _launch() internal {
        require(!launched, "Already launched");
        require(totalUsdValue >= LAUNCH_THRESHOLD_USD, "Threshold not met");
        
        launched = true;
        
        // Calculate INQAI to allocate
        // Total USD raised / $8 per INQAI
        inqaiAllocated = (totalUsdValue * 1e18) / PRESALE_PRICE;
        
        // Create Uniswap V3 pool
        poolAddress = _createPool();
        
        // Add liquidity
        _addLiquidity();
        
        emit LaunchTriggered(totalEthRaised, inqaiAllocated, poolAddress);
    }
    
    // ── Manual Launch (owner or anyone if threshold met) ──────────────────
    function launch() external whenNotLaunched {
        require(totalUsdValue >= LAUNCH_THRESHOLD_USD, "Threshold not met");
        _launch();
    }
    
    // ── Create Uniswap V3 Pool ───────────────────────────────────────────────
    function _createPool() internal returns (address) {
        INonfungiblePositionManager positionManager = INonfungiblePositionManager(POSITION_MANAGER);
        
        // Sort tokens
        (address token0, address token1) = INQAI < WETH ? (INQAI, WETH) : (WETH, INQAI);
        
        // Calculate sqrtPriceX96
        // Price = $8/INQAI, ETH = $3200 → 1 INQAI = 0.0025 ETH
        // If INQAI is token0: price = 1/0.0025 = 400
        // If WETH is token0: price = 0.0025
        uint256 price = token0 == INQAI ? 400e18 : 0.0025e18;
        uint160 sqrtPriceX96 = _encodeSqrtPriceX96(price);
        
        // Create and initialize pool
        address pool = positionManager.createAndInitializePoolIfNecessary(
            token0,
            token1,
            POOL_FEE,
            sqrtPriceX96
        );
        
        return pool;
    }
    
    // ── Encode SqrtPriceX96 ────────────────────────────────────────────────
    function _encodeSqrtPriceX96(uint256 price) internal pure returns (uint160) {
        // sqrtPriceX96 = sqrt(price) * 2^96
        uint256 sqrtPrice = _sqrt(price);
        uint256 scaled = (sqrtPrice * (2 ** 96)) / 1e9; // Adjust for decimals
        return uint160(scaled);
    }
    
    // ── Babylonian Square Root ───────────────────────────────────────────────
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
    
    // ── Add Liquidity to Pool ──────────────────────────────────────────────
    function _addLiquidity() internal {
        INonfungiblePositionManager positionManager = INonfungiblePositionManager(POSITION_MANAGER);
        IERC20 inqaiToken = IERC20(INQAI);
        IWETH weth = IWETH(WETH);
        
        // Sort tokens
        (address token0, address token1) = INQAI < WETH ? (INQAI, WETH) : (WETH, INQAI);
        bool inqaiIsToken0 = token0 == INQAI;
        
        // Wrap ETH to WETH
        weth.deposit{value: totalEthRaised}();
        
        // Transfer INQAI from team wallet (must be pre-approved)
        require(inqaiToken.transferFrom(TEAM_WALLET, address(this), inqaiAllocated), "INQAI transfer failed");
        
        // Approve tokens
        inqaiToken.approve(POSITION_MANAGER, inqaiAllocated);
        weth.approve(POSITION_MANAGER, totalEthRaised);
        
        // Calculate amounts
        uint256 amount0 = inqaiIsToken0 ? inqaiAllocated : totalEthRaised;
        uint256 amount1 = inqaiIsToken0 ? totalEthRaised : inqaiAllocated;
        
        // Mint LP position
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: POOL_FEE,
            tickLower: TICK_LOWER,
            tickUpper: TICK_UPPER,
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: 0,
            amount1Min: 0,
            recipient: TEAM_WALLET, // LP NFT goes to team
            deadline: block.timestamp + 1 hours
        });
        
        (uint256 tokenId, uint128 liquidity, uint256 amount0Used, uint256 amount1Used) = positionManager.mint(params);
        
        lpTokenId = tokenId;
        
        emit LiquidityAdded(tokenId, liquidity, amount0Used, amount1Used);
    }
    
    // ── Claim INQAI (for buyers after launch) ─────────────────────────────
    function claim() external {
        require(launched, "Not launched yet");
        require(ethContributed[msg.sender] > 0, "No contribution");
        
        uint256 contribution = ethContributed[msg.sender];
        ethContributed[msg.sender] = 0;
        
        // Calculate INQAI share
        uint256 inqaiShare = (contribution * inqaiAllocated) / totalEthRaised;
        
        // Transfer INQAI to buyer
        IERC20 inqaiToken = IERC20(INQAI);
        require(inqaiToken.transfer(msg.sender, inqaiShare), "Transfer failed");
        
        emit BuyerClaimed(msg.sender, inqaiShare);
    }
    
    // ── Get Buyer Info ─────────────────────────────────────────────────────
    function getBuyerInfo(address buyer) external view returns (
        uint256 ethContributed_,
        uint256 usdValue,
        uint256 inqaiShare,
        bool hasClaimed
    ) {
        ethContributed_ = ethContributed[buyer];
        usdValue = (ethContributed_ * getEthPrice()) / 1e18;
        inqaiShare = launched ? (ethContributed_ * inqaiAllocated) / totalEthRaised : 0;
        hasClaimed = ethContributed[buyer] == 0 && launched;
    }
    
    // ── Get All Buyers ───────────────────────────────────────────────────────
    function getBuyers() external view returns (address[] memory) {
        return buyers;
    }
    
    function getBuyerCount() external view returns (uint256) {
        return buyers.length;
    }
    
    // ── Owner Functions ──────────────────────────────────────────────────────
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function emergencyWithdraw() external onlyOwner whenNotLaunched {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        (bool success, ) = payable(TEAM_WALLET).call{value: balance}("");
        require(success, "Transfer failed");
        
        emit EmergencyWithdraw(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
