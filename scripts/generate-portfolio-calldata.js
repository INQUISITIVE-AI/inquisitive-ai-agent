// scripts/generate-portfolio-calldata.js
// ────────────────────────────────────────────────────────────────────────────
// Generates the exact arrays needed for vault.setPortfolio() on Etherscan
// Write Contract — NO private key required.
//
// Architecture: ALL 65 portfolio assets are managed by the AI.
//   22 execute DIRECTLY on Ethereum mainnet via Uniswap V3.
//   43 cross-chain assets are PROXIED to their most correlated ETH-native token.
//   The on-chain weights are COMBINED (direct + proxy absorbed weight).
//
// Usage:
//   node scripts/generate-portfolio-calldata.js
//
// Then paste the output into:
//   https://etherscan.io/address/0x506F72eABc90793ae8aC788E650bC9407ED853Fa#writeContract
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

// ── All 65 raw portfolio weights from _brain.ts ───────────────────────────────
const RAW_WEIGHTS = {
  BTC:18, ETH:12, SOL:8, BNB:5, XRP:4, ADA:3, AVAX:3, SUI:2, DOT:2, NEAR:1, ICP:1, TRX:1,
  AAVE:2, UNI:2, LDO:1.5, ARB:1.5, OP:1, INJ:1, JUP:1, ENA:1, HYPE:1, SKY:0.5, GRT:0.5,
  FET:1, RNDR:1, TAO:1, POL:1, LINK:1, STRK:0.5,
  USDC:3, PAXG:1.5, ONDO:1, XLM:0.5, LTC:0.5, BCH:0.5, HBAR:0.5, ZEC:0.25, XMR:0.25,
  ETC:0.5, XTZ:0.25, CHZ:0.25, HNT:0.25, VET:0.25, QNT:0.25, ALGO:0.25, FIL:0.25, AR:0.25,
  XDC:0.1, ZRO:0.25, ATOM:0.25, DBR:0.1, ACH:0.1, EOS:0.1, HONEY:0.1, XSGD:0.1, SOIL:0.1,
  BRZ:0.1, JPYC:0.1, CNGN:0.1, JITOSOL:0.5, JUPSOL:0.5, INF:0.5, CC:0.1, NIGHT:0.1, XCN:0.1,
};

// ── Proxy map: 43 cross-chain assets → their ETH-mainnet proxy ────────────────
const PROXY_MAP = {
  // Direct (self-maps — 22 ETH-mainnet tokens)
  BTC:'BTC', ETH:'ETH', USDC:'USDC', AAVE:'AAVE', UNI:'UNI', LINK:'LINK',
  LDO:'LDO', ARB:'ARB', GRT:'GRT',  ENA:'ENA',   POL:'POL', SKY:'SKY',
  FET:'FET', RNDR:'RNDR', INJ:'INJ', PAXG:'PAXG', ONDO:'ONDO', QNT:'QNT',
  ZRO:'ZRO', CHZ:'CHZ', ACH:'ACH', STRK:'STRK',
  // 43 cross-chain → ETH-native proxy
  SOL:'ETH', BNB:'UNI', XRP:'USDC', ADA:'AAVE', AVAX:'ARB', SUI:'ARB',
  DOT:'ZRO', NEAR:'GRT', ICP:'GRT', TRX:'USDC', OP:'ARB', JUP:'UNI',
  HYPE:'AAVE', XLM:'USDC', LTC:'BTC', BCH:'BTC', HBAR:'LINK', ZEC:'PAXG',
  XMR:'PAXG', ETC:'BTC', XTZ:'AAVE', HNT:'GRT', VET:'GRT', ALGO:'USDC',
  FIL:'GRT', AR:'GRT', XDC:'ZRO', ATOM:'ZRO', EOS:'UNI', HONEY:'GRT',
  JITOSOL:'ETH', JUPSOL:'ETH', INF:'ETH', CC:'QNT', NIGHT:'PAXG', XCN:'GRT',
  DBR:'ZRO', SOIL:'AAVE', BRZ:'USDC', JPYC:'USDC', CNGN:'USDC', XSGD:'USDC',
  TAO:'FET',
};

