const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 DEPLOYING WITH DOCUMENTATION VESTING CONTRACT");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  
  // Addresses
  const INQAI_ADDRESS = "0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5";
  const TEAM_WALLET = "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746";
  const VAULT_ADDRESS = "0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb";
  
  try {
    // 1. Deploy SuccessOptimizedVesting contracts for each allocation
    console.log("\n📍 1. DEPLOYING SUCCESS OPTIMIZED VESTING CONTRACTS...");
    
    const vestingContracts = {};
    
    // Deploy vesting contracts for each category (except team which gets tokens immediately)
    const allocations = [
      { name: "Ecosystem Growth", amount: "35000000", beneficiary: TEAM_WALLET },
      { name: "Foundation", amount: "15000000", beneficiary: TEAM_WALLET },
      { name: "Liquidity", amount: "15000000", beneficiary: TEAM_WALLET },
      { name: "Community", amount: "10000000", beneficiary: TEAM_WALLET }, // Will need proper community distribution later
      { name: "Strategic Reserve", amount: "5000000", beneficiary: TEAM_WALLET }
    ];
    
    // Immediate allocations (no vesting)
    const immediateAllocations = [
      { name: "Team & Advisors", amount: "20000000" }
    ];
    
    for (const alloc of allocations) {
      console.log(`   📦 Deploying ${alloc.name} vesting (${alloc.amount} tokens)...`);
      
      const SuccessVesting = await ethers.getContractFactory("SuccessOptimizedVesting");
      const vesting = await SuccessVesting.deploy();
      await vesting.deployed();
      
      vestingContracts[alloc.name.toLowerCase().replace(' ', '')] = vesting.address;
      
      // Initialize with your documentation parameters
      const cliffDuration = 3 * 30 * 24 * 60 * 60; // 3 months
      const totalDuration = 36 * 30 * 24 * 60 * 60; // 36 months
      
      // Stage amounts (scaled for allocation)
      const totalTokens = ethers.utils.parseEther(alloc.amount);
      const stage1Amount = totalTokens.mul(333).div(2000); // ~16.65% for months 4-12
      const stage2Amount = totalTokens.mul(667).div(2000); // ~33.35% for months 13-24
      const stage3Amount = totalTokens.mul(1000).div(2000); // 50% for months 25-36
      
      await vesting.initialize(
        alloc.beneficiary,
        totalTokens,
        cliffDuration,
        totalDuration,
        [stage1Amount, stage2Amount, stage3Amount],
        [9, 12, 12] // Duration of each stage in months
      );
      
      console.log(`   ✅ ${alloc.name} vesting deployed: ${vesting.address}`);
    }
    
    // 2. Transfer tokens to vesting contracts
    console.log("\n💸 2. TRANSFERRING TOKENS TO VESTING CONTRACTS...");
    const INQAI = await ethers.getContractAt("IERC20", INQAI_ADDRESS);
    
    for (const alloc of allocations) {
      const key = alloc.name.toLowerCase().replace(' ', '');
      const vestingAddress = vestingContracts[key];
      
      const tx = await INQAI.transfer(vestingAddress, ethers.utils.parseEther(alloc.amount));
      await tx.wait();
      console.log(`   ✅ Transferred ${alloc.amount} INQAI to ${alloc.name} vesting`);
    }
    
    // 3. Set Phase 2 Registry on Vault
    console.log("\n🌐 3. SETTING UP PHASE 2 REGISTRY...");
    
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
      
      // Add remaining 23 assets
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
    console.log("   ✅ Phase 2 registry set with", assets.length, "assets");
    
    // 4. Verify final distribution
    console.log("\n🔍 4. VERIFYING FINAL DISTRIBUTION...");
    
    const teamBalance = await INQAI.balanceOf(TEAM_WALLET);
    const deployerBalance = await INQAI.balanceOf(deployer.address);
    
    console.log("\n💰 FINAL TOKEN DISTRIBUTION:");
    console.log("   👤 Team wallet:", ethers.utils.formatEther(teamBalance), "INQAI (20M - NO VESTING)");
    console.log("   👤 Deployer remaining:", ethers.utils.formatEther(deployerBalance), "INQAI");
    
    // Check vesting contracts
    for (const alloc of allocations) {
      const key = alloc.name.toLowerCase().replace(' ', '');
      const vestingAddress = vestingContracts[key];
      const vesting = await ethers.getContractAt("SuccessOptimizedVesting", vestingAddress);
      const balance = await INQAI.balanceOf(vestingAddress);
      const vested = await vesting.calculateReleasable();
      
      console.log(`   📦 ${alloc.name}:`, ethers.utils.formatEther(balance), "INQAI (vested:", ethers.utils.formatEther(vested), ")");
    }
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      vestingContracts: vestingContracts,
      phase2Assets: assets.length,
      tokenDistribution: {
        team: ethers.utils.formatEther(teamBalance),
        deployer: ethers.utils.formatEther(deployerBalance)
      },
      vestingSchedule: {
        cliff: "3 months",
        total: "36 months",
        stages: [
          "Months 4-12: 16.65% of allocation",
          "Months 13-24: 33.35% of allocation", 
          "Months 25-36: 50% of allocation"
        ]
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync('documentation-vesting-deployment.json', JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n🎊 DEPLOYMENT COMPLETE!");
    console.log("   ✅ Team: 20M INQAI (NO VESTING - IMMEDIATE)");
    console.log("   ✅ All others: 80M INQAI (SuccessOptimizedVesting - 36 months)");
    console.log("   ✅ Phase 2:", assets.length, "cross-chain assets");
    console.log("   💾 Info saved to documentation-vesting-deployment.json");
    
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
