const { ethers } = require("hardhat");
const fs = require('fs');

/**
 * INQUISITIVE Platform Deployment
 * 
 * Deploys all 9 ecosystem contracts.
 * ZERO PRIVATE KEYS REQUIRED - Uses MetaMask via Hardhat node.
 * 
 * Usage:
 *   npx hardhat node --fork https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
 *   npx hardhat run scripts/deploy.js --network localhost
 * 
 * Or generate CEX applications:
 *   node scripts/deploy.js --cex
 */

const ADDRESSES = {
  INQAI: "0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5",
  TEAM_WALLET: "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746",
  VAULT: "0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb"
};

// CEX Application Generator
function generateCEXPackages() {
  const PROJECT = {
    name: 'INQUISITIVE',
    ticker: 'INQAI',
    tokenAddress: ADDRESSES.INQAI,
    chain: 'Ethereum (ERC-20)',
    totalSupply: '100,000,000',
    website: 'https://inquisitive.ai',
    description: 'AI-managed asset-backed token representing ownership in 66 digital assets',
    contact: 'team@inquisitive.ai'
  };

  const TIER2 = [
    { name: 'Gate.io', fee: '$0-50K', url: 'https://www.gate.io/listing' },
    { name: 'MEXC', fee: '$0-15K', url: 'https://www.mexc.com/listing' },
    { name: 'Bitget', fee: '$20-50K', url: 'https://www.bitget.com/listing' },
    { name: 'LBank', fee: '$10-30K', url: 'https://www.lbank.com/listing' }
  ];

  const TIER1 = [
    { name: 'Binance', timeline: '3-6 months', url: 'https://www.binance.com/en/support/faq/' },
    { name: 'Coinbase', timeline: '6-12 months', url: 'https://www.coinbase.com/listing' },
    { name: 'Kraken', timeline: '3-6 months', url: 'https://support.kraken.com/' }
  ];

  if (!fs.existsSync('./cex-applications')) {
    fs.mkdirSync('./cex-applications', { recursive: true });
  }

  const generateLetter = (exchange) => `Dear ${exchange.name} Listing Team,

We are applying to list INQUISITIVE (INQAI) on your exchange.

PROJECT: ${PROJECT.name} (${PROJECT.ticker})
Contract: ${PROJECT.tokenAddress}
Chain: ${PROJECT.chain}
Supply: ${PROJECT.totalSupply} (fixed, no minting)

INQAI represents proportional ownership in a professionally managed portfolio of 66 digital assets, continuously optimized by AI systems 24/7.

Key Features:
• Autonomous AI portfolio management
• 60% of fees → buybacks for stakers
• 20% of fees → permanent burns
• Zero private keys in any code
• Chainlink Automation execution

Contact: ${PROJECT.contact}
Website: ${PROJECT.website}

We would be honored to partner with ${exchange.name}.

Best regards,
The INQUISITIVE Team`;

  TIER2.forEach(exchange => {
    fs.writeFileSync(
      `./cex-applications/${exchange.name.toLowerCase().replace(/\./g, '-')}.txt`,
      generateLetter(exchange)
    );
  });

  TIER1.forEach(exchange => {
    fs.writeFileSync(
      `./cex-applications/${exchange.name.toLowerCase()}-roadmap.txt`,
      generateLetter(exchange)
    );
  });

  console.log('CEX applications generated in ./cex-applications/');
}

// Main Deployment
async function deploy() {
  const [deployer] = await ethers.getSigners();
  
  if (deployer.address.toLowerCase() !== ADDRESSES.TEAM_WALLET.toLowerCase()) {
    console.log("⚠️ WARNING: Not using team wallet!");
    console.log("Deployer:", deployer.address);
    console.log("Expected:", ADDRESSES.TEAM_WALLET);
    console.log("Switch MetaMask to team wallet and retry.\n");
    return;
  }

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  INQUISITIVE PLATFORM DEPLOYMENT                               ║");
  console.log("║  Zero Private Keys - MetaMask Only                             ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const deployment = {
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {}
  };

  // Deploy 9 contracts
  const contracts = [
    { name: 'LiquidityLauncher', key: 'liquidityLauncher' },
    { name: 'FeeDistributor', key: 'feeDistributor' },
    { name: 'INQAIStaking', key: 'staking' },
    { name: 'ReferralTracker', key: 'referral' },
    { name: 'INQAIGovernance', key: 'governance' },
    { name: 'INQAIEmergencyBreak', key: 'emergency' },
    { name: 'INQAIInsurance', key: 'insurance' },
    { name: 'INQAITimelock', key: 'timelock' },
    { name: 'INQAIAirdrop', key: 'airdrop' }
  ];

  for (const { name, key } of contracts) {
    console.log(`Deploying ${name}...`);
    const Factory = await ethers.getContractFactory(name, deployer);
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    deployment.contracts[key] = { address, name };
    console.log(`  ✅ ${name}: ${address}`);
  }

  // Connect contracts
  console.log("\nConnecting contracts...");
  
  const { 
    liquidityLauncher, 
    feeDistributor, 
    staking, 
    referral,
    governance,
    emergency,
    insurance,
    timelock,
    airdrop
  } = deployment.contracts;

  // Connect FeeDistributor <-> Staking
  await (await ethers.getContractAt('FeeDistributor', feeDistributor.address)).setStakingContract(staking.address);
  await (await ethers.getContractAt('INQAIStaking', staking.address)).setFeeDistributor(feeDistributor.address);
  console.log("  ✅ FeeDistributor ↔ Staking");

  // Connect Referral <-> Launcher
  await (await ethers.getContractAt('ReferralTracker', referral.address)).setLauncherContract(liquidityLauncher.address);
  console.log("  ✅ Referral ↔ Launcher");

  // Set governance on contracts
  await (await ethers.getContractAt('INQAIStaking', staking.address)).transferOwnership(governance.address);
  await (await ethers.getContractAt('FeeDistributor', feeDistributor.address)).transferOwnership(governance.address);
  console.log("  ✅ Governance ownership set");

  // Save deployment
  fs.writeFileSync('./deployment.json', JSON.stringify(deployment, null, 2));
  
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║  DEPLOYMENT COMPLETE                                           ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");
  
  console.log("Contract Addresses:");
  Object.entries(deployment.contracts).forEach(([key, { address }]) => {
    console.log(`  ${key}: ${address}`);
  });
  
  console.log("\nNext Steps:");
  console.log("1. Approve 25K INQAI to LiquidityLauncher");
  console.log("2. Fund 5K INQAI to ReferralTracker");
  console.log("3. Update .env with new addresses");
  console.log("4. Register Chainlink Automation");
  console.log("\nSaved to: deployment.json");
}

// CLI
if (process.argv.includes('--cex')) {
  generateCEXPackages();
} else {
  deploy().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { deploy, generateCEXPackages };
