const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying INQAI Smart Contracts to Ethereum Localhost...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with the account:", deployer.address);
  
  // Check balance
  const provider = ethers.provider;
  const balance = await provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.5")) {
    console.log("⚠️  WARNING: Low ETH balance. Ensure you have at least 0.5 ETH for gas fees.");
  }

  try {
    // 1. Deploy INQAI Token
    console.log("\n🪙 Deploying INQAI Token...");
    const INQAI = await ethers.getContractFactory("INQAI");
    const inqai = await INQAI.deploy();
    await inqai.waitForDeployment();
    console.log("✅ INQAI Token deployed to:", inqai.target);
    console.log("📊 Total Supply:", ethers.formatEther(await inqai.totalSupply()), "INQAI");

    // 2. Deploy InquisitiveVault
    console.log("\n🏦 Deploying InquisitiveVault...");
    const InquisitiveVault = await ethers.getContractFactory("InquisitiveVaultUpdated");
    const vault = await InquisitiveVault.deploy(inqai.target);
    await vault.waitForDeployment();
    console.log("✅ InquisitiveVault deployed to:", vault.target);

    // 3. Deploy InquisitiveStrategy
    console.log("\n🤖 Deploying InquisitiveStrategy...");
    const InquisitiveStrategy = await ethers.getContractFactory("InquisitiveStrategy");
    const strategy = await InquisitiveStrategy.deploy(vault.target);
    await strategy.waitForDeployment();
    console.log("✅ InquisitiveStrategy deployed to:", strategy.target);

    // 4. Deploy AIStrategyManager
    console.log("\n🧠 Deploying AIStrategyManager...");
    const AIStrategyManager = await ethers.getContractFactory("AIStrategyManager");
    const aiManager = await AIStrategyManager.deploy(strategy.target, vault.target);
    await aiManager.waitForDeployment();
    console.log("✅ AIStrategyManager deployed to:", aiManager.target);

    // 5. Deploy InquisitiveProfitMaximizer
    console.log("\n💎 Deploying InquisitiveProfitMaximizer...");
    const InquisitiveProfitMaximizer = await ethers.getContractFactory("InquisitiveProfitMaximizer");
    const profitMaximizer = await InquisitiveProfitMaximizer.deploy(inqai.target, vault.target);
    await profitMaximizer.waitForDeployment();
    console.log("✅ InquisitiveProfitMaximizer deployed to:", profitMaximizer.target);

    // 6. Setup Team Vesting with your confirmed address
    console.log("\n🎯 Setting up team vesting...");
    const teamAddress = "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746";
    const teamAllocation = ethers.parseEther("20000000"); // 20M INQAI
    
    // Transfer team tokens to your address
    console.log("📤 Transferring team allocation to:", teamAddress);
    const transferTx = await inqai.transfer(teamAddress, teamAllocation);
    await transferTx.wait();
    console.log("✅ Team allocation transferred successfully");
    console.log("📊 Team allocation amount:", ethers.formatEther(teamAllocation), "INQAI");

    // 7. Setup vesting schedule (if you have a vesting contract)
    // Note: You'll need to implement the vesting contract separately
    console.log("\n⏰ Vesting Schedule Setup:");
    console.log("📅 Months 1-3: 0 tokens (launch commitment)");
    console.log("📅 Months 4-12: 333K tokens/month (early phase)");
    console.log("📅 Months 13-24: 667K tokens/month (growth phase)");
    console.log("📅 Months 25-36: 1M tokens/month (maturation phase)");

    // 8. Initialize contracts
    console.log("\n⚙️ Initializing contracts...");
    
    // Set up vault permissions
    console.log("🔐 Setting vault permissions...");
    await vault.setStrategy(strategy.target);
    console.log("✅ Vault strategy set");

    // Set up strategy permissions
    console.log("🔐 Setting strategy permissions...");
    await strategy.setVault(vault.target);
    console.log("✅ Strategy vault set");

    // Set performance fee (15% = 1500 basis points)
    console.log("💰 Setting performance fee to 15%...");
    await vault.setPerformanceFee(1500);
    console.log("✅ Performance fee set");

    // 9. Save deployment addresses
    const deploymentInfo = {
      network: "localhost",
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        INQAI: inqai.target,
        InquisitiveVault: vault.target,
        InquisitiveStrategy: strategy.target,
        AIStrategyManager: aiManager.target,
        InquisitiveProfitMaximizer: profitMaximizer.target
      },
      teamAllocation: {
        address: teamAddress,
        amount: ethers.formatEther(teamAllocation),
        percentage: "20%"
      },
      vesting: {
        totalMonths: 36,
        cliffMonths: 3,
        schedule: {
          "months-1-3": "0 tokens",
          "months-4-12": "333K tokens/month",
          "months-13-24": "667K tokens/month", 
          "months-25-36": "1M tokens/month"
        }
      }
    };

    // Save to file
    const fs = require('fs');
    fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to deployment-info.json");

    // 10. Display summary
    console.log("\n🎊 DEPLOYMENT SUMMARY");
    console.log("=".repeat(50));
    console.log("🪙 INQAI Token:", inqai.target);
    console.log("🏦 InquisitiveVault:", vault.target);
    console.log("🤖 InquisitiveStrategy:", strategy.target);
    console.log("🧠 AIStrategyManager:", aiManager.target);
    console.log("💎 InquisitiveProfitMaximizer:", profitMaximizer.target);
    console.log("👤 Team Address:", teamAddress);
    console.log("💰 Team Allocation:", ethers.formatEther(teamAllocation), "INQAI");
    console.log("⏰ Vesting: 36 months with 3-month cliff");
    console.log("📊 Performance Fee: 15%");
    console.log("\n✅ All contracts deployed successfully!");
    console.log("🚀 Ready for exchange listings and launch!");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
