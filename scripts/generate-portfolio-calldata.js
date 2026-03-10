// scripts/generate-portfolio-calldata.js
// ────────────────────────────────────────────────────────────────────────────
// Generates the exact arrays needed for vault.setPortfolio() on Etherscan
// Write Contract — NO private key required.
//
// Usage:
//   node scripts/generate-portfolio-calldata.js
//
// Then paste the output into:
//   https://etherscan.io/address/0x<VAULT>/write-contract#setPortfolio
// ────────────────────────────────────────────────────────────────────────────

const TOKEN_MAP = {
  BTC:  { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', fee: 3000, note: 'WBTC' },
  ETH:  { address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', fee: 500,  note: 'wstETH' },
  USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', fee: 500,  note: 'USDC' },
  AAVE: { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', fee: 3000, note: 'AAVE' },
  UNI:  { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', fee: 3000, note: 'UNI' },
  LDO:  { address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', fee: 3000, note: 'LDO' },
  ARB:  { address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1', fee: 3000, note: 'ARB' },
  INJ:  { address: '0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30', fee: 3000, note: 'INJ' },
  GRT:  { address: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7', fee: 3000, note: 'GRT' },
  ENA:  { address: '0x57e114B691Db790C35207b2e685D4A43181e6061', fee: 3000, note: 'ENA' },
  POL:  { address: '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6', fee: 3000, note: 'POL' },
  SKY:  { address: '0x56072C95FAA701256059aa122697B133aDEd9279', fee: 3000, note: 'SKY' },
  FET:  { address: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85', fee: 3000, note: 'FET/ASI' },
  RNDR: { address: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24', fee: 3000, note: 'RNDR' },
  LINK: { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', fee: 3000, note: 'LINK' },
  PAXG: { address: '0x45804880De22913dAFE09f4980848ECE6EcbAf78', fee: 3000, note: 'PAXG' },
  ONDO: { address: '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3', fee: 3000, note: 'ONDO' },
  QNT:  { address: '0x4a220E6096B25EADb88358cb44068A3248254675', fee: 3000, note: 'QNT' },
  ZRO:  { address: '0x6985884C4392D348587B19cb9eAAf157F13271cD', fee: 3000, note: 'ZRO' },
  CHZ:  { address: '0x3506424F91fD33084466F402d5D97f05F8e3b4AF', fee: 3000, note: 'CHZ' },
  ACH:  { address: '0x4e15361FD6b4BB609Fa63C81A2be19d873717870', fee: 3000, note: 'ACH' },
};

// Original weights from _brain.ts (percentage scale)
const RAW_WEIGHTS = {
  BTC:18, ETH:12, SOL:8, BNB:5, XRP:4, ADA:3, AVAX:3, SUI:2, DOT:2, NEAR:1, ICP:1, TRX:1,
  AAVE:2, UNI:2, LDO:1.5, ARB:1.5, OP:1, INJ:1, JUP:1, ENA:1, HYPE:1, SKY:0.5, GRT:0.5,
  FET:1, RNDR:1, TAO:1, POL:1, LINK:1, STRK:0.5,
  USDC:3, PAXG:1.5, ONDO:1, XLM:0.5, LTC:0.5, BCH:0.5, HBAR:0.5, ZEC:0.25, XMR:0.25,
  ETC:0.5, XTZ:0.25, CHZ:0.25, HNT:0.25, VET:0.25, QNT:0.25, ALGO:0.25, FIL:0.25, AR:0.25,
  XDC:0.1, ZRO:0.25, ATOM:0.25, DBR:0.1, ACH:0.1, EOS:0.1, HONEY:0.1, XSGD:0.1, SOIL:0.1,
  BRZ:0.1, JPYC:0.1, CNGN:0.1, JITOSOL:0.5, JUPSOL:0.5, INF:0.5, CC:0.1, NIGHT:0.1, XCN:0.1,
};

// Build arrays — only include assets with ETH mainnet ERC-20 addresses
const available = Object.keys(TOKEN_MAP);
let availableWeightSum = 0;
for (const sym of available) availableWeightSum += (RAW_WEIGHTS[sym] || 0);

const tokens  = [];
const weights = [];
const fees    = [];
let bpsSum = 0;

for (let i = 0; i < available.length; i++) {
  const sym  = available[i];
  const info = TOKEN_MAP[sym];
  const raw  = (RAW_WEIGHTS[sym] || 0) / availableWeightSum;
  const bps  = (i < available.length - 1) ? Math.floor(raw * 10000) : (10000 - bpsSum);
  tokens.push(info.address);
  weights.push(bps);
  fees.push(info.fee);
  bpsSum += bps;
}

// ── Output ────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('  INQUISITIVE — setPortfolio() calldata for Etherscan Write Contract');
console.log('═══════════════════════════════════════════════════════════════════\n');

console.log('── How to use (NO private key required) ──────────────────────────');
console.log('1. Go to: https://etherscan.io/address/0x506F72eABc90793ae8aC788E650bC9407ED853Fa#writeContract');
console.log('2. Click "Connect to Web3" → connect MetaMask (deployer wallet)');
console.log('3. Click "setPortfolio"');
console.log('4. Paste the arrays below into the fields');
console.log('5. Click "Write" and confirm in MetaMask\n');

console.log('── _tokens (address[]) ───────────────────────────────────────────');
console.log('[' + tokens.join(',') + ']\n');

console.log('── _weights (uint256[]) ──────────────────────────────────────────');
console.log('[' + weights.join(',') + ']\n');

console.log('── _fees (uint24[]) ──────────────────────────────────────────────');
console.log('[' + fees.join(',') + ']\n');

console.log('── Verification ──────────────────────────────────────────────────');
console.log('Assets:          ' + tokens.length);
console.log('Weight sum (bps):', weights.reduce((a,b) => a+b, 0), '(must be 10000)');
console.log('\n── Asset breakdown ───────────────────────────────────────────────');
for (let i = 0; i < available.length; i++) {
  const sym  = available[i];
  const info = TOKEN_MAP[sym];
  console.log(`  ${sym.padEnd(6)} ${(weights[i]/100).toFixed(2).padStart(6)}%  ${info.address}  [${info.note}]`);
}
console.log('\n── Next steps after setPortfolio() ──────────────────────────────');
console.log('A. On Etherscan Write Contract:');
console.log('   setAutomationEnabled(true)  ← enables performUpkeep()');
console.log('\nB. Register Chainlink Automation (FULLY KEYLESS FOREVER):');
console.log('   1. Go to https://automation.chain.link');
console.log('   2. Connect MetaMask → New Upkeep → Custom Logic');
console.log('   3. Contract: 0x506F72eABc90793ae8aC788E650bC9407ED853Fa');
console.log('   4. Fund with 1 LINK (~$15) — runs for months');
console.log('   Done. Chainlink calls performUpkeep() every 60s automatically.\n');
