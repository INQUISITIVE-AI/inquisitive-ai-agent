const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Deploy LiquidityLauncher Contract
 * 
 * This contract:
 * - Accepts ETH from presale buyers
 * - Tracks contributions
 * - Auto-launches Uniswap V3 pool when $10K raised
 * - Distributes INQAI to buyers proportional to contribution
 * 
 * Run: npx hardhat run scripts/deploy-launcher.js --network mainnet
 */

// Contract addresses
const ADDRESSES = {
  INQAI: "0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5",
  TEAM_WALLET: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746"
};

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("DEPLOY: LiquidityLauncher");
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  
  const balance = await deployer.getBalance();
  console.log("💰 Balance:", ethers.utils.formatEther(balance), "ETH\n");
  
  // Check if deployer is team wallet
  if (deployer.address.toLowerCase() !== ADDRESSES.TEAM_WALLET.toLowerCase()) {
    console.warn("⚠️  WARNING: Deployer is not team wallet!");
    console.warn("   Deployer:", deployer.address);
    console.warn("   Team:", ADDRESSES.TEAM_WALLET);
    console.log("");
  }
  
  // Deploy LiquidityLauncher
  console.log("🔄 Deploying LiquidityLauncher...");
  
  const LiquidityLauncher = await ethers.getContractFactory("LiquidityLauncher");
  const launcher = await LiquidityLauncher.deploy();
  
  await launcher.deployed();
  
  console.log("\n✅ LiquidityLauncher deployed!");
  console.log("   Address:", launcher.address);
  console.log("   Tx:", launcher.deployTransaction.hash);
  console.log("   Block:", launcher.deployTransaction.blockNumber);
  
  // Verify contract state
  console.log("\n📊 Contract Configuration:");
  console.log("   Launch Threshold: $10,000");
  console.log("   Presale Price: $8/INQAI");
  console.log("   Pool Fee: 0.3%");
  console.log("   INQAI:", ADDRESSES.INQAI);
  console.log("   Team Wallet:", ADDRESSES.TEAM_WALLET);
  
  // Check if team wallet has INQAI
  const inqaiABI = ["function balanceOf(address) view returns (uint256)"];
  const inqai = await ethers.getContractAt(inqaiABI, ADDRESSES.INQAI);
  const teamBalance = await inqai.balanceOf(ADDRESSES.TEAM_WALLET);
  
  console.log("\n📊 Team Wallet INQAI Balance:");
  console.log("   ", ethers.utils.formatUnits(teamBalance, 18), "INQAI");
  
  if (teamBalance.lt(ethers.utils.parseUnits("25000", 18))) {
    console.warn("\n⚠️  WARNING: Team wallet needs at least 25,000 INQAI for liquidity");
    console.warn("   Current:", ethers.utils.formatUnits(teamBalance, 18), "INQAI");
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NEXT STEPS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("NEXT STEPS");
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  console.log("1. Approve INQAI from team wallet:");
  console.log(`   npx hardhat run scripts/setup-launcher.js --network mainnet`);
  console.log("");
  
  console.log("2. Share launcher address with community:");
  console.log("   ", launcher.address);
  console.log("");
  
  console.log("3. Buyers deposit ETH to launcher");
  console.log("   When $10K raised, pool auto-creates");
  console.log("   Buyers claim INQAI proportional to contribution");
  console.log("");
  
  console.log("4. Verify on Etherscan:");
  console.log(`   npx hardhat verify --network mainnet ${launcher.address}`);
  console.log("");
  
  // Save deployment info
  const deploymentInfo = {
    launcherAddress: launcher.address,
    deployer: deployer.address,
    teamWallet: ADDRESSES.TEAM_WALLET,
    inqaiAddress: ADDRESSES.INQAI,
    deploymentBlock: launcher.deployTransaction.blockNumber,
    txHash: launcher.deployTransaction.hash,
    timestamp: new Date().toISOString()
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    './launcher-deployment.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("✅ Deployment saved to launcher-deployment.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
