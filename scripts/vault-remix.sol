[dotenv@17.3.1] injecting env (36) from .env -- tip: 🛠️  run anywhere with `dotenvx run -- yourcommand`
// Sources flattened with hardhat v2.28.6 https://hardhat.org

// SPDX-License-Identifier: MIT

// File contracts/InquisitiveVaultUpdated.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;

// ── Interfaces ──────────────────────────────────────────────────────────────
interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
}

// Uniswap V3 SwapRouter02 — Ethereum mainnet 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata) external payable returns (uint256);
}

// Aave V3 Pool — Ethereum mainnet 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
    function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256);
    function getUserAccountData(address user) external view returns (uint256, uint256, uint256, uint256, uint256, uint256);
}

// Lido stETH — Ethereum mainnet 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84
interface ILido {
    function submit(address _referral) external payable returns (uint256);
}

// ── Chainlink Automation Interface ───────────────────────────────────────────
interface IAutomationCompatible {
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

// ── InquisitiveVault — AI-managed portfolio execution ───────────────────────
// Execution is KEYLESS: either via Gelato Relay (ERC-2771) or Chainlink Automation.
// No private key is needed in any application code — institutional grade.
contract InquisitiveVaultUpdated is IAutomationCompatible {
    // ── Protocol addresses ───────────────────────────────────────────────────
    address public constant WETH        = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant USDC        = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant SWAP_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45; // Uniswap V3 SwapRouter02
    address public constant AAVE_POOL   = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2; // Aave V3 Pool
    address public constant LIDO        = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84; // Lido stETH
    // Gelato Relay trusted forwarder — mainnet 1Balance relay
    address public constant GELATO_RELAY = 0xaBcC9b596420A9E9172FD5938620E265a0f9Df92;
    // Chainlink Automation registry — mainnet v2.1
    address public constant CHAINLINK_REGISTRY = 0x6593c7De001fC8542bB1703532EE1E5aA0D458fD;
    uint24  public constant DEFAULT_FEE  = 3000; // 0.3% Uniswap pool fee
    uint256 public constant MIN_DEPLOY   = 0.005 ether; // minimum ETH to trigger rebalance

    // ── State ────────────────────────────────────────────────────────────────
    address public owner;
    address public aiExecutor;       // AI execution wallet (Gelato dedicatedMsgSender)
    address public inqaiToken;
    address public strategy;
    uint256 public performanceFee = 1500; // 15% = 1500 basis points
    bool    public automationEnabled = true; // Chainlink Automation kill switch

    // Portfolio position tracking
    mapping(address => uint256) public positions;    // token => amount held
    uint256 public totalDepositsUSD;                 // lifetime USD deposited
    uint256 public cycleCount;                       // AI execution cycles

    // ── Events ───────────────────────────────────────────────────────────────
    event Deposit(address indexed from, uint256 ethAmount, uint256 usdValue);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, string action);
    event LendExecuted(address indexed asset, uint256 amount);
    event StakeExecuted(uint256 ethAmount, uint256 stEthReceived);
    event StrategySet(address indexed newStrategy);
    event AIExecutorSet(address indexed executor);
    event FeesCollected(address indexed token, uint256 amount);
    event AICycleExecuted(uint256 cycleNumber, uint256 assetsRebalanced);

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    // Keyless execution: Gelato relay, Chainlink registry, AI executor, or owner
    modifier onlyAI() {
        require(
            msg.sender == aiExecutor          ||
            msg.sender == owner               ||
            msg.sender == GELATO_RELAY        ||
            msg.sender == CHAINLINK_REGISTRY,
            "Not authorized executor"
        );
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address _inqaiToken) {
        owner       = msg.sender;
        aiExecutor  = msg.sender; // Initially owner executes
        inqaiToken  = _inqaiToken;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, 0); // USD value updated separately
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    function setAIExecutor(address _executor) external onlyOwner {
        aiExecutor = _executor;
        emit AIExecutorSet(_executor);
    }

