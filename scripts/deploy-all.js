const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 DEPLOYING ALL ON-CHAIN COMPONENTS...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");
  
  // Addresses
  const INQAI_ADDRESS = "0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5";
  const TEAM_WALLET = "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746";
  const VAULT_ADDRESS = "0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb";
  
  try {
    // 1. Deploy Team Vesting Contract
    console.log("\n📍 1. DEPLOYING TEAM VESTING CONTRACT...");
    const TeamVesting = await ethers.getContractFactory("TeamVesting");
    const vesting = await TeamVesting.deploy(
      INQAI_ADDRESS,
      TEAM_WALLET,
      Math.floor(Date.now() / 1000), // Start now
      48 * 30 * 24 * 60 * 60 // 48 months
    );
    await vesting.deployed();
    console.log("✅ Vesting contract:", vesting.address);
    
    // 2. Transfer 20M INQAI to vesting
    console.log("\n💸 2. TRANSFERRING 20M INQAI TO VESTING...");
    const INQAI = await ethers.getContractAt("IERC20", INQAI_ADDRESS);
    
    const transferTx = await INQAI.transfer(vesting.address, ethers.utils.parseEther("20000000"));
    await transferTx.wait();
    console.log("✅ 20M INQAI transferred to vesting contract");
    
    // 3. Set Phase 2 Registry on Vault
    console.log("\n🌐 3. SETTING UP PHASE 2 REGISTRY...");
    
    // Phase 2 assets (simplified for deployment)
    const phase2Assets = [
      // Solana
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 101, receiver: "0x7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk", weightBps: 4000, symbol: "SOL" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 101, receiver: "0x7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk", weightBps: 2000, symbol: "JUP" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 101, receiver: "0x7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk", weightBps: 1500, symbol: "jitoSOL" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 101, receiver: "0x7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk", weightBps: 1000, symbol: "jupSOL" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 101, receiver: "0x7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk", weightBps: 800, symbol: "HONEY" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 101, receiver: "0x7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk", weightBps: 500, symbol: "HNT" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 101, receiver: "0x7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk", weightBps: 200, symbol: "INF" },
      
      // BSC
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 56, receiver: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746", weightBps: 5000, symbol: "BNB" },
      
      // Avalanche
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 43114, receiver: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746", weightBps: 5000, symbol: "AVAX" },
      
      // Optimism
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 10, receiver: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746", weightBps: 5000, symbol: "OP" },
      
      // Add remaining assets with default values for deployment
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 728126428, receiver: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746", weightBps: 5000, symbol: "TRX" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 999, receiver: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746", weightBps: 2500, symbol: "HYPE" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 61, receiver: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746", weightBps: 2500, symbol: "ETC" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 50, receiver: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746", weightBps: 2500, symbol: "XDC" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 100009, receiver: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746", weightBps: 2500, symbol: "VET" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 1440002, receiver: "0x726970706C6572", weightBps: 5000, symbol: "XRP" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 1815, receiver: "0x6164647231", weightBps: 4000, symbol: "ADA" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 1815, receiver: "0x6164647231", weightBps: 1000, symbol: "NIGHT" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 145, receiver: "0x626974636F696E636173683A71", weightBps: 5000, symbol: "BCH" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 128, receiver: "0x34", weightBps: 5000, symbol: "XMR" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 100024, receiver: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746", weightBps: 5000, symbol: "CC" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 148, receiver: "0x47", weightBps: 5000, symbol: "XLM" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 133, receiver: "0x7431", weightBps: 5000, symbol: "ZEC" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 189, receiver: "0x6c746331", weightBps: 5000, symbol: "LTC" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 129, receiver: "0x302E30", weightBps: 5000, symbol: "HBAR" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 787, receiver: "0x3078", weightBps: 5000, symbol: "SUI" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 0, receiver: "0x31", weightBps: 5000, symbol: "DOT" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 314, receiver: "0x6631", weightBps: 5000, symbol: "FIL" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 0, receiver: "0x58585858", weightBps: 5000, symbol: "ICP" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 416, receiver: "0x41414141", weightBps: 5000, symbol: "ALGO" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 1729, receiver: "0x747a31", weightBps: 5000, symbol: "XTZ" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 999, receiver: "0x6D796163636F756E74", weightBps: 5000, symbol: "A" },
      { tokenAddr: "0x0000000000000000000000000000000000000000", chainId: 466, receiver: "0x4172", weightBps: 5000, symbol: "AR" }
    ];
    
    // Convert to proper format
    const assets = phase2Assets.map(asset => ({
      tokenAddr: ethers.utils.hexlify(ethers.utils.zeroPad(asset.tokenAddr, 32)),
      chainId: asset.chainId,
      receiver: ethers.utils.hexlify(ethers.utils.zeroPad(asset.receiver, 32)),
      weightBps: asset.weightBps,
      symbol: asset.symbol
    }));
    
    // Connect to vault
    const vault = new ethers.Contract(VAULT_ADDRESS, [
      {
        "inputs": [{"components": [
          {"name": "tokenAddr", "type": "bytes"},
          {"name": "chainId", "type": "uint256"},
          {"name": "receiver", "type": "bytes"},
          {"name": "weightBps", "type": "uint256"},
          {"name": "symbol", "type": "string"}
        ], "name": "assets", "type": "tuple[]"}],
        "name": "setPhase2Registry",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ], deployer);
    
    const phase2Tx = await vault.setPhase2Registry(assets);
    await phase2Tx.wait();
    console.log("✅ Phase 2 registry set with", assets.length, "assets");
    
    // 4. Verify everything
    console.log("\n🔍 4. VERIFYING DEPLOYMENT...");
    
    const vestingBalance = await INQAI.balanceOf(vesting.address);
    const teamBalance = await INQAI.balanceOf(TEAM_WALLET);
    const deployerBalance = await INQAI.balanceOf(deployer.address);
    
    console.log("💰 Vesting contract balance:", ethers.utils.formatEther(vestingBalance), "INQAI");
    console.log("💼 Team wallet balance:", ethers.utils.formatEther(teamBalance), "INQAI");
    console.log("👤 Deployer remaining balance:", ethers.utils.formatEther(deployerBalance), "INQAI");
    
    // Check vested amount
    const vested = await vesting.vestedAmount(Math.floor(Date.now() / 1000), 0);
    console.log("📊 Currently vested (should be ~416K INQAI per month):", ethers.utils.formatEther(vested), "INQAI");
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      vestingContract: vesting.address,
      phase2Assets: assets.length,
      vestingBalance: ethers.utils.formatEther(vestingBalance),
      teamBalance: ethers.utils.formatEther(teamBalance),
      deployerBalance: ethers.utils.formatEther(deployerBalance)
    };
    
    const fs = require('fs');
    fs.writeFileSync('deployment-complete.json', JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n🎊 DEPLOYMENT COMPLETE!");
    console.log("📍 Vesting contract:", vesting.address);
    console.log("🌐 Phase 2 assets:", assets.length);
    console.log("💾 Info saved to deployment-complete.json");
    
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
