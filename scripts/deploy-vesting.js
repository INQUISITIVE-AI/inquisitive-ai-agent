const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🎯 Deploying Team Vesting Contract...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

  // Contract addresses
  const INQAI_ADDRESS = "0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5";
  const TEAM_WALLET = "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746";
  
  // Vesting parameters
  const TEAM_ALLOCATION = ethers.utils.parseEther("20000000"); // 20M INQAI
  const START_TIME = Math.floor(Date.now() / 1000); // Start now
  const DURATION_SECONDS = 48 * 30 * 24 * 60 * 60; // 48 months

  try {
    // Deploy vesting contract
    console.log("\n🚀 Deploying TeamVesting contract...");
    const TeamVesting = await ethers.getContractFactory("TeamVesting");
    const vesting = await TeamVesting.deploy(
      INQAI_ADDRESS,
      TEAM_WALLET,
      START_TIME,
      DURATION_SECONDS
    );
    await vesting.deployed();
    
    console.log("✅ TeamVesting deployed to:", vesting.address);
    console.log("📅 Start time:", new Date(START_TIME * 1000).toISOString());
    console.log("⏰ Duration:", DURATION_SECONDS / (30 * 24 * 60 * 60), "months");
    
    // Transfer tokens to vesting contract
    console.log("\n💸 Transferring 20M INQAI to vesting contract...");
    const INQAI = await ethers.getContractAt("IERC20", INQAI_ADDRESS);
    
    const tx = await INQAI.transfer(vesting.address, TEAM_ALLOCATION);
    await tx.wait();
    
    console.log("✅ Tokens transferred to vesting contract");
    console.log("💰 Vesting contract balance:", ethers.utils.formatEther(await INQAI.balanceOf(vesting.address)), "INQAI");
    
    // Check vested amount
    const vested = await vesting.vestedAmount(Math.floor(Date.now() / 1000), 0);
    console.log("📊 Currently vested:", ethers.utils.formatEther(vested), "INQAI");
    
    // Save deployment info
    const vestingInfo = {
      contractAddress: vesting.address,
      tokenAddress: INQAI_ADDRESS,
      beneficiary: TEAM_WALLET,
      totalAllocation: ethers.utils.formatEther(TEAM_ALLOCATION),
      startTime: START_TIME,
      durationSeconds: DURATION_SECONDS,
      durationMonths: 48,
      deployedAt: new Date().toISOString()
    };
    
    const fs = require('fs');
    fs.writeFileSync('team-vesting-deployed.json', JSON.stringify(vestingInfo, null, 2));
    console.log("\n💾 Deployment info saved to team-vesting-deployed.json");
    
    console.log("\n🎊 VESTING SETUP COMPLETE!");
    console.log("📍 Team can now claim vested tokens over 48 months");
    console.log("🔗 Contract:", vesting.address);
    
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
