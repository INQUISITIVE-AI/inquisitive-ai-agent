const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🎯 Creating Team Vesting Contract...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying vesting contract with account:", deployer.address);

  try {
    // Deploy the vesting contract
    const TeamVesting = await ethers.getContractFactory("SuccessOptimizedVesting");
    const vesting = await TeamVesting.deploy();
    await vesting.deployed();
    console.log("✅ TeamVesting deployed to:", vesting.address);

    // Your team allocation details
    const teamAddress = "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746";
    const totalAllocation = ethers.utils.parseEther("20000000"); // 20M INQAI
    
    // Vesting schedule parameters
    const cliffDuration = 3 * 30 * 24 * 60 * 60; // 3 months in seconds
    const totalDuration = 36 * 30 * 24 * 60 * 60; // 36 months in seconds
    
    // Staged release amounts (in wei)
    const stage1Amount = ethers.utils.parseEther("333000"); // 333K for months 4-12 (9 months)
    const stage2Amount = ethers.utils.parseEther("667000"); // 667K for months 13-24 (12 months)  
    const stage3Amount = ethers.utils.parseEther("1000000"); // 1M for months 25-36 (12 months)

    console.log("\n⚙️ Setting up vesting parameters...");
    console.log("👤 Beneficiary:", teamAddress);
    console.log("💰 Total Allocation:", ethers.utils.formatEther(totalAllocation), "INQAI");
    consolelet("⏰ Cliff Duration:", cliffDuration / (30 * 24 * 60 * 60), "months");
    console.log("⏰ Total Duration:", totalDuration / (30 * 24 * 60 * 60), "months");
    console.log("📊 Stage 1 (Months 4-12):", ethers.utils.formatEther(stage1Amount), "INQAI/month");
    console.log("📊 Stage 2 (Months 13-24):", ethers.utils.formatEther(stage2Amount), "INQAI/month");
    console.log("📊 Stage 3 (Months 25-36):", ethers.utils.formatEther(stage3Amount), "INQAI/month");

    // Initialize vesting contract
    await vesting.initialize(
      teamAddress,
      totalAllocation,
      cliffDuration,
      totalDuration,
      [stage1Amount, stage2Amount, stage3Amount],
      [9, 12, 12] // Duration of each stage in months
    );
    
    console.log("✅ Vesting contract initialized successfully!");

    // Save vesting info
    const vestingInfo = {
      contractAddress: vesting.address,
      beneficiary: teamAddress,
      totalAllocation: ethers.utils.formatEther(totalAllocation),
      cliffMonths: 3,
      totalMonths: 36,
      schedule: {
        "months-1-3": "0 tokens (cliff)",
        "months-4-12": ethers.utils.formatEther(stage1Amount) + " tokens/month",
        "months-13-24": ethers.utils.formatEther(stage2Amount) + " tokens/month",
        "months-25-36": ethers.utils.formatEther(stage3Amount) + " tokens/month"
      }
    };

    const fs = require('fs');
    fs.writeFileSync('vesting-info.json', JSON.stringify(vestingInfo, null, 2));
    console.log("💾 Vesting info saved to vesting-info.json");

    console.log("\n🎊 VESTING SETUP COMPLETE!");
    console.log("🚀 Team tokens are now properly vested!");

  } catch (error) {
    console.error("❌ Vesting setup failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