// ── Compute combined weights (direct + all proxied weights absorbed) ──────────
const totalRawWeight = Object.values(RAW_WEIGHTS).reduce((s, w) => s + w, 0);
const combinedWeights = {};
for (const [sym, w] of Object.entries(RAW_WEIGHTS)) {
  const target = PROXY_MAP[sym] || sym;
  combinedWeights[target] = (combinedWeights[target] || 0) + w;
}

// Build sorted arrays (descending by weight)
const directSymbols = Object.keys(DIRECT_TOKENS)
  .sort((a, b) => (combinedWeights[b] || 0) - (combinedWeights[a] || 0));

const tokens  = [];
const weights = [];
const fees    = [];
let bpsSum = 0;

for (let i = 0; i < directSymbols.length; i++) {
  const sym  = directSymbols[i];
  const info = DIRECT_TOKENS[sym];
  const combinedPct = (combinedWeights[sym] || 0) / totalRawWeight;
  const bps = (i < directSymbols.length - 1)
    ? Math.floor(combinedPct * 10000)
    : (10000 - bpsSum);
  tokens.push(info.address);
  weights.push(bps);
  fees.push(info.fee);
  bpsSum += (i < directSymbols.length - 1) ? bps : (10000 - (bpsSum));
}
// Fix last element
bpsSum = weights.reduce((a,b) => a+b, 0);
if (bpsSum !== 10000) weights[weights.length - 1] += (10000 - bpsSum);

// ── Output ─────────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════════');
console.log('  INQUISITIVE — 65-Asset Portfolio  |  setPortfolio() Calldata');
console.log('  22 tokens on-chain · 43 cross-chain assets proxied to ETH-native');
console.log('════════════════════════════════════════════════════════════════════\n');

console.log('── How to use (NO private key required) ─────────────────────────');
console.log('1. Go to: https://etherscan.io/address/0x506F72eABc90793ae8aC788E650bC9407ED853Fa#writeContract');
console.log('2. Click "Connect to Web3" → connect MetaMask (deployer wallet)');
console.log('3. Expand "setPortfolio" function');
console.log('4. Paste the arrays below into the 3 fields');
console.log('5. Click "Write" and confirm in MetaMask\n');

console.log('── _tokens (address[]) ───────────────────────────────────────────');
console.log('[' + tokens.join(',') + ']\n');

console.log('── _weights (uint256[]) — combined direct + proxy weights in bps ─');
console.log('[' + weights.join(',') + ']\n');

console.log('── _fees (uint24[]) ──────────────────────────────────────────────');
console.log('[' + fees.join(',') + ']\n');

console.log('── Verification ──────────────────────────────────────────────────');
console.log('On-chain assets:  ' + tokens.length + ' (22 direct ETH mainnet ERC-20s)');
console.log('Portfolio assets: 65 (43 cross-chain assets proxied into the 22)');
console.log('Weight sum (bps): ' + weights.reduce((a,b) => a+b,0) + ' (must be 10000)');

console.log('\n── On-chain weight breakdown (direct + absorbed proxy weights) ───');
console.log('Symbol  Combined%  Direct%   Proxy represents');
console.log('────── ────────── ─────────  ────────────────────────────────────');
for (let i = 0; i < directSymbols.length; i++) {
  const sym       = directSymbols[i];
  const info      = DIRECT_TOKENS[sym];
  const combined  = (combinedWeights[sym] || 0) / totalRawWeight * 100;
  const direct    = (RAW_WEIGHTS[sym] || 0) / totalRawWeight * 100;
  const proxied   = Object.entries(PROXY_MAP)
    .filter(([s, t]) => t === sym && s !== sym)
    .map(([s]) => s);
  const proxyStr  = proxied.length ? proxied.join(' ') : '(none)';
  console.log(`${sym.padEnd(6)} ${combined.toFixed(2).padStart(8)}%  ${direct.toFixed(2).padStart(6)}%  via: ${proxyStr}`);
}

console.log('\n── After setPortfolio(): final activation steps ─────────────────');
console.log('A. Etherscan Write Contract → setAutomationEnabled(true)');
console.log('B. https://automation.chain.link → New Upkeep → Custom Logic');
console.log('   → Vault: 0x506F72eABc90793ae8aC788E650bC9407ED853Fa');
console.log('   → Fund: 1 LINK (~$15) → Done. Autonomous forever.\n');
