const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * PHASE A: Uniswap V3 Liquidity Pool Deployment
 * Makes INQAI tradable by creating INQAI/ETH and INQAI/USDC pools
 */

// Mainnet addresses
const ADDRESSES = {
  INQAI: "0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5",
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  
  // Uniswap V3
  V3_FACTORY: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  POSITION_MANAGER: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  
  // From tokenomics - 15M liquidity allocation
  LIQUIDITY_SOURCE: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746"
};

// Uniswap V3 Pool ABI (minimal)
const UNISWAP_V3_FACTORY_ABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
  "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)"
];

const NONFUNGIBLE_POSITION_MANAGER_ABI = [
  "function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)",
  "function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

const WETH_ABI = [
  ...ERC20_ABI,
  "function deposit() external payable"
];

// Calculate sqrtPriceX96 for pool initialization
// price = token1/token0, so if INQAI = $8 and ETH = $2000, then 1 INQAI = 0.004 ETH
function encodeSqrtPriceX96(price) {
  const sqrtPrice = Math.sqrt(parseFloat(price));
  const scaled = sqrtPrice * Math.pow(2, 96);
  return ethers.BigNumber.from(Math.floor(scaled).toString());
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("PHASE A: Uniswap V3 Liquidity Pool Deployment");
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  
  // Verify deployer is liquidity source
  if (deployer.address.toLowerCase() !== ADDRESSES.LIQUIDITY_SOURCE.toLowerCase()) {
    console.warn("⚠️  WARNING: Deployer is not the liquidity source wallet!");
    console.warn("Expected:", ADDRESSES.LIQUIDITY_SOURCE);
    console.log("");
  }
  
  // Connect to contracts
  const positionManager = await ethers.getContractAt(
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    ADDRESSES.POSITION_MANAGER
  );
  
  const factory = await ethers.getContractAt(
    UNISWAP_V3_FACTORY_ABI,
    ADDRESSES.V3_FACTORY
  );
  
  const inqai = await ethers.getContractAt(ERC20_ABI, ADDRESSES.INQAI);
  const weth = await ethers.getContractAt(WETH_ABI, ADDRESSES.WETH);
  const usdc = await ethers.getContractAt(ERC20_ABI, ADDRESSES.USDC);
  
  // Check balances
  console.log("📊 Checking balances...");
  const ethBalance = await deployer.getBalance();
  const inqaiBalance = await inqai.balanceOf(deployer.address);
  const usdcBalance = await usdc.balanceOf(deployer.address);
  
  console.log(`  ETH:   ${ethers.utils.formatEther(ethBalance)} ETH`);
  console.log(`  INQAI: ${ethers.utils.formatUnits(inqaiBalance, 18)} INQAI`);
  console.log(`  USDC:  ${ethers.utils.formatUnits(usdcBalance, 6)} USDC\n`);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: INQAI/ETH Pool
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("STEP 1: INQAI/ETH Pool Creation\n");
  
  // Sort tokens (token0 < token1 by address)
  const [token0, token1] = ADDRESSES.INQAI.toLowerCase() < ADDRESSES.WETH.toLowerCase()
    ? [ADDRESSES.INQAI, ADDRESSES.WETH]
    : [ADDRESSES.WETH, ADDRESSES.INQAI];
  
  const isInqaiToken0 = token0 === ADDRESSES.INQAI;
  
  console.log(`Token0: ${token0}`);
  console.log(`Token1: ${token1}`);
  console.log(`INQAI is token0: ${isInqaiToken0}`);
  
  // Price: 1 INQAI = $8, 1 ETH = $2000
  // So 1 INQAI = 8/2000 = 0.004 ETH
  // If INQAI is token0: price = 1/0.004 = 250 (1 WETH = 250 INQAI)
  // If WETH is token0: price = 0.004 (1 INQAI = 0.004 WETH)
  const price = isInqaiToken0 ? 250 : 0.004;
  const sqrtPriceX96 = encodeSqrtPriceX96(price);
  
  console.log(`Target price: $8/INQAI (1 INQAI = 0.004 ETH)`);
  console.log(`SqrtPriceX96: ${sqrtPriceX96}\n`);
  
  // Check if pool exists
  const feeTier = 3000; // 0.3%
  let poolAddress = await factory.getPool(token0, token1, feeTier);
  
  if (poolAddress !== "0x0000000000000000000000000000000000000000") {
    console.log(`✅ Pool already exists at: ${poolAddress}\n`);
  } else {
    console.log("🔄 Creating INQAI/ETH pool...");
    
    try {
      const tx = await positionManager.createAndInitializePoolIfNecessary(
        token0,
        token1,
        feeTier,
        sqrtPriceX96,
        { gasLimit: 5000000 }
      );
      
      console.log(`Transaction: ${tx.hash}`);
      const receipt = await tx.wait();
      
      poolAddress = await factory.getPool(token0, token1, feeTier);
      console.log(`✅ Pool created at: ${poolAddress}`);
      console.log(`Block: ${receipt.blockNumber}\n`);
    } catch (error) {
      console.error(`❌ Pool creation failed: ${error.message}\n`);
      throw error;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Add Liquidity to INQAI/ETH
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("STEP 2: Add Liquidity to INQAI/ETH\n");
  
  // Configuration: 100 ETH + 25,000 INQAI (~$400K total at $8/INQAI, $2000/ETH)
  const ETH_AMOUNT = ethers.utils.parseEther("100");  // 100 ETH
  const INQAI_AMOUNT = ethers.utils.parseUnits("25000", 18); // 25,000 INQAI
  
  console.log(`Adding: ${ethers.utils.formatEther(ETH_AMOUNT)} ETH`);
  console.log(`Adding: ${ethers.utils.formatUnits(INQAI_AMOUNT, 18)} INQAI\n`);
  
  // Wrap ETH to WETH if needed
  const wethBalance = await weth.balanceOf(deployer.address);
  if (wethBalance.lt(ETH_AMOUNT)) {
    const wrapAmount = ETH_AMOUNT.sub(wethBalance);
    console.log(`🔄 Wrapping ${ethers.utils.formatEther(wrapAmount)} ETH to WETH...`);
    
    const wrapTx = await weth.deposit({ value: wrapAmount, gasLimit: 100000 });
    await wrapTx.wait();
    console.log("✅ ETH wrapped to WETH\n");
  }
  
  // Approve tokens
  console.log("🔄 Approving tokens for Position Manager...");
  
  // Approve INQAI
  const inqaiAllowance = await inqai.allowance(deployer.address, ADDRESSES.POSITION_MANAGER);
  if (inqaiAllowance.lt(INQAI_AMOUNT)) {
    const approveTx = await inqai.approve(
      ADDRESSES.POSITION_MANAGER,
      ethers.constants.MaxUint256,
      { gasLimit: 100000 }
    );
    await approveTx.wait();
    console.log("✅ INQAI approved");
  }
  
  // Approve WETH
  const wethAllowance = await weth.allowance(deployer.address, ADDRESSES.POSITION_MANAGER);
  if (wethAllowance.lt(ETH_AMOUNT)) {
    const approveTx = await weth.approve(
      ADDRESSES.POSITION_MANAGER,
      ethers.constants.MaxUint256,
      { gasLimit: 100000 }
    );
    await approveTx.wait();
    console.log("✅ WETH approved\n");
  }
  
  // Mint liquidity position
  console.log("🔄 Minting liquidity position...");
  
  const amount0Desired = isInqaiToken0 ? INQAI_AMOUNT : ETH_AMOUNT;
  const amount1Desired = isInqaiToken0 ? ETH_AMOUNT : INQAI_AMOUNT;
  
  const mintParams = {
    token0: token0,
    token1: token1,
    fee: feeTier,
    tickLower: -887220, // Full range
    tickUpper: 887220,
    amount0Desired: amount0Desired,
    amount1Desired: amount1Desired,
    amount0Min: 0, // No slippage protection for initial seed
    amount1Min: 0,
    recipient: deployer.address,
    deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  };
  
  try {
    const mintTx = await positionManager.mint(mintParams, {
      gasLimit: 5000000
    });
    
    console.log(`Transaction: ${mintTx.hash}`);
    const mintReceipt = await mintTx.wait();
    
    console.log("\n✅ Liquidity position minted successfully!");
    console.log(`Gas used: ${mintReceipt.gasUsed}\n`);
    
  } catch (error) {
    console.error(`❌ Liquidity mint failed: ${error.message}\n`);
    console.error("Possible issues:");
    console.error("- Insufficient INQAI balance");
    console.error("- Insufficient WETH balance");
    console.error("- Approvals not set correctly");
    throw error;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: INQAI/USDC Pool (Optional)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("STEP 3: INQAI/USDC Pool (Optional)\n");
  
  if (usdcBalance.lt(ethers.utils.parseUnits("200000", 6))) {
    console.log("⚠️  Insufficient USDC balance (need 200,000 USDC)");
    console.log("Skipping INQAI/USDC pool...\n");
  } else {
    const [usdcToken0, usdcToken1] = ADDRESSES.INQAI.toLowerCase() < ADDRESSES.USDC.toLowerCase()
      ? [ADDRESSES.INQAI, ADDRESSES.USDC]
      : [ADDRESSES.USDC, ADDRESSES.INQAI];
    
    const inqaiIsToken0ForUsdc = usdcToken0 === ADDRESSES.INQAI;
    const usdcPrice = inqaiIsToken0ForUsdc ? 1/8 : 8;
    const usdcSqrtPriceX96 = encodeSqrtPriceX96(usdcPrice);
    
    let usdcPool = await factory.getPool(usdcToken0, usdcToken1, feeTier);
    
    if (usdcPool === "0x0000000000000000000000000000000000000000") {
      console.log("🔄 Creating INQAI/USDC pool...");
      
      try {
        const createTx = await positionManager.createAndInitializePoolIfNecessary(
          usdcToken0,
          usdcToken1,
          feeTier,
          usdcSqrtPriceX96,
          { gasLimit: 5000000 }
        );
        await createTx.wait();
        
        usdcPool = await factory.getPool(usdcToken0, usdcToken1, feeTier);
        console.log(`✅ INQAI/USDC pool created: ${usdcPool}\n`);
        
        // Approve USDC
        const usdcAllowance = await usdc.allowance(deployer.address, ADDRESSES.POSITION_MANAGER);
        if (usdcAllowance.lt(ethers.utils.parseUnits("200000", 6))) {
          const approveTx = await usdc.approve(
            ADDRESSES.POSITION_MANAGER,
            ethers.constants.MaxUint256,
            { gasLimit: 100000 }
          );
          await approveTx.wait();
          console.log("✅ USDC approved\n");
        }
        
        // Add liquidity
        console.log("🔄 Adding liquidity to INQAI/USDC...");
        
        const USDC_AMOUNT = ethers.utils.parseUnits("200000", 6);
        const INQAI_FOR_USDC = ethers.utils.parseUnits("25000", 18);
        
        const usdcMintParams = {
          token0: usdcToken0,
          token1: usdcToken1,
          fee: feeTier,
          tickLower: -887220,
          tickUpper: 887220,
          amount0Desired: inqaiIsToken0ForUsdc ? INQAI_FOR_USDC : USDC_AMOUNT,
          amount1Desired: inqaiIsToken0ForUsdc ? USDC_AMOUNT : INQAI_FOR_USDC,
          amount0Min: 0,
          amount1Min: 0,
          recipient: deployer.address,
          deadline: Math.floor(Date.now() / 1000) + 3600
        };
        
        const mintTx = await positionManager.mint(usdcMintParams, { gasLimit: 5000000 });
        await mintTx.wait();
        console.log("✅ INQAI/USDC liquidity added\n");
        
      } catch (error) {
        console.error(`⚠️ INQAI/USDC pool creation failed: ${error.message}\n`);
      }
    } else {
      console.log(`✅ INQAI/USDC pool already exists: ${usdcPool}\n`);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("PHASE A COMPLETE - DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  const finalInqaiEthPool = await factory.getPool(token0, token1, feeTier);
  console.log("✅ INQAI/ETH Pool:");
  console.log(`   Address: ${finalInqaiEthPool}`);
  console.log(`   Fee: 0.3%`);
  console.log(`   Price: $8/INQAI`);
  console.log(`   Liquidity: 100 ETH + 25,000 INQAI (~$400K)\n`);
  
  const [finalUsdcToken0, finalUsdcToken1] = ADDRESSES.INQAI.toLowerCase() < ADDRESSES.USDC.toLowerCase()
    ? [ADDRESSES.INQAI, ADDRESSES.USDC]
    : [ADDRESSES.USDC, ADDRESSES.INQAI];
  const finalUsdcPool = await factory.getPool(finalUsdcToken0, finalUsdcToken1, feeTier);
  
  if (finalUsdcPool !== "0x0000000000000000000000000000000000000000") {
    console.log("✅ INQAI/USDC Pool:");
    console.log(`   Address: ${finalUsdcPool}`);
    console.log(`   Fee: 0.3%`);
    console.log(`   Liquidity: 200,000 USDC + 25,000 INQAI (~$400K)\n`);
  }
  
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("INQAI IS NOW TRADABLE ON UNISWAP V3");
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  console.log("Next Steps:");
  console.log("1. Verify pools on app.uniswap.org");
  console.log("2. Submit to CoinGecko (requires 7 days trading history)");
  console.log("3. Submit to CoinMarketCap");
  console.log("4. Apply to 1inch/Matcha for DEX aggregation");
  console.log("5. Announce on social channels\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
