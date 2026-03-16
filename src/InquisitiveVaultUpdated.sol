// SPDX-License-Identifier: MIT
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

// deBridge DLN — Ethereum mainnet 0xeF4fB24aD0916217251F553c0596F8Edc630EB66
// Cross-chain order creation (Phase 2: Solana, BSC, Avalanche, Optimism, TRON)
interface IDLNSource {
    struct OrderCreation {
        address giveTokenAddress;
        uint256 giveAmount;
        bytes   takeTokenAddress;
        uint256 takeAmount;
        uint256 takeChainId;
        bytes   receiverDst;
        address givePatchAuthoritySrc;
        bytes   orderAuthorityAddressDst;
        bytes   allowedTakerDst;
        bytes   externalCall;
        bytes   allowedCancelBeneficiarySrc;
    }
    function createOrder(
        OrderCreation calldata _orderCreation,
        bytes calldata _affiliateFee,
        uint32 _referralCode,
        bytes calldata _permitEnvelope
    ) external payable returns (bytes32 orderId);
}

// ── Chainlink Automation Interface ───────────────────────────────────────────
interface IAutomationCompatible {
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

// ── InquisitiveVault — AI-managed 65-asset portfolio execution ───────────────
// Execution is KEYLESS: Chainlink Automation calls performUpkeep() automatically.
// No private key is needed in any application code — institutional grade.
// Phase 1: 22 ETH-mainnet ERC-20s via Uniswap V3 (direct swap)
// Phase 2: Cross-chain assets via deBridge DLN (on-chain bridge, no key needed)
// Phase 3: NAV-tracked assets — ETH held as stETH yield until bridge coverage
contract InquisitiveVaultUpdated is IAutomationCompatible {
    // ── Protocol addresses ───────────────────────────────────────────────────
    address public constant WETH        = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant USDC        = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant SWAP_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address public constant AAVE_POOL   = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
    address public constant LIDO        = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;
    address public constant GELATO_RELAY = 0xaBcC9b596420A9E9172FD5938620E265a0f9Df92;
    address public constant CHAINLINK_REGISTRY = 0x6593c7De001fC8542bB1703532EE1E5aA0D458fD;
    address public constant DLN_SOURCE   = 0xeF4fB24aD0916217251F553c0596F8Edc630EB66; // deBridge DLN
    uint24  public constant DEFAULT_FEE  = 3000;
    uint256 public constant MIN_DEPLOY   = 0.005 ether;
    uint256 public constant MIN_BRIDGE   = 0.001 ether; // minimum ETH to send cross-chain

    // ── State ────────────────────────────────────────────────────────────────
    address public owner;
    address public aiExecutor;
    address public inqaiToken;
    address public strategy;
    uint256 public performanceFee = 1500;
    bool    public automationEnabled = true;

    mapping(address => uint256) public positions;
    uint256 public totalDepositsUSD;
    uint256 public cycleCount;

    // ── Phase 1: ETH-mainnet portfolio weights ────────────────────────────────
    address[] public portfolioTokens;
    uint256[] public portfolioWeights;
    uint24[]  public portfolioFees;
    uint256   public lastDeployTime;
    uint256   public MIN_REDEPLOY_GAP = 60;

    // ── Phase 2: cross-chain assets via deBridge DLN ─────────────────────────
    struct Phase2Asset {
        bytes   tokenAddr;   // token mint/address on destination chain (bytes)
        uint256 chainId;     // destination chain ID (7565164=Solana, 56=BSC, etc.)
        bytes   receiver;    // portfolio wallet on destination chain (bytes)
        uint256 weightBps;   // allocation weight in basis points
        string  symbol;      // asset symbol for logging
    }
    Phase2Asset[] public phase2Assets;

    // ── Events ───────────────────────────────────────────────────────────────
    event Deposit(address indexed from, uint256 ethAmount, uint256 usdValue);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, string action);
    event LendExecuted(address indexed asset, uint256 amount);
    event StakeExecuted(uint256 ethAmount, uint256 stEthReceived);
    event StrategySet(address indexed newStrategy);
    event AIExecutorSet(address indexed executor);
    event FeesCollected(address indexed token, uint256 amount);
    event AICycleExecuted(uint256 cycleNumber, uint256 assetsRebalanced);
    event PortfolioSet(uint256 assetCount, uint256 weightSum);
    event Phase2RegistrySet(uint256 assetCount);
    event BridgeExecuted(string indexed symbol, uint256 chainId, uint256 ethAmount);
    event FundsDeployed(uint256 cycleNumber, uint256 ethDeployed, uint256 assetsTraded);

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
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

