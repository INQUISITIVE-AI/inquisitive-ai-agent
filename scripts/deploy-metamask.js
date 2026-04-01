/**
 * MetaMask-Only Deployment Script
 * 
 * DEPLOYS WITH ZERO PRIVATE KEYS IN CODE
 * 
 * How to use:
 * 1. Start hardhat node: npx hardhat node
 * 2. Connect MetaMask to localhost:8545
 * 3. Switch to team wallet in MetaMask
 * 4. Run: npx hardhat run scripts/deploy-metamask.js --network localhost
 * 
 * MetaMask will prompt for each transaction. You sign manually.
 * No private key ever touches disk.
 */

const { ethers } = require("hardhat");

const ADDRESSES = {
  INQAI: "0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5",
  TEAM_WALLET: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746",
  VAULT: "0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb"
};

async function main() {
  // Get signer from hardhat (which uses MetaMask when on localhost)
  const [deployer] = await ethers.getSigners();
  
  // Verify this is the team wallet
  if (deployer.address.toLowerCase() !== ADDRESSES.TEAM_WALLET.toLowerCase()) {
    console.log("⚠️  WARNING: Deployer is NOT the team wallet!");
    console.log("   Deployer:", deployer.address);
    console.log("   Expected: ", ADDRESSES.TEAM_WALLET);
    console.log("\n   Switch to team wallet in MetaMask and try again.\n");
    return;
  }

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  METAMASK-ONLY DEPLOYMENT                                      ║");
  console.log("║  ZERO Private Keys in Code                                     ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");
  
  console.log("✅ Team wallet verified:", deployer.address);
  console.log("\nMetaMask will prompt you to sign each transaction.\n");

  const deployment = {
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    network: "mainnet",
    contracts: {}
  };

  // 1. LiquidityLauncher
  console.log("STEP 1/4: Deploying LiquidityLauncher...");
  console.log("   ⏳ Waiting for MetaMask signature...");
  
  const LiquidityLauncher = await ethers.getContractFactory("LiquidityLauncher", deployer);
  const launcher = await LiquidityLauncher.deploy();
  await launcher.waitForDeployment();
  
  deployment.contracts.liquidityLauncher = {
    address: await launcher.getAddress(),
    verified: false
  };
  console.log("   ✅ Deployed:", await launcher.getAddress());

  // 2. FeeDistributor
  console.log("\nSTEP 2/4: Deploying FeeDistributor...");
  console.log("   ⏳ Waiting for MetaMask signature...");
  
  const FeeDistributor = await ethers.getContractFactory("FeeDistributor", deployer);
  const distributor = await FeeDistributor.deploy();
  await distributor.waitForDeployment();
  
  deployment.contracts.feeDistributor = {
    address: await distributor.getAddress(),
    verified: false
  };
  console.log("   ✅ Deployed:", await distributor.getAddress());

  // 3. INQAIStaking
  console.log("\nSTEP 3/4: Deploying INQAIStaking...");
  console.log("   ⏳ Waiting for MetaMask signature...");
  
  const INQAIStaking = await ethers.getContractFactory("INQAIStaking", deployer);
  const staking = await INQAIStaking.deploy();
  await staking.waitForDeployment();
  
  deployment.contracts.inqaiStaking = {
    address: await staking.getAddress(),
    verified: false
  };
  console.log("   ✅ Deployed:", await staking.getAddress());

  // 4. ReferralTracker
  console.log("\nSTEP 4/4: Deploying ReferralTracker...");
  console.log("   ⏳ Waiting for MetaMask signature...");
  
  const ReferralTracker = await ethers.getContractFactory("ReferralTracker", deployer);
  const referral = await ReferralTracker.deploy();
  await referral.waitForDeployment();
  
  deployment.contracts.referralTracker = {
    address: await referral.getAddress(),
    verified: false
  };
  console.log("   ✅ Deployed:", await referral.getAddress());

  // 5. Connect contracts (requires signatures)
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("CONNECTING CONTRACTS...");
  console.log("═══════════════════════════════════════════════════════════════");
  
  console.log("\n5a. Set staking contract in distributor...");
  console.log("   ⏳ Waiting for MetaMask signature...");
  await (await distributor.setStakingContract(await staking.getAddress())).wait();
  console.log("   ✅ Connected");
  
  console.log("\n5b. Set fee distributor in staking...");
  console.log("   ⏳ Waiting for MetaMask signature...");
  await (await staking.setFeeDistributor(await distributor.getAddress())).wait();
  console.log("   ✅ Connected");
  
  console.log("\n5c. Set launcher in referral...");
  console.log("   ⏳ Waiting for MetaMask signature...");
  await (await referral.setLauncherContract(await launcher.getAddress())).wait();
  console.log("   ✅ Connected");

  // Save deployment
  const fs = require('fs');
  fs.writeFileSync(
    './deployment-metamask.json',
    JSON.stringify(deployment, null, 2)
  );

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║  DEPLOYMENT COMPLETE                                           ║");
  console.log("║  ZERO PRIVATE KEYS USED                                        ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  console.log("Contract Addresses (SAVE THESE):");
  console.log("  LiquidityLauncher:", await launcher.getAddress());
  console.log("  FeeDistributor:   ", await distributor.getAddress());
  console.log("  INQAIStaking:     ", await staking.getAddress());
  console.log("  ReferralTracker:  ", await referral.getAddress());
  
  console.log("\nNext Steps:");
  console.log("1. Fund LiquidityLauncher with 25K INQAI for pool");
  console.log("2. Verify contracts on Etherscan");
  console.log("3. Update frontend .env with new addresses");
  console.log("\nDeployment saved to: deployment-metamask.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
