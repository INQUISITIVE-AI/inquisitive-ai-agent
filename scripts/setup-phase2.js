const { ethers } = require("hardhat");
require("dotenv").config();

// Phase 2 asset definitions
const PHASE2_ASSETS = [
  // Solana
  { symbol: 'SOL', chainId: 101, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk', weightBps: 4000 },
  { symbol: 'JUP', chainId: 101, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk', weightBps: 2000 },
  { symbol: 'jitoSOL', chainId: 101, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk', weightBps: 1500 },
  { symbol: 'jupSOL', chainId: 101, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk', weightBps: 1000 },
  { symbol: 'HONEY', chainId: 101, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk', weightBps: 800 },
  { symbol: 'HNT', chainId: 101, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk', weightBps: 500 },
  { symbol: 'INF', chainId: 101, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk', weightBps: 200 },
  
  // BSC
  { symbol: 'BNB', chainId: 56, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746', weightBps: 5000 },
  
  // Avalanche
  { symbol: 'AVAX', chainId: 43114, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746', weightBps: 5000 },
  
  // Optimism
  { symbol: 'OP', chainId: 10, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746', weightBps: 5000 },
  
  // TRON
  { symbol: 'TRX', chainId: 728126428, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746', weightBps: 5000 },
  
  // EVM-alt chains
  { symbol: 'HYPE', chainId: 999, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746', weightBps: 2500 },
  { symbol: 'ETC', chainId: 61, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746', weightBps: 2500 },
  { symbol: 'XDC', chainId: 50, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746', weightBps: 2500 },
  { symbol: 'VET', chainId: 100009, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746', weightBps: 2500 },
  
  // XRP Ledger
  { symbol: 'XRP', chainId: 1440002, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: 'rXXX...', weightBps: 5000 },
  
  // Cardano
  { symbol: 'ADA', chainId: 1815, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: 'addr1...', weightBps: 4000 },
  { symbol: 'NIGHT', chainId: 1815, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: 'addr1...', weightBps: 1000 },
  
  // Other chains
  { symbol: 'BCH', chainId: 145, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: 'bitcoincash:q...', weightBps: 5000 },
  { symbol: 'XMR', chainId: 128, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '4...', weightBps: 5000 },
  { symbol: 'CC', chainId: 100024, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746', weightBps: 5000 },
  { symbol: 'XLM', chainId: 148, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: 'GXXX...', weightBps: 5000 },
  { symbol: 'ZEC', chainId: 133, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: 't1...', weightBps: 5000 },
  { symbol: 'LTC', chainId: 189, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: 'ltc1...', weightBps: 5000 },
  { symbol: 'HBAR', chainId: 129, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '0.0.XXXX', weightBps: 5000 },
  { symbol: 'SUI', chainId: 787, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '0x...', weightBps: 5000 },
  { symbol: 'DOT', chainId: 0, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: '1...', weightBps: 5000 },
  { symbol: 'FIL', chainId: 314, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: 'f1...', weightBps: 5000 },
  { symbol: 'ICP', chainId: 0, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: 'XXXX-XXXX-XXXX-XXXX', weightBps: 5000 },
  { symbol: 'ALGO', chainId: 416, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: 'AAAA...', weightBps: 5000 },
  { symbol: 'XTZ', chainId: 1729, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: 'tz1...', weightBps: 5000 },
  { symbol: 'A', chainId: 999, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: 'myaccount', weightBps: 5000 },
  { symbol: 'AR', chainId: 466, tokenAddr: '0x0000000000000000000000000000000000000000', receiver: 'ArXXX...', weightBps: 5000 }
];

async function main() {
  console.log("🌐 Setting up Phase 2 Registry on Vault...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Using account:", deployer.address);
  
  // New vault address (Chainlink integrated)
  const VAULT_ADDRESS = "0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb";
  
  // Vault ABI (only setPhase2Registry function)
  const VAULT_ABI = [
    {
      "inputs": [
        {
          "components": [
            {"name": "tokenAddr", "type": "bytes"},
            {"name": "chainId", "type": "uint256"},
            {"name": "receiver", "type": "bytes"},
            {"name": "weightBps", "type": "uint256"},
            {"name": "symbol", "type": "string"}
          ],
          "name": "assets",
          "type": "tuple[]"
        }
      ],
      "name": "setPhase2Registry",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  try {
    // Connect to vault
    const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, deployer);
    
    // Convert assets to required format
    const assets = PHASE2_ASSETS.map(asset => ({
      tokenAddr: ethers.utils.hexlify(ethers.utils.zeroPad(asset.tokenAddr, 32)),
      chainId: asset.chainId,
      receiver: ethers.utils.hexlify(ethers.utils.zeroPad(asset.receiver, 32)),
      weightBps: asset.weightBps,
      symbol: asset.symbol
    }));
    
    console.log(`\n📦 Registering ${assets.length} Phase 2 assets...`);
    
    // Call setPhase2Registry
    const tx = await vault.setPhase2Registry(assets);
    console.log("📤 Transaction submitted:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Phase 2 registry set successfully!");
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    
    // Verify
    const vaultWithRead = new ethers.Contract(VAULT_ADDRESS, [
      {"name": "getPhase2Length", "type": "function", "stateMutability": "view", "inputs": [], "outputs": [{"type": "uint256"}]}
    ], deployer);
    
    const phase2Length = await vaultWithRead.getPhase2Length();
    console.log("📊 Phase 2 assets registered:", phase2Length.toString());
    
    console.log("\n🎊 PHASE 2 SETUP COMPLETE!");
    
  } catch (error) {
    console.error("❌ Phase 2 setup failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
