#!/usr/bin/env node
'use strict';
/**
 * INQUISITIVE — VaultV2 Setup Script
 *
 * Configures InquisitiveVaultV2 for live AI trading:
 *   1. Sets automation enabled = true
 *   2. Adds all Ethereum mainnet ERC-20 tracked assets (Uniswap V3 liquid)
 *
 * Run ONCE from the owner/deployer wallet:
 *   MAINNET_RPC_URL=<rpc> ORACLE_PRIVATE_KEY=<pk> node scripts/setupVaultV2.js
 *
 * After this script completes, register the vault with Chainlink Automation:
 *   → https://automation.chain.link
 *   → "Register new Upkeep" → Custom Logic → paste VaultV2 address
 *   → Fund with at least 5 LINK
 */

const { ethers } = require('ethers');
const path = require('path');

const VAULT_V2 = '0xb99dc519c4373e5017222bbd46f42a4e12a0ec25';
const ABI = require(path.join(__dirname, '../abi-vault-v2.json'));

// All Ethereum mainnet ERC-20 assets with Uniswap V3 liquidity (sorted by market cap)
const TRACKED_ASSETS = [
  { symbol: 'WBTC',  address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
  { symbol: 'WETH',  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
  { symbol: 'LINK',  address: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
  { symbol: 'UNI',   address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
  { symbol: 'AAVE',  address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' },
  { symbol: 'LDO',   address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32' },
  { symbol: 'GRT',   address: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7' },
  { symbol: 'ARB',   address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1' },
  { symbol: 'ENA',   address: '0x57e114B691Db790C35207b2e685D4A43181e6061' },
  { symbol: 'ONDO',  address: '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3' },
  { symbol: 'MKR',   address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2' },
  { symbol: 'ENS',   address: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72' },
  { symbol: 'COMP',  address: '0xc00e94Cb662C3520282E6f5717214004A7f26888' },
  { symbol: 'CRV',   address: '0xD533a949740bb3306d119CC777fa900bA034cd52' },
  { symbol: 'CVX',   address: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B' },
  { symbol: 'BAL',   address: '0xba100000625a3754423978a60c9317c58a424e3D' },
  { symbol: 'SNX',   address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6f' },
  { symbol: 'QNT',   address: '0x4a220E6096B25EADb88358cb44068A3248254675' },
  { symbol: 'RNDR',  address: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24' },
  { symbol: 'FET',   address: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85' },
  { symbol: 'ZRO',   address: '0x6985884C4392D348587B19cb9eAAf157F13271cd' },
  { symbol: 'PAXG',  address: '0x45804880De22913dAFE09f4980848ECE6EcbAf78' },
  { symbol: 'SKY',   address: '0x56072C95FAA701256059aa122697B133aDEd9279' },
  { symbol: 'POL',   address: '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6' },
  { symbol: 'stETH', address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' },
];

async function main() {
  const rpc = process.env.MAINNET_RPC_URL;
  const pk  = process.env.ORACLE_PRIVATE_KEY;

  if (!rpc) { console.error('❌ MAINNET_RPC_URL not set'); process.exit(1); }
  if (!pk)  { console.error('❌ ORACLE_PRIVATE_KEY not set'); process.exit(1); }

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet   = new ethers.Wallet(pk, provider);
  const vault    = new ethers.Contract(VAULT_V2, ABI, wallet);

  const network = await provider.getNetwork();
  if (network.chainId !== 1n) {
    console.error(`❌ Wrong network (chainId=${network.chainId}) — must use Ethereum mainnet`);
    process.exit(1);
  }

  const owner    = await vault.owner();
  const walletAddr = wallet.address;
  if (owner.toLowerCase() !== walletAddr.toLowerCase()) {
    console.error(`❌ Wallet ${walletAddr} is not the vault owner (${owner})`);
    process.exit(1);
  }

  const autoEnabled = await vault.automationEnabled();
  console.log(`\n🏦 VaultV2: ${VAULT_V2}`);
  console.log(`👛 Owner:   ${walletAddr}`);
  console.log(`⚡ Automation currently: ${autoEnabled ? 'ENABLED' : 'DISABLED'}\n`);

  // Step 1: Enable automation
  if (!autoEnabled) {
    console.log('Step 1: Enabling automation...');
    const tx = await vault.setAutomationEnabled(true, { gasLimit: 80_000 });
    console.log(`  TX: ${tx.hash}`);
    await tx.wait(1);
    console.log('  ✅ Automation enabled\n');
  } else {
    console.log('Step 1: Automation already enabled ✓\n');
  }

  // Step 2: Check existing tracked assets
  const existing = await vault.getTrackedAssets();
  const existingLower = existing.map((a) => a.toLowerCase());
  console.log(`Step 2: Adding tracked assets (${existing.length} already tracked)...`);

  let added = 0;
  for (const asset of TRACKED_ASSETS) {
    if (existingLower.includes(asset.address.toLowerCase())) {
      console.log(`  ⏭  ${asset.symbol} — already tracked`);
      continue;
    }
    try {
      const tx = await vault.addTrackedAsset(asset.address, { gasLimit: 120_000 });
      console.log(`  ➕ ${asset.symbol}: ${tx.hash}`);
      await tx.wait(1);
      added++;
    } catch (err) {
      console.error(`  ❌ ${asset.symbol} failed: ${err.message?.slice(0, 80)}`);
    }
  }

  const finalAssets = await vault.getTrackedAssets();
  console.log(`\n✅ Setup complete — ${finalAssets.length} assets tracked (+${added} new)\n`);

  console.log('─────────────────────────────────────────────────────────────');
  console.log('NEXT STEP: Register with Chainlink Automation');
  console.log('  1. Go to → https://automation.chain.link/mainnet');
  console.log('  2. Click "Register New Upkeep" → "Custom Logic"');
  console.log(`  3. Paste vault address: ${VAULT_V2}`);
  console.log('  4. Fund with at least 5 LINK');
  console.log('  5. The vault will now auto-execute trades when signals fire');
  console.log('─────────────────────────────────────────────────────────────\n');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