    /// @notice Set the Gelato dedicatedMsgSender as the AI executor (keyless setup)
    /// @dev Get dedicatedMsgSender from Gelato Ops SDK after registering the task
    function setGelatoDedicatedSender(address _sender) external onlyOwner {
        aiExecutor = _sender;
        emit AIExecutorSet(_sender);
    }

    function setAutomationEnabled(bool _enabled) external onlyOwner {
        automationEnabled = _enabled;
    }

    function setStrategy(address _strategy) external onlyOwner {
        strategy = _strategy;
        emit StrategySet(_strategy);
    }

    function setPerformanceFee(uint256 _fee) external onlyOwner {
        require(_fee <= 2000, "Fee too high");
        performanceFee = _fee;
    }

    // ── On-chain portfolio weights (65 assets) ────────────────────────────────
    // Set once by deployer via setPortfolio(). performUpkeep deploys ETH per weights.
    address[] public portfolioTokens;   // ERC-20 token addresses
    uint256[] public portfolioWeights;  // basis points (must sum to 10000)
    uint24[]  public portfolioFees;     // Uniswap V3 fee tier per token
    uint256   public lastDeployTime;    // timestamp of last performUpkeep run
    uint256   public MIN_REDEPLOY_GAP = 60; // seconds between auto-deploy cycles

    event PortfolioSet(uint256 assetCount, uint256 weightSum);
    event FundsDeployed(uint256 cycleNumber, uint256 ethDeployed, uint256 assetsTraded);

    /// @notice Store portfolio weights on-chain — called ONCE after deployment
    /// @param _tokens   Array of ERC-20 token addresses (use WETH for ETH-native)
    /// @param _weights  Basis points per token (must sum to exactly 10000)
    /// @param _fees     Uniswap V3 fee tier per token (500, 3000, or 10000)
    function setPortfolio(
        address[] calldata _tokens,
        uint256[] calldata _weights,
        uint24[]  calldata _fees
    ) external onlyOwner {
        require(_tokens.length == _weights.length && _weights.length == _fees.length, "Length mismatch");
        require(_tokens.length > 0 && _tokens.length <= 70, "Invalid token count");
        uint256 sum = 0;
        for (uint256 i = 0; i < _weights.length; i++) sum += _weights[i];
        require(sum == 10000, "Weights must sum to 10000");
        portfolioTokens  = _tokens;
        portfolioWeights = _weights;
        portfolioFees    = _fees;
        emit PortfolioSet(_tokens.length, sum);
    }

    function getPortfolioLength() external view returns (uint256) { return portfolioTokens.length; }

    // ── Chainlink Automation / Vercel Cron — fully autonomous execution ────────

