const { ethers } = require("hardhat");
require("dotenv").config();
const fs = require('fs');

/**
 * Setup LiquidityLauncher — Approve INQAI from Team Wallet
 * 
 * This script approves INQAI from the team wallet to the launcher contract
 * so it can be used for liquidity when $10K threshold is hit.
 * 
 * Run: npx hardhat run scripts/setup-launcher.js --network mainnet
 */

const ADDRESSES = {
  INQAI: "0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5",
  TEAM_WALLET: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746"
};

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("SETUP: LiquidityLauncher Approval");
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Using wallet:", deployer.address);
  
  // Must be team wallet
  if (deployer.address.toLowerCase() !== ADDRESSES.TEAM_WALLET.toLowerCase()) {
    console.error("❌ ERROR: Must use team wallet for setup!");
    console.error("   Deployer:", deployer.address);
    console.error("   Required:", ADDRESSES.TEAM_WALLET);
    process.exit(1);
  }
  
  // Read launcher address from deployment file
  let launcherAddress;
  try {
    const deployment = JSON.parse(fs.readFileSync('./launcher-deployment.json', 'utf8'));
    launcherAddress = deployment.launcherAddress;
    console.log("📄 Launcher:", launcherAddress);
  } catch {
    console.error("❌ ERROR: launcher-deployment.json not found!");
    console.error("   Deploy launcher first: npx hardhat run scripts/deploy-launcher.js --network mainnet");
    process.exit(1);
  }
  
  // Connect to INQAI
  const inqaiABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
  ];
  
  const inqai = await ethers.getContractAt(inqaiABI, ADDRESSES.INQAI);
  
  // Check team wallet balance
  const balance = await inqai.balanceOf(ADDRESSES.TEAM_WALLET);
  console.log("\n💰 Team INQAI Balance:", ethers.utils.formatUnits(balance, 18), "INQAI");
  
  // Approve amount (50,000 INQAI for safety margin)
  const approveAmount = ethers.utils.parseUnits("50000", 18);
  
  if (balance.lt(approveAmount)) {
    console.warn("⚠️  WARNING: Team balance is low!");
    console.warn("   Balance:", ethers.utils.formatUnits(balance, 18), "INQAI");
    console.warn("   Recommended: 50,000 INQAI for multiple launches");
  }
  
  // Check current allowance
  const currentAllowance = await inqai.allowance(ADDRESSES.TEAM_WALLET, launcherAddress);
  console.log("📄 Current allowance:", ethers.utils.formatUnits(currentAllowance, 18), "INQAI");
  
  if (currentAllowance.gte(approveAmount)) {
    console.log("\n✅ Already approved sufficient amount!");
    return;
  }
  
  // Approve
  console.log("\n🔄 Approving INQAI for LiquidityLauncher...");
  console.log("   Amount:", ethers.utils.formatUnits(approveAmount, 18), "INQAI");
  
  const tx = await inqai.approve(launcherAddress, approveAmount, {
    gasLimit: 100000
  });
  
  console.log("   Tx:", tx.hash);
  await tx.wait();
  
  // Verify
  const newAllowance = await inqai.allowance(ADDRESSES.TEAM_WALLET, launcherAddress);
  console.log("\n✅ Approval complete!");
  console.log("   New allowance:", ethers.utils.formatUnits(newAllowance, 18), "INQAI");
  
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("SETUP COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  console.log("LiquidityLauncher is now ready!");
  console.log("Buyers can deposit ETH and when $10K is raised,");
  console.log("the pool will automatically launch with:");
  console.log("  - Raised ETH as liquidity");
  console.log("  - INQAI from team allocation\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
