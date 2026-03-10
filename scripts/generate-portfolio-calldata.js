// scripts/generate-portfolio-calldata.js
// ────────────────────────────────────────────────────────────────────────────
// Generates the exact arrays for vault.setPortfolio() — NO private key needed.
//
// Architecture:
//   PHASE 1 (THIS SCRIPT): 22 ETH-mainnet ERC-20s — direct Uniswap V3 execution.
//                          Weights = their DIRECT portfolio allocation, re-normalized.
//   PHASE 2 (COMING):      43 cross-chain assets — deBridge DLN bridge execution.
//                          Each asset executes on its NATIVE chain at NATIVE price.
//                          NO PROXY — SOL is SOL, BNB is BNB, ADA is ADA.
//
// The NAV endpoint already tracks ALL 65 assets at their native prices.
// setPortfolio() configures the vault for Phase 1 (ETH mainnet) execution.
//
// Usage:  node scripts/generate-portfolio-calldata.js
// ────────────────────────────────────────────────────────────────────────────

// ── 22 verified ETH mainnet ERC-20s with Uniswap V3 liquidity ────────────────
const DIRECT_TOKENS = {
  BTC:  { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', fee: 3000, note: 'WBTC (Bitcoin)' },
  ETH:  { address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', fee: 500,  note: 'wstETH (Lido Staked ETH)' },
  USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', fee: 500,  note: 'USD Coin' },
  AAVE: { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', fee: 3000, note: 'Aave' },
  UNI:  { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', fee: 3000, note: 'Uniswap' },
  LINK: { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', fee: 3000, note: 'Chainlink' },
  LDO:  { address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', fee: 3000, note: 'Lido DAO' },
  ARB:  { address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1', fee: 3000, note: 'Arbitrum' },
  GRT:  { address: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7', fee: 3000, note: 'The Graph' },
  ENA:  { address: '0x57e114B691Db790C35207b2e685D4A43181e6061', fee: 3000, note: 'Ethena' },
  POL:  { address: '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6', fee: 3000, note: 'Polygon' },
  SKY:  { address: '0x56072C95FAA701256059aa122697B133aDEd9279', fee: 3000, note: 'Sky' },
  FET:  { address: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85', fee: 3000, note: 'ASI Alliance (FET)' },
  RNDR: { address: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24', fee: 3000, note: 'Render Network' },
  INJ:  { address: '0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30', fee: 3000, note: 'Injective' },
  PAXG: { address: '0x45804880De22913dAFE09f4980848ECE6EcbAf78', fee: 3000, note: 'PAX Gold (RWA)' },
  ONDO: { address: '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3', fee: 3000, note: 'Ondo Finance (RWA)' },
  QNT:  { address: '0x4a220E6096B25EADb88358cb44068A3248254675', fee: 3000, note: 'Quant' },
  ZRO:  { address: '0x6985884C4392D348587B19cb9eAAf157F13271cD', fee: 3000, note: 'LayerZero' },
  CHZ:  { address: '0x3506424F91fD33084466F402d5D97f05F8e3b4AF', fee: 3000, note: 'Chiliz' },
  ACH:  { address: '0x4e15361FD6b4BB609Fa63C81A2be19d873717870', fee: 3000, note: 'Alchemy Pay' },
  STRK: { address: '0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766', fee: 3000, note: 'Starknet' },
};

// ── All 65 raw portfolio weights (from _brain.ts PORTFOLIO_WEIGHTS) ───────────
const ALL_WEIGHTS = {
  // Tier 1 — Core (60%)
  BTC:18, ETH:12, SOL:8, BNB:5, XRP:4, ADA:3, AVAX:3, SUI:2, DOT:2, NEAR:1, ICP:1, TRX:1,
  // Tier 2 — DeFi (20%)
  AAVE:2, UNI:2, LDO:1.5, ARB:1.5, OP:1, INJ:1, JUP:1, ENA:1, HYPE:1, SKY:0.5, GRT:0.5,
  FET:1, RNDR:1, TAO:1, POL:1, LINK:1, STRK:0.5,
  // Tier 3 — Diversified (20%)
  USDC:3, PAXG:1.5, ONDO:1, XLM:0.5, LTC:0.5, BCH:0.5, HBAR:0.5, ZEC:0.25, XMR:0.25,
  ETC:0.5, XTZ:0.25, CHZ:0.25, HNT:0.25, VET:0.25, QNT:0.25, ALGO:0.25, FIL:0.25, AR:0.25,
  XDC:0.1, ZRO:0.25, ATOM:0.25, DBR:0.1, ACH:0.1, EOS:0.1, HONEY:0.1, XSGD:0.1, SOIL:0.1,
  BRZ:0.1, JPYC:0.1, CNGN:0.1, JITOSOL:0.5, JUPSOL:0.5, INF:0.5, CC:0.1, NIGHT:0.1, XCN:0.1,
};

// ── Phase 1: ETH mainnet assets (direct Uniswap V3) ───────────────────────────
// Phase 2 will add: SOL/BNB/AVAX/etc. via deBridge DLN on their native chains.
// NO PROXY — each asset tracked at its own native price.
const ETH_NATIVE_SYMBOLS = Object.keys(DIRECT_TOKENS);

// Direct weights only (NOT combined with cross-chain assets)
const directWeights = {};
for (const sym of ETH_NATIVE_SYMBOLS) {
  directWeights[sym] = ALL_WEIGHTS[sym] || 0;
}

// Re-normalize direct weights to sum to 10000 bps
const directWeightSum = Object.values(directWeights).reduce((s, w) => s + w, 0);
const sortedSymbols = ETH_NATIVE_SYMBOLS.sort((a, b) => directWeights[b] - directWeights[a]);

const tokens  = [];
const weights = [];
const fees    = [];
let bpsRunning = 0;

for (let i = 0; i < sortedSymbols.length; i++) {
  const sym  = sortedSymbols[i];
  const info = DIRECT_TOKENS[sym];
  const bps  = i < sortedSymbols.length - 1
    ? Math.floor((directWeights[sym] / directWeightSum) * 10000)
    : (10000 - bpsRunning);
  tokens.push(info.address);
  weights.push(bps);
  fees.push(info.fee);
  bpsRunning += bps;
}

// Cross-chain assets (Phase 2 — deBridge DLN, native prices, no proxy)
const PHASE2_ASSETS = Object.keys(ALL_WEIGHTS).filter(s => !ETH_NATIVE_SYMBOLS.includes(s));
const phase2Weight  = PHASE2_ASSETS.reduce((s, sym) => s + (ALL_WEIGHTS[sym] || 0), 0);
const totalWeight   = Object.values(ALL_WEIGHTS).reduce((s, w) => s + w, 0);

// ── Output ─────────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════════');
console.log('  INQUISITIVE — setPortfolio() Calldata  |  Phase 1: ETH Mainnet');
console.log('  22 ETH-native tokens · 43 cross-chain (Phase 2: deBridge DLN)');
console.log('════════════════════════════════════════════════════════════════════\n');

console.log('── How to use (NO private key required) ─────────────────────────');
console.log('1. Go to: https://etherscan.io/address/0x506F72eABc90793ae8aC788E650bC9407ED853Fa#writeContract');
console.log('2. Click "Connect to Web3" → connect MetaMask (deployer wallet)');
console.log('3. Expand "setPortfolio" function');
console.log('4. Paste the arrays below into the 3 fields');
console.log('5. Click "Write" and confirm in MetaMask\n');

console.log('── _tokens (address[]) ───────────────────────────────────────────');
console.log('[' + tokens.join(',') + ']\n');

console.log('── _weights (uint256[]) — Phase 1 ETH-native weights in bps ──────');
console.log('[' + weights.join(',') + ']\n');

console.log('── _fees (uint24[]) ──────────────────────────────────────────────');
console.log('[' + fees.join(',') + ']\n');

const bpsTotal = weights.reduce((a, b) => a + b, 0);
console.log('── Verification ──────────────────────────────────────────────────');
console.log('Phase 1 assets (ETH vault):    ' + tokens.length + '  (direct Uniswap V3)');
console.log('Phase 2 assets (bridge queue): ' + PHASE2_ASSETS.length + '  (deBridge DLN → native chains)');
console.log('Weight sum (bps):              ' + bpsTotal + ' (must be 10000)');
console.log('Phase 1 portfolio coverage:    ' + (directWeightSum / totalWeight * 100).toFixed(1) + '%');
console.log('Phase 2 portfolio coverage:    ' + (phase2Weight / totalWeight * 100).toFixed(1) + '% (native execution pending)');

console.log('\n── Phase 1 ETH-native breakdown (direct weights, re-normalized) ──');
console.log('Symbol  Weight%  bps   Address                                    Note');
console.log('─────── ──────── ───── ────────────────────────────────────────── ──────────────────');
for (let i = 0; i < sortedSymbols.length; i++) {
  const sym  = sortedSymbols[i];
  const info = DIRECT_TOKENS[sym];
  const pct  = (directWeights[sym] / directWeightSum * 100).toFixed(2);
  console.log(`${sym.padEnd(7)} ${pct.padStart(6)}%  ${String(weights[i]).padStart(4)}  ${info.address}  [${info.note}]`);
}

console.log('\n── Phase 2: Cross-chain assets (deBridge DLN — native prices, no proxy) ──');
console.log('Symbol  Portfolio%  Native Chain          Protocol');
console.log('─────── ──────────  ───────────────────── ─────────────────────');
const PHASE2_CHAINS = {
  SOL:'Solana', JITOSOL:'Solana', JUPSOL:'Solana', INF:'Solana', JUP:'Solana',
  BNB:'BNB Chain', XRP:'XRP Ledger', ADA:'Cardano', TRX:'TRON', AVAX:'Avalanche',
  SUI:'Sui', DOT:'Polkadot', NEAR:'NEAR', ICP:'ICP', ATOM:'Cosmos', XDC:'XDC Network',
  OP:'Optimism', HYPE:'HyperEVM', LTC:'Litecoin', BCH:'Bitcoin Cash',
  XMR:'Monero', ZEC:'Zcash', NIGHT:'Midnight', HBAR:'Hedera', VET:'VeChain',
  XTZ:'Tezos', ETC:'Eth Classic', FIL:'Filecoin', AR:'Arweave', HNT:'Helium',
  ALGO:'Algorand', XLM:'Stellar', CC:'Canton', DBR:'Multi-chain',
  TAO:'Bittensor', EOS:'Antelope', HONEY:'Solana',
};
const PHASE2_PROTOCOLS = {
  SOL:'deBridge → Jupiter', JITOSOL:'deBridge → Jito', JUPSOL:'deBridge → Jupiter',
  INF:'deBridge → Sanctum', JUP:'deBridge → Jupiter', BNB:'deBridge → PancakeSwap',
  XRP:'deBridge → XRPL DEX', ADA:'deBridge → Minswap', TRX:'deBridge → SunSwap',
  AVAX:'deBridge → Trader Joe', SUI:'deBridge → Cetus', DOT:'deBridge → HydraDX',
  NEAR:'deBridge → Ref Finance', ICP:'deBridge → ICPSwap', ATOM:'deBridge → Osmosis',
  XDC:'deBridge → XSwap', OP:'deBridge → Velodrome', HYPE:'deBridge → HLP DEX',
  LTC:'deBridge → DEX', BCH:'deBridge → DEX', XMR:'deBridge → DEX',
  ZEC:'deBridge → DEX', NIGHT:'deBridge → DEX', HBAR:'deBridge → HeliSwap',
  VET:'deBridge → VeSwap', XTZ:'deBridge → Plenty', ETC:'deBridge → Uniswap',
  FIL:'deBridge → DEX', AR:'deBridge → Permaswap', HNT:'deBridge → DEX',
  ALGO:'deBridge → Tinyman', XLM:'deBridge → StellarDEX', CC:'deBridge → DEX',
  DBR:'deBridge native', TAO:'deBridge → DEX', EOS:'deBridge → DEX',
  HONEY:'deBridge → Orca',
};
for (const sym of PHASE2_ASSETS.sort((a,b) => (ALL_WEIGHTS[b]||0)-(ALL_WEIGHTS[a]||0))) {
  const pct   = ((ALL_WEIGHTS[sym]||0) / totalWeight * 100).toFixed(2);
  const chain = (PHASE2_CHAINS[sym] || 'Multi-chain').padEnd(21);
  const proto = PHASE2_PROTOCOLS[sym] || 'deBridge → DEX';
  console.log(`${sym.padEnd(7)} ${pct.padStart(8)}%  ${chain}  ${proto}`);
}

console.log('\n── After setPortfolio(): final activation steps ─────────────────');
console.log('A. Etherscan Write Contract → setAutomationEnabled(true)');
console.log('B. https://automation.chain.link → New Upkeep → Custom Logic');
console.log('   → Vault: 0x506F72eABc90793ae8aC788E650bC9407ED853Fa');
console.log('   → Fund: 1 LINK (~$15) → runs autonomous ETH execution forever');
console.log('C. Phase 2: deBridge DLN integration deploys bridge allocations\n');