    /// @notice Returns true when: (a) portfolio is configured AND (b) vault has deployable ETH
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        bool hasWeights    = portfolioTokens.length > 0;
        bool hasFunds      = address(this).balance >= MIN_DEPLOY;
        bool cooldownPassed= block.timestamp >= lastDeployTime + MIN_REDEPLOY_GAP;
        upkeepNeeded = automationEnabled && hasWeights && hasFunds && cooldownPassed;
        performData  = abi.encode(upkeepNeeded);
    }

    /// @notice Autonomous fund deployment — called by Chainlink Automation OR Vercel Cron executor
    /// Distributes ALL vault ETH proportionally across portfolio tokens via Uniswap V3.
    /// NO private key needed for Chainlink. For Vercel Cron, only a minimal executor key
    /// stored in Vercel's encrypted env vars (never in code) is needed.
    function performUpkeep(bytes calldata) external override {
        require(automationEnabled, "Automation disabled");
        require(
            msg.sender == CHAINLINK_REGISTRY ||
            msg.sender == GELATO_RELAY       ||
            msg.sender == aiExecutor         ||
            msg.sender == owner,
            "Not authorized executor"
        );
        require(portfolioTokens.length > 0, "Portfolio not configured - call setPortfolio first");
        require(block.timestamp >= lastDeployTime + MIN_REDEPLOY_GAP, "Cooldown active");

        uint256 ethBal    = address(this).balance;
        uint256 gasRes    = 0.005 ether; // reserve for gas
        require(ethBal > gasRes + MIN_DEPLOY, "Insufficient ETH");
        uint256 deployable= ethBal - gasRes;

        lastDeployTime = block.timestamp;
        cycleCount++;
        uint256 traded = 0;

        for (uint256 i = 0; i < portfolioTokens.length; i++) {
            address token  = portfolioTokens[i];
            uint256 weight = portfolioWeights[i];
            if (token == address(0) || weight == 0) continue;

            uint256 amount = deployable * weight / 10000;
            if (amount < 0.0005 ether) continue;  // skip dust allocations

            // Wrap ETH → WETH → token via Uniswap V3 exactInputSingle
            ISwapRouter.ExactInputSingleParams memory p = ISwapRouter.ExactInputSingleParams({
                tokenIn:           WETH,
                tokenOut:          token,
                fee:               portfolioFees[i],
                recipient:         address(this),
                amountIn:          amount,
                amountOutMinimum:  0,   // accept any amount — no slippage protection for now
                sqrtPriceLimitX96: 0
            });

            try ISwapRouter(SWAP_ROUTER).exactInputSingle{value: amount}(p) returns (uint256 out) {
                positions[token] += out;
                traded++;
            } catch {
                // Failed swap — ETH stays in vault, next cycle will retry
            }
        }

        emit FundsDeployed(cycleCount, deployable, traded);
        emit AICycleExecuted(cycleCount, traded);
    }

    function setRedeployGap(uint256 _seconds) external onlyOwner { MIN_REDEPLOY_GAP = _seconds; }

    // ── Portfolio Execution — called by AI agent ──────────────────────────────

    /// @notice Buy an ERC-20 token with ETH via Uniswap V3
    /// @param tokenOut   ERC-20 token address to buy (e.g. UNI, AAVE, LINK...)
    /// @param amountIn   ETH amount in wei
    /// @param minOut     Minimum tokens to receive (slippage protection)
    /// @param poolFee    Uniswap pool fee tier (500=0.05%, 3000=0.3%, 10000=1%)
    /// @param signalLabel  AI signal string for event logging (e.g. "BUY BTC 87%")
    function buyAsset(
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        uint24  poolFee,
        string  calldata signalLabel
    ) external payable onlyAI returns (uint256 amountOut) {
        require(address(this).balance >= amountIn, "Insufficient ETH");
        require(tokenOut != address(0), "Invalid token");

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn:           WETH,
            tokenOut:          tokenOut,
            fee:               poolFee > 0 ? poolFee : DEFAULT_FEE,
            recipient:         address(this),
            amountIn:          amountIn,
            amountOutMinimum:  minOut,
            sqrtPriceLimitX96: 0
        });

        amountOut = ISwapRouter(SWAP_ROUTER).exactInputSingle{value: amountIn}(params);
        positions[tokenOut] += amountOut;

        emit SwapExecuted(WETH, tokenOut, amountIn, amountOut, signalLabel);
    }

    /// @notice Sell an ERC-20 token back to ETH via Uniswap V3
    function sellAsset(
        address tokenIn,
        uint256 amountIn,
        uint256 minEthOut,
        uint24  poolFee,
        string  calldata signalLabel
    ) external onlyAI returns (uint256 amountOut) {
        require(IERC20(tokenIn).balanceOf(address(this)) >= amountIn, "Insufficient token balance");

        IERC20(tokenIn).approve(SWAP_ROUTER, amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn:           tokenIn,
            tokenOut:          WETH,
            fee:               poolFee > 0 ? poolFee : DEFAULT_FEE,
            recipient:         address(this),
            amountIn:          amountIn,
            amountOutMinimum:  minEthOut,
            sqrtPriceLimitX96: 0
        });

        amountOut = ISwapRouter(SWAP_ROUTER).exactInputSingle(params);
        if (positions[tokenIn] >= amountIn) positions[tokenIn] -= amountIn;

        emit SwapExecuted(tokenIn, WETH, amountIn, amountOut, signalLabel);
    }

    /// @notice Lend an asset on Aave V3 to earn yield
    function lendAsset(address asset, uint256 amount) external onlyAI {
        require(IERC20(asset).balanceOf(address(this)) >= amount, "Insufficient balance");
        IERC20(asset).approve(AAVE_POOL, amount);
        IAavePool(AAVE_POOL).supply(asset, amount, address(this), 0);
        emit LendExecuted(asset, amount);
    }

    /// @notice Withdraw a lent asset from Aave V3
    function withdrawLend(address asset, uint256 amount) external onlyAI returns (uint256) {
        return IAavePool(AAVE_POOL).withdraw(asset, amount, address(this));
    }

    /// @notice Stake ETH via Lido to earn staking yield (returns stETH)
    function stakeETH(uint256 amount) external onlyAI returns (uint256 stEthReceived) {
        require(address(this).balance >= amount, "Insufficient ETH");
        stEthReceived = ILido(LIDO).submit{value: amount}(address(0));
        emit StakeExecuted(amount, stEthReceived);
    }

    /// @notice AI batch rebalance — execute multiple buy/sell signals in one tx
    /// @param tokens     Array of token addresses
    /// @param amounts    Array of ETH amounts to spend on each (0 = sell)
    /// @param isBuy      Array of booleans: true=buy, false=sell
    /// @param poolFees   Array of Uniswap pool fee tiers
    function rebalance(
        address[] calldata tokens,
        uint256[] calldata amounts,
        bool[]    calldata isBuy,
        uint24[]  calldata poolFees
    ) external payable onlyAI {
        require(tokens.length == amounts.length, "Length mismatch");
        cycleCount++;
        uint256 rebalanced = 0;

        for (uint256 i = 0; i < tokens.length; i++) {
            if (amounts[i] == 0) continue;
            try this._executeSingle(tokens[i], amounts[i], isBuy[i], poolFees[i]) {
                rebalanced++;
            } catch {}
        }

        emit AICycleExecuted(cycleCount, rebalanced);
    }

    /// @dev Internal single trade — isolated to allow try/catch in rebalance
    function _executeSingle(address token, uint256 amount, bool buy, uint24 fee) external {
        require(msg.sender == address(this), "Internal only");
        if (buy) {
            ISwapRouter.ExactInputSingleParams memory p = ISwapRouter.ExactInputSingleParams({
                tokenIn: WETH, tokenOut: token, fee: fee > 0 ? fee : DEFAULT_FEE,
                recipient: address(this), amountIn: amount, amountOutMinimum: 0, sqrtPriceLimitX96: 0
            });
            uint256 out = ISwapRouter(SWAP_ROUTER).exactInputSingle{value: amount}(p);
            positions[token] += out;
        } else {
            IERC20(token).approve(SWAP_ROUTER, amount);
            ISwapRouter.ExactInputSingleParams memory p = ISwapRouter.ExactInputSingleParams({
                tokenIn: token, tokenOut: WETH, fee: fee > 0 ? fee : DEFAULT_FEE,
                recipient: address(this), amountIn: amount, amountOutMinimum: 0, sqrtPriceLimitX96: 0
            });
            ISwapRouter(SWAP_ROUTER).exactInputSingle(p);
            if (positions[token] >= amount) positions[token] -= amount;
        }
    }

    // ── Fee collection ────────────────────────────────────────────────────────
    function collectFees(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner).transfer(amount);
        } else {
            IERC20(token).transfer(owner, amount);
        }
        emit FeesCollected(token, amount);
    }

    // ── View functions ────────────────────────────────────────────────────────
    function getETHBalance() external view returns (uint256) { return address(this).balance; }
    function getTokenBalance(address token) external view returns (uint256) { return IERC20(token).balanceOf(address(this)); }
    function getPosition(address token) external view returns (uint256) { return positions[token]; }

    function getAaveHealth() external view returns (uint256 healthFactor) {
        (,,,,,healthFactor) = IAavePool(AAVE_POOL).getUserAccountData(address(this));
    }
}