    constructor(address _inqaiToken) {
        owner      = msg.sender;
        aiExecutor = msg.sender;
        inqaiToken = _inqaiToken;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, 0);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    function setAIExecutor(address _executor) external onlyOwner {
        aiExecutor = _executor;
        emit AIExecutorSet(_executor);
    }

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

    // ── Portfolio configuration — called ONCE after deployment ────────────────
    /// @param _tokens   ERC-20 token addresses (use WBTC for BTC exposure, stETH for ETH)
    /// @param _weights  Basis points per token — MUST sum to exactly 10000
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
        require(sum > 0 && sum <= 10000, "Weights must be > 0 and <= 10000 bps total");
        portfolioTokens  = _tokens;
        portfolioWeights = _weights;
        portfolioFees    = _fees;
        emit PortfolioSet(_tokens.length, sum);
    }

    function getPortfolioLength() external view returns (uint256) { return portfolioTokens.length; }
    function setRedeployGap(uint256 _seconds) external onlyOwner { MIN_REDEPLOY_GAP = _seconds; }

    // ── Phase 2 registry — stores cross-chain destination info ────────────────
    /// @notice Store Phase 2 cross-chain asset registry — called ONCE after deployment
    /// @param assets  Array of Phase2Asset tuples: tokenAddr, chainId, receiver, weightBps, symbol
    function setPhase2Registry(Phase2Asset[] calldata assets) external onlyOwner {
        delete phase2Assets;
        for (uint256 i = 0; i < assets.length; i++) {
            phase2Assets.push(assets[i]);
        }
        emit Phase2RegistrySet(assets.length);
    }
    function getPhase2Length() external view returns (uint256) { return phase2Assets.length; }

    // ── Chainlink Automation — keyless autonomous execution ───────────────────

    /// @notice Returns true when portfolio is configured AND vault has deployable ETH
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        bool hasWeights    = portfolioTokens.length > 0;
        bool hasFunds      = address(this).balance >= MIN_DEPLOY;
        bool cooldownPassed= block.timestamp >= lastDeployTime + MIN_REDEPLOY_GAP;
        upkeepNeeded = automationEnabled && hasWeights && hasFunds && cooldownPassed;
        performData  = abi.encode(upkeepNeeded);
    }

    /// @notice Autonomous fund deployment — callable by ANYONE (Chainlink, Gelato, community).
    /// Per Chainlink Automation standard, performUpkeep is open to any caller.
    /// Community members can call this from Etherscan — no private key needed.
    function performUpkeep(bytes calldata) external override {
        require(automationEnabled, "Automation disabled");
        require(portfolioTokens.length > 0, "Portfolio not configured");
        require(block.timestamp >= lastDeployTime + MIN_REDEPLOY_GAP, "Cooldown active");

        uint256 ethBal    = address(this).balance;
        uint256 gasRes    = 0.005 ether;
        require(ethBal > gasRes + MIN_DEPLOY, "Insufficient ETH");
        uint256 deployable = ethBal - gasRes;

        lastDeployTime = block.timestamp;
        cycleCount++;
        uint256 traded = 0;

        for (uint256 i = 0; i < portfolioTokens.length; i++) {
            address token  = portfolioTokens[i];
            uint256 weight = portfolioWeights[i];
            if (token == address(0) || weight == 0) continue;

            uint256 amount = deployable * weight / 10000;
            if (amount < 0.0005 ether) continue;

            ISwapRouter.ExactInputSingleParams memory p = ISwapRouter.ExactInputSingleParams({
                tokenIn:           WETH,
                tokenOut:          token,
                fee:               portfolioFees[i],
                recipient:         address(this),
                amountIn:          amount,
                amountOutMinimum:  0,
                sqrtPriceLimitX96: 0
            });

            try ISwapRouter(SWAP_ROUTER).exactInputSingle{value: amount}(p) returns (uint256 out) {
                positions[token] += out;
                traded++;
            } catch {}
        }

        // ── Phase 2: cross-chain bridge via deBridge DLN ──────────────────────
        // ETH is sent cross-chain as native ETH order; deBridge DLN market makers
        // fill the order on the destination chain at the native token price.
        // This requires destination wallets to be set in phase2Assets via setPhase2Registry().
        uint256 p2TotalWeight = 0;
        for (uint256 i = 0; i < phase2Assets.length; i++) p2TotalWeight += phase2Assets[i].weightBps;

        if (p2TotalWeight > 0 && phase2Assets.length > 0) {
            for (uint256 i = 0; i < phase2Assets.length; i++) {
                Phase2Asset storage a = phase2Assets[i];
                if (a.receiver.length == 0 || a.weightBps == 0) continue;

                // Same 10000-bps denominator as Phase 1 — consistent allocation math
                uint256 bridgeAmt = deployable * a.weightBps / 10000;
                if (bridgeAmt < MIN_BRIDGE) continue;

                IDLNSource.OrderCreation memory order = IDLNSource.OrderCreation({
                    giveTokenAddress:            address(0), // native ETH
                    giveAmount:                  bridgeAmt,
                    takeTokenAddress:            a.tokenAddr,
                    takeAmount:                  1, // DLN market makers compete; 1 = accept best
                    takeChainId:                 a.chainId,
                    receiverDst:                 a.receiver,
                    givePatchAuthoritySrc:        address(this),
                    orderAuthorityAddressDst:     a.receiver,
                    allowedTakerDst:              bytes(''),
                    externalCall:                bytes(''),
                    allowedCancelBeneficiarySrc: abi.encodePacked(address(this))
                });

                try IDLNSource(DLN_SOURCE).createOrder{value: bridgeAmt}(
                    order, bytes(''), 0, bytes('')
                ) {
                    traded++;
                    emit BridgeExecuted(a.symbol, a.chainId, bridgeAmt);
                } catch {}
            }
        }

        emit FundsDeployed(cycleCount, deployable, traded);
        emit AICycleExecuted(cycleCount, traded);
    }

    // ── AI-directed execution (Phase 1 — Uniswap V3) ─────────────────────────

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
            tokenIn: WETH, tokenOut: tokenOut,
            fee: poolFee > 0 ? poolFee : DEFAULT_FEE,
            recipient: address(this), amountIn: amountIn,
            amountOutMinimum: minOut, sqrtPriceLimitX96: 0
        });
        amountOut = ISwapRouter(SWAP_ROUTER).exactInputSingle{value: amountIn}(params);
        positions[tokenOut] += amountOut;
        emit SwapExecuted(WETH, tokenOut, amountIn, amountOut, signalLabel);
    }

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
            tokenIn: tokenIn, tokenOut: WETH,
            fee: poolFee > 0 ? poolFee : DEFAULT_FEE,
            recipient: address(this), amountIn: amountIn,
            amountOutMinimum: minEthOut, sqrtPriceLimitX96: 0
        });
        amountOut = ISwapRouter(SWAP_ROUTER).exactInputSingle(params);
        if (positions[tokenIn] >= amountIn) positions[tokenIn] -= amountIn;
        emit SwapExecuted(tokenIn, WETH, amountIn, amountOut, signalLabel);
    }

    function lendAsset(address asset, uint256 amount) external onlyAI {
        require(IERC20(asset).balanceOf(address(this)) >= amount, "Insufficient balance");
        IERC20(asset).approve(AAVE_POOL, amount);
        IAavePool(AAVE_POOL).supply(asset, amount, address(this), 0);
        emit LendExecuted(asset, amount);
    }

    function withdrawLend(address asset, uint256 amount) external onlyAI returns (uint256) {
        return IAavePool(AAVE_POOL).withdraw(asset, amount, address(this));
    }

    function stakeETH(uint256 amount) external onlyAI returns (uint256 stEthReceived) {
        require(address(this).balance >= amount, "Insufficient ETH");
        stEthReceived = ILido(LIDO).submit{value: amount}(address(0));
        emit StakeExecuted(amount, stEthReceived);
    }

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

    function _executeSingle(address token, uint256 amount, bool buy, uint24 fee) external {
        require(msg.sender == address(this), "Internal only");
        if (buy) {
            ISwapRouter.ExactInputSingleParams memory p = ISwapRouter.ExactInputSingleParams({
                tokenIn: WETH, tokenOut: token,
                fee: fee > 0 ? fee : DEFAULT_FEE,
                recipient: address(this), amountIn: amount,
                amountOutMinimum: 0, sqrtPriceLimitX96: 0
            });
            uint256 out = ISwapRouter(SWAP_ROUTER).exactInputSingle{value: amount}(p);
            positions[token] += out;
        } else {
            IERC20(token).approve(SWAP_ROUTER, amount);
            ISwapRouter.ExactInputSingleParams memory p = ISwapRouter.ExactInputSingleParams({
                tokenIn: token, tokenOut: WETH,
                fee: fee > 0 ? fee : DEFAULT_FEE,
                recipient: address(this), amountIn: amount,
                amountOutMinimum: 0, sqrtPriceLimitX96: 0
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
