const { ethers } = require("hardhat");

/**
 * Complete Platform Deployment — ZERO PRIVATE KEYS VERSION
 * 
 * Deploys all ecosystem contracts WITHOUT requiring PRIVATE_KEY in .env
 * 
 * Methods (choose one):
 * 1. MetaMask + Hardhat: npx hardhat node, connect MetaMask, run with --network localhost
 * 2. Remix IDE: Copy contracts to remix.ethereum.org, deploy with MetaMask
 * 
 * NEVER add PRIVATE_KEY to .env. NEVER hardcode private keys in code.
 * MetaMask handles all signing.
 * 
 * See DEPLOY_NO_KEYS.md for detailed instructions.
 */

const ADDRESSES = {
  INQAI: "0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5",
  TEAM_WALLET: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746",
  VAULT: "0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb"
};

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  COMPLETE PLATFORM DEPLOYMENT                                  ║");
  console.log("║  Building the Most Successful Token Project Ever               ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");
  
  const deployment = {
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {}
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DEPLOY LIQUIDITYLAUNCHER
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("STEP 1: Deploying LiquidityLauncher");
  console.log("═══════════════════════════════════════════════════════════════");
  
  const LiquidityLauncher = await ethers.getContractFactory("LiquidityLauncher");
  const launcher = await LiquidityLauncher.deploy();
  await launcher.deployed();
  
  deployment.contracts.liquidityLauncher = {
    address: launcher.address,
    tx: launcher.deployTransaction.hash,
    block: launcher.deployTransaction.blockNumber
  };
  
  console.log("✅ LiquidityLauncher deployed");
  console.log("   Address:", launcher.address);
  console.log("   Tx:", launcher.deployTransaction.hash);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DEPLOY FEEDISTRIBUTOR
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("STEP 2: Deploying FeeDistributor");
  console.log("═══════════════════════════════════════════════════════════════");
  
  const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
  const distributor = await FeeDistributor.deploy();
  await distributor.deployed();
  
  deployment.contracts.feeDistributor = {
    address: distributor.address,
    tx: distributor.deployTransaction.hash,
    block: distributor.deployTransaction.blockNumber
  };
  
  console.log("✅ FeeDistributor deployed");
  console.log("   Address:", distributor.address);
  console.log("   Tx:", distributor.deployTransaction.hash);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DEPLOY INQAISTAKING
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("STEP 3: Deploying INQAIStaking");
  console.log("═══════════════════════════════════════════════════════════════");
  
  const INQAIStaking = await ethers.getContractFactory("INQAIStaking");
  const staking = await INQAIStaking.deploy();
  await staking.deployed();
  
  deployment.contracts.inqaiStaking = {
    address: staking.address,
    tx: staking.deployTransaction.hash,
    block: staking.deployTransaction.blockNumber
  };
  
  console.log("✅ INQAIStaking deployed");
  console.log("   Address:", staking.address);
  console.log("   Tx:", staking.deployTransaction.hash);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 4. DEPLOY REFERRALTRACKER
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("STEP 4: Deploying ReferralTracker");
  console.log("═══════════════════════════════════════════════════════════════");
  
  const ReferralTracker = await ethers.getContractFactory("ReferralTracker");
  const referral = await ReferralTracker.deploy();
  await referral.deployed();
  
  deployment.contracts.referralTracker = {
    address: referral.address,
    tx: referral.deployTransaction.hash,
    block: referral.deployTransaction.blockNumber
  };
  
  console.log("✅ ReferralTracker deployed");
  console.log("   Address:", referral.address);
  console.log("   Tx:", referral.deployTransaction.hash);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 5. CONNECT CONTRACTS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("STEP 5: Connecting Contracts");
  console.log("═══════════════════════════════════════════════════════════════");
  
  // Set staking in distributor
  await distributor.setStakingContract(staking.address);
  console.log("✅ FeeDistributor → Staking connected");
  
  // Set distributor in staking
  await staking.setFeeDistributor(distributor.address);
  console.log("✅ Staking → FeeDistributor connected");
  
  // Set launcher in referral
  await referral.setLauncherContract(launcher.address);
  console.log("✅ ReferralTracker → Launcher connected");
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE DEPLOYMENT
  // ═══════════════════════════════════════════════════════════════════════════
  const fs = require('fs');
  fs.writeFileSync(
    './complete-platform-deployment.json',
    JSON.stringify(deployment, null, 2)
  );
  
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║  DEPLOYMENT COMPLETE                                           ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");
  
  console.log("Contract Addresses:");
  console.log("  LiquidityLauncher:", launcher.address);
  console.log("  FeeDistributor:   ", distributor.address);
  console.log("  INQAIStaking:     ", staking.address);
  console.log("  ReferralTracker:  ", referral.address);
  
  console.log("\nNext Steps:");
  console.log("1. Approve INQAI from team wallet to all contracts");
  console.log("2. Fund referral bonus pool");
  console.log("3. Update frontend with new contract addresses");
  console.log("4. Verify contracts on Etherscan");
  console.log("\nDeployment saved to: complete-platform-deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
