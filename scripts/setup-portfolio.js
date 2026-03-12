// scripts/setup-portfolio.js
// ────────────────────────────────────────────────────────────────────────────
// Stores the 65-asset portfolio weights + Ethereum mainnet token addresses
// on-chain in the InquisitiveVault in a single transaction.
//
// Run (dry-run, shows output but does NOT send tx):
//   node scripts/setup-portfolio.js
//
// Run (send live transaction):
//   DEPLOYER_PRIVATE_KEY=0x... node scripts/setup-portfolio.js --send
//
// Or with Hardhat:
//   npx hardhat run scripts/setup-portfolio.js --network mainnet
// ────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const { ethers } = require('ethers');

const VAULT_ADDRESS = process.env.INQUISITIVE_VAULT_ADDRESS || '0x506F72eABc90793ae8aC788E650bC9407ED853Fa';
const RPC_URLS = [
  process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
];

const VAULT_ABI = [
  'function setPortfolio(address[] calldata _tokens, uint256[] calldata _weights, uint24[] calldata _fees) external',
  'function getPortfolioLength() external view returns (uint256)',
  'function owner() external view returns (address)',
  'function portfolioTokens(uint256) external view returns (address)',
  'function portfolioWeights(uint256) external view returns (uint256)',
];

// ── Token map: symbol → Ethereum mainnet ERC-20 address + Uniswap V3 pool fee
// Assets WITHOUT a liquid ERC-20 on Ethereum mainnet are mapped to null.
// Their portfolio weight is redistributed proportionally to available assets.
//
// Addresses verified against Etherscan mainnet:
const TOKEN_ADDRESSES = {
  // ── BTC proxy ─────────────────────────────────────────────────────────────
  BTC:     { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', fee: 3000,  note: 'WBTC'                         },

  // ── ETH — Lido stETH (rebasing 1:1 with ETH in USD, earns staking yield) ──
  ETH:     { address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', fee: 100,   note: 'stETH (Lido, 1:1 ETH price, rebasing)'  },

  // ── Stablecoins ───────────────────────────────────────────────────────────
  USDC:    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', fee: 500,   note: 'USDC'                          },

  // ── DeFi ─────────────────────────────────────────────────────────────────
  AAVE:    { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', fee: 3000,  note: 'AAVE'                          },
  UNI:     { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', fee: 3000,  note: 'UNI'                           },
  LDO:     { address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', fee: 3000,  note: 'LDO (Lido DAO)'                },
  ARB:     { address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1', fee: 3000,  note: 'ARB (Arbitrum)'                },
  INJ:     { address: '0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30', fee: 3000,  note: 'INJ (Injective)'               },
  GRT:     { address: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7', fee: 3000,  note: 'GRT (The Graph)'              },
  ENA:     { address: '0x57e114B691Db790C35207b2e685D4A43181e6061', fee: 3000,  note: 'ENA (Ethena)'                  },
  POL:     { address: '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6', fee: 3000,  note: 'POL (Polygon)'                 },
  SKY:     { address: '0x56072C95FAA701256059aa122697B133aDEd9279', fee: 3000,  note: 'SKY (Sky/MakerDAO)'            },

  // ── AI / Data ─────────────────────────────────────────────────────────────
  FET:     { address: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85', fee: 3000,  note: 'FET (ASI Alliance)'            },
  RNDR:    { address: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24', fee: 3000,  note: 'RNDR (Render)'                 },
  LINK:    { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', fee: 3000,  note: 'LINK (Chainlink)'              },

  // ── RWA ───────────────────────────────────────────────────────────────────
  PAXG:    { address: '0x45804880De22913dAFE09f4980848ECE6EcbAf78', fee: 3000,  note: 'PAXG (gold-backed)'            },
  ONDO:    { address: '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3', fee: 3000,  note: 'ONDO'                          },

  // ── Interop ───────────────────────────────────────────────────────────────
  QNT:     { address: '0x4a220E6096B25EADb88358cb44068A3248254675', fee: 3000,  note: 'QNT (Quant)'                   },
  ZRO:     { address: '0x6985884C4392D348587B19cb9eAAf157F13271cD', fee: 3000,  note: 'ZRO (LayerZero)'               },

  // ── Entertainment ─────────────────────────────────────────────────────────
  CHZ:     { address: '0x3506424F91fD33084466F402d5D97f05F8e3b4AF', fee: 3000,  note: 'CHZ (Chiliz)'                  },

  // ── Payment ───────────────────────────────────────────────────────────────
  ACH:     { address: '0x4e15361FD6b4BB609Fa63C81A2be19d873717870', fee: 3000,  note: 'ACH (Alchemy Pay)'             },

  // ── Assets with NO liquid ERC-20 on Ethereum mainnet ─────────────────────
  // Weight is redistributed proportionally across the available assets above.
  BNB:     null,  // BSC-native
  XRP:     null,  // XRP Ledger-native
  SOL:     null,  // Solana-native
  ADA:     null,  // Cardano-native
  TRX:     null,  // Tron-native
  HBAR:    null,  // Hedera-native
  AVAX:    null,  // Avalanche-native
  SUI:     null,  // Sui-native
  DOT:     null,  // Polkadot-native
  NEAR:    null,  // NEAR-native
  ICP:     null,  // Internet Computer-native
  HYPE:    null,  // Hyperliquid chain
  XMR:     null,  // Monero (no ERC-20)
  ZEC:     null,  // Zcash (no ERC-20)
  XTZ:     null,  // Tezos-native
  ALGO:    null,  // Algorand-native
  FIL:     null,  // Filecoin-native (negligible mainnet liquidity)
  VET:     null,  // VeChain-native
  ETC:     null,  // Ethereum Classic (no mainnet ERC-20)
  LTC:     null,  // Litecoin (no liquid wrapped version)
  BCH:     null,  // Bitcoin Cash (no liquid wrapped version)
  XLM:     null,  // Stellar-native
  HNT:     null,  // Helium-native
  STRK:    { address: '0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766', fee: 3000, note: 'STRK (Starknet bridged ERC-20)' },
  OP:      null,  // Optimism-native L2 token
  TAO:     null,  // Bittensor-native
  JUP:     null,  // Solana-native (Jupiter)
  ATOM:    null,  // Cosmos IBC (negligible mainnet liquidity)
  EOS:     null,  // EOS-native
  AR:      null,  // Arweave-native
  XDC:     null,  // XDC-native
  DBR:     null,  // deBridge (very low liquidity)
  HONEY:   null,  // Hivemapper (very low liquidity)
  XSGD:    null,  // XSGD (very low liquidity)
  SOIL:    null,  // Soil (very low liquidity)
  BRZ:     null,  // BRZ (very low liquidity)
  JPYC:    null,  // JPYC (very low liquidity)
  FDUSD:   null,  // First Digital USD (BNB-chain primary)
  CC:      null,  // Canton Network (no ERC-20)
  PYTH:    null,  // Pyth Network (Solana-native)
  JITOSOL: null,  // Solana-native (Jito staked SOL)
  JUPSOL:  null,  // Solana-native (Jupiter staked SOL)
  MNDE:    null,  // Marinade (Solana-native)
  STX:     null,  // Stacks (Bitcoin L2, low ETH liquidity)
};

// ── Portfolio weights from _brain.ts (percentage, will be scaled to bps) ────
const PORTFOLIO_WEIGHTS = {
  BTC:18, ETH:12, SOL:8, BNB:5, XRP:4, ADA:3, AVAX:3, SUI:2, DOT:2, NEAR:1, ICP:1, TRX:1,
  AAVE:2, UNI:2, LDO:1.5, ARB:1.5, OP:1, INJ:1, JUP:1, ENA:1, HYPE:1, SKY:0.5, GRT:0.5,
  FET:1, RNDR:1, TAO:1, POL:1, LINK:1, STRK:0.5,
  USDC:3, PAXG:1.5, ONDO:1, XLM:0.5, LTC:0.5, BCH:0.5, HBAR:0.5, ZEC:0.25, XMR:0.25,
  ETC:0.5, XTZ:0.25, CHZ:0.25, HNT:0.25, VET:0.25, QNT:0.25, ALGO:0.25, FIL:0.25, AR:0.25,
  XDC:0.1, ZRO:0.25, ATOM:0.25, DBR:0.1, ACH:0.1, EOS:0.1, HONEY:0.1, XSGD:0.1, SOIL:0.1,
  BRZ:0.1, JPYC:0.1, FDUSD:0.1, JITOSOL:0.5, JUPSOL:0.5, MNDE:0.5, CC:0.1, PYTH:0.1, STX:0.1,
};

function buildPortfolioArrays() {
  // 1. Separate available vs skipped assets
  const available = {};
  const skipped   = {};
  let availableSum = 0;
  let skippedSum   = 0;

  for (const [symbol, weight] of Object.entries(PORTFOLIO_WEIGHTS)) {
    if (TOKEN_ADDRESSES[symbol]) {
      available[symbol]  = weight;
      availableSum      += weight;
    } else {
      skipped[symbol]    = weight;
      skippedSum        += weight;
    }
  }

  const totalOriginal = availableSum + skippedSum;

  // 2. Scale available weights to 10000 basis points
  const bpsWeights = {};
  let   bpsSum     = 0;
  const symbols    = Object.keys(available);

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    const raw = (available[sym] / availableSum) * 10000;
    // Use floor for all but last; assign remainder to last
    bpsWeights[sym] = (i < symbols.length - 1) ? Math.floor(raw) : 0;
    bpsSum         += bpsWeights[sym];
  }
  // Give remainder to last asset so sum = exactly 10000
  bpsWeights[symbols[symbols.length - 1]] = 10000 - bpsSum;

  // 3. Build arrays for setPortfolio()
  const tokens  = [];
  const weights = [];
  const fees    = [];

  for (const sym of symbols) {
    const info = TOKEN_ADDRESSES[sym];
    tokens.push(info.address);
    weights.push(bpsWeights[sym]);
    fees.push(info.fee);
  }

  return {
    tokens,
    weights,
    fees,
    available,
    skipped,
    availableSum,
    skippedSum,
    totalOriginal,
    bpsWeights,
    symbols,
  };
}

async function main() {
  const send      = process.argv.includes('--send');
  const portfolio = buildPortfolioArrays();

  // ── Print summary ─────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  INQUISITIVE Vault — Portfolio Setup');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`\n  Vault:          ${VAULT_ADDRESS}`);
  console.log(`  Assets mapped:  ${portfolio.symbols.length} (Ethereum mainnet ERC-20)`);
  console.log(`  Assets skipped: ${Object.keys(portfolio.skipped).length} (cross-chain, redistributed)`);
  console.log(`  Weight coverage:${portfolio.availableSum.toFixed(2)}% of ${portfolio.totalOriginal.toFixed(2)}% total`);
  console.log(`  Redistributed:  ${portfolio.skippedSum.toFixed(2)}% from cross-chain assets`);

  console.log('\n── Mapped assets ─────────────────────────────────────────────');
  for (const sym of portfolio.symbols) {
    const info = TOKEN_ADDRESSES[sym];
    const bps  = portfolio.bpsWeights[sym];
    const pct  = (bps / 100).toFixed(2);
    console.log(`  ${sym.padEnd(8)} ${pct.padStart(6)}%  (${bps} bps)  ${info.address}  [${info.note}]`);
  }
  const bpsTotal = portfolio.weights.reduce((a, b) => a + b, 0);
  console.log(`\n  Total basis points: ${bpsTotal} (must be 10000) ✓`);

  console.log('\n── Skipped assets (cross-chain, no ETH mainnet ERC-20) ───────');
  for (const [sym, w] of Object.entries(portfolio.skipped)) {
    console.log(`  ${sym.padEnd(8)} original weight: ${w}%  → redistributed`);
  }

  // ── Gas estimate ──────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');

  if (!send) {
    console.log('\n  DRY RUN — transaction NOT sent.');
    console.log('  Re-run with: DEPLOYER_PRIVATE_KEY=0x... node scripts/setup-portfolio.js --send\n');
    return;
  }

  // ── Connect ───────────────────────────────────────────────────────────────
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('\n  ERROR: Set DEPLOYER_PRIVATE_KEY env var (the vault owner / deployer wallet)');
    process.exit(1);
  }

  let provider = null;
  for (const url of RPC_URLS) {
    try {
      const p = new ethers.JsonRpcProvider(url);
      await p.getBlockNumber();
      provider = p;
      console.log(`\n  Connected to: ${url}`);
      break;
    } catch {}
  }
  if (!provider) { console.error('  ERROR: All RPC endpoints failed'); process.exit(1); }

  const deployer = new ethers.Wallet(privateKey, provider);
  const vault    = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, deployer);

  // ── Verify ownership ──────────────────────────────────────────────────────
  const owner = await vault.owner().catch(() => 'unknown');
  console.log(`  Caller address: ${deployer.address}`);
  console.log(`  Vault owner:    ${owner}`);
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error(`\n  ERROR: Caller is NOT the vault owner. Only ${owner} can call setPortfolio().`);
    process.exit(1);
  }

  // ── Check existing portfolio ───────────────────────────────────────────────
  const existingLen = await vault.getPortfolioLength().catch(() => 0n);
  if (existingLen > 0n) {
    console.log(`\n  WARNING: Vault already has ${existingLen} assets. This will REPLACE the existing portfolio.`);
  }

  // ── Send transaction ──────────────────────────────────────────────────────
  console.log('\n  Sending setPortfolio() transaction...');
  const gasEstimate = await vault.setPortfolio.estimateGas(
    portfolio.tokens, portfolio.weights, portfolio.fees
  );
  const feeData = await provider.getFeeData();
  const tx = await vault.setPortfolio(
    portfolio.tokens,
    portfolio.weights,
    portfolio.fees,
    {
      gasLimit:             gasEstimate * 130n / 100n, // +30% buffer
      maxFeePerGas:         feeData.maxFeePerGas     ? feeData.maxFeePerGas * 120n / 100n : undefined,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
    }
  );
  console.log(`  Tx sent: ${tx.hash}`);
  console.log(`  Etherscan: https://etherscan.io/tx/${tx.hash}`);

  const receipt = await tx.wait(1);
  console.log(`\n  ✅ Portfolio set on-chain!`);
  console.log(`  Block:    ${receipt.blockNumber}`);
  console.log(`  Gas used: ${receipt.gasUsed.toString()}`);
  console.log(`  Assets:   ${portfolio.symbols.length}`);
  console.log('\n  Next steps:');
  console.log('  1. Add EXECUTOR_PRIVATE_KEY to Vercel env vars (see /api/execute/auto comments)');
  console.log('  2. Call vault.setAIExecutor(executorAddress) from this deployer wallet');
  console.log('  3. Deploy to Vercel — Cron will call performUpkeep every 60 seconds automatically\n');
}

main().catch(e => { console.error(e); process.exit(1); });
