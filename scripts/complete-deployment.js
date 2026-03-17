const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 COMPLETE DEPLOYMENT - ALL ON-CHAIN COMPONENTS");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");
  
  // Addresses
  const INQAI_ADDRESS = "0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5";
  const TEAM_WALLET = "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746";
  const VAULT_ADDRESS = "0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb";
  
  try {
    // 1. Deploy Vesting Contracts for all allocations (except team)
    console.log("\n📍 1. DEPLOYING VESTING CONTRACTS...");
    
    const vestingContracts = {};
    
    // Ecosystem Growth - 35M tokens (48 months)
    console.log("   🌱 Deploying Ecosystem Growth vesting (35M tokens)...");
    const EcoVesting = await ethers.getContractFactory("TeamVesting");
    const ecoVesting = await EcoVesting.deploy(
      INQAI_ADDRESS,
      TEAM_WALLET, // Beneficiary
      Math.floor(Date.now() / 1000),
      48 * 30 * 24 * 60 * 60
    );
    await ecoVesting.deployed();
    vestingContracts.ecosystem = ecoVesting.address;
    console.log("   ✅ Ecosystem vesting:", ecoVesting.address);
    
    // Foundation - 15M tokens (48 months)
    console.log("   🏛️ Deploying Foundation vesting (15M tokens)...");
    const FoundVesting = await ethers.getContractFactory("TeamVesting");
    const foundVesting = await FoundVesting.deploy(
      INQAI_ADDRESS,
      TEAM_WALLET,
      Math.floor(Date.now() / 1000),
      48 * 30 * 24 * 60 * 60
    );
    await foundVesting.deployed();
    vestingContracts.foundation = foundVesting.address;
    console.log("   ✅ Foundation vesting:", foundVesting.address);
    
    // Liquidity - 15M tokens (48 months)
    console.log("   💧 Deploying Liquidity vesting (15M tokens)...");
    const LiqVesting = await ethers.getContractFactory("TeamVesting");
    const liqVesting = await LiqVesting.deploy(
      INQAI_ADDRESS,
      TEAM_WALLET,
      Math.floor(Date.now() / 1000),
      48 * 30 * 24 * 60 * 60
    );
    await liqVesting.deployed();
    vestingContracts.liquidity = liqVesting.address;
    console.log("   ✅ Liquidity vesting:", liqVesting.address);
    
    // Community - 10M tokens (48 months)
    console.log("   👥 Deploying Community vesting (10M tokens)...");
    const CommVesting = await ethers.getContractFactory("TeamVesting");
    const commVesting = await CommVesting.deploy(
      INQAI_ADDRESS,
      TEAM_WALLET,
      Math.floor(Date.now() / 1000),
      48 * 30 * 24 * 60 * 60
    );
    await commVesting.deployed();
    vestingContracts.community = commVesting.address;
    console.log("   ✅ Community vesting:", commVesting.address);
    
    // Strategic Reserve - 5M tokens (48 months)
    console.log("   🎯 Deploying Strategic Reserve vesting (5M tokens)...");
    const StratVesting = await ethers.getContractFactory("TeamVesting");
    const stratVesting = await StratVesting.deploy(
      INQAI_ADDRESS,
      TEAM_WALLET,
      Math.floor(Date.now() / 1000),
      48 * 30 * 24 * 60 * 60
    );
    await stratVesting.deployed();
    vestingContracts.strategic = stratVesting.address;
    console.log("   ✅ Strategic vesting:", stratVesting.address);
    
    // 2. Transfer tokens to vesting contracts
    console.log("\n💸 2. TRANSFERRING TOKENS TO VESTING CONTRACTS...");
    const INQAI = await ethers.getContractAt("IERC20", INQAI_ADDRESS);
    
    // Transfer to each vesting contract
    const transfers = [
      { contract: ecoVesting, amount: "35000000", name: "Ecosystem" },
      { contract: foundVesting, amount: "15000000", name: "Foundation" },
      { contract: liqVesting, amount: "15000000", name: "Liquidity" },
      { contract: commVesting, amount: "10000000", name: "Community" },
      { contract: stratVesting, amount: "5000000", name: "Strategic" }
    ];
    
    for (const transfer of transfers) {
      const tx = await INQAI.transfer(transfer.contract.address, ethers.utils.parseEther(transfer.amount));
      await tx.wait();
      console.log(`   ✅ Transferred ${transfer.amount} INQAI to ${transfer.name} vesting`);
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
      
      // Add remaining assets
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
    
    // 4. Verify everything
    console.log("\n🔍 4. VERIFYING DEPLOYMENT...");
    
    // Check final balances
    const teamBalance = await INQAI.balanceOf(TEAM_WALLET);
    const deployerBalance = await INQAI.balanceOf(deployer.address);
    
    // Check vesting balances
    const ecoBalance = await INQAI.balanceOf(ecoVesting.address);
    const foundBalance = await INQAI.balanceOf(foundVesting.address);
    const liqBalance = await INQAI.balanceOf(liqVesting.address);
    const commBalance = await INQAI.balanceOf(commVesting.address);
    const stratBalance = await INQAI.balanceOf(stratVesting.address);
    
    console.log("\n💰 FINAL TOKEN DISTRIBUTION:");
    console.log("   👤 Team wallet:", ethers.utils.formatEther(teamBalance), "INQAI (20M - no vesting)");
    console.log("   👤 Deployer remaining:", ethers.utils.formatEther(deployerBalance), "INQAI");
    console.log("   🌱 Ecosystem vesting:", ethers.utils.formatEther(ecoBalance), "INQAI");
    console.log("   🏛️ Foundation vesting:", ethers.utils.formatEther(foundBalance), "INQAI");
    console.log("   💧 Liquidity vesting:", ethers.utils.formatEther(liqBalance), "INQAI");
    console.log("   👥 Community vesting:", ethers.utils.formatEther(commBalance), "INQAI");
    console.log("   🎯 Strategic vesting:", ethers.utils.formatEther(stratBalance), "INQAI");
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      vestingContracts: vestingContracts,
      phase2Assets: assets.length,
      tokenDistribution: {
        team: ethers.utils.formatEther(teamBalance),
        deployer: ethers.utils.formatEther(deployerBalance),
        ecosystem: ethers.utils.formatEther(ecoBalance),
        foundation: ethers.utils.formatEther(foundBalance),
        liquidity: ethers.utils.formatEther(liqBalance),
        community: ethers.utils.formatEther(commBalance),
        strategic: ethers.utils.formatEther(stratBalance)
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync('complete-deployment.json', JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n🎊 DEPLOYMENT COMPLETE!");
    console.log("   📍 Team: 20M INQAI (no vesting)");
    console.log("   📍 All others: 80M INQAI (48-month vesting)");
    console.log("   📍 Phase 2:", assets.length, "cross-chain assets");
    console.log("   💾 Info saved to complete-deployment.json");
    
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
