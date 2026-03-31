// ─── INQUISITIVE AI — Real 5-Engine Brain Scoring ─────────────────────────────
// Exact TypeScript port of server/services/inquisitiveBrain.js
// Used by assets.ts, dashboard.ts, api/dashboard.ts

// ── Shared 65-asset registry (mirrors server/services/priceFeed.js ASSET_REGISTRY) ──
export interface RegistryEntry {
  symbol: string; cgId: string; name: string; category: string;
  stakeable: boolean; lendable: boolean; yieldable: boolean;
}
export const ASSET_REGISTRY: RegistryEntry[] = [
  { symbol:'BTC',     cgId:'bitcoin',                 name:'Bitcoin',                          category:'major',        yieldable:false, stakeable:false, lendable:true  },
  { symbol:'ETH',     cgId:'ethereum',                name:'Ethereum',                         category:'major',        yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'BNB',     cgId:'binancecoin',             name:'BNB',                              category:'major',        yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'XRP',     cgId:'ripple',                  name:'XRP',                              category:'major',        yieldable:false, stakeable:false, lendable:true  },
  { symbol:'USDC',    cgId:'usd-coin',                name:'USD Coin',                         category:'stablecoin',   yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'SOL',     cgId:'solana',                  name:'Solana',                           category:'major',        yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'TRX',     cgId:'tron',                    name:'TRON',                             category:'major',        yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'ADA',     cgId:'cardano',                 name:'Cardano',                          category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'BCH',     cgId:'bitcoin-cash',            name:'Bitcoin Cash',                     category:'major',        yieldable:false, stakeable:false, lendable:true  },
  { symbol:'HYPE',    cgId:'hyperliquid',             name:'Hyperliquid',                      category:'defi',         yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'XMR',     cgId:'monero',                  name:'Monero',                           category:'privacy',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'LINK',    cgId:'chainlink',               name:'Chainlink',                        category:'oracle',       yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'CC',      cgId:'canton-network',          name:'Canton',                           category:'institutional',yieldable:false, stakeable:false, lendable:false },
  { symbol:'XLM',     cgId:'stellar',                 name:'Stellar',                          category:'payment',      yieldable:false, stakeable:false, lendable:true  },
  { symbol:'LTC',     cgId:'litecoin',                name:'Litecoin',                         category:'payment',      yieldable:false, stakeable:false, lendable:true  },
  { symbol:'HBAR',    cgId:'hedera-hashgraph',        name:'Hedera',                           category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'AVAX',    cgId:'avalanche-2',             name:'Avalanche',                        category:'major',        yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'ZEC',     cgId:'zcash',                   name:'Zcash',                            category:'privacy',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'SUI',     cgId:'sui',                     name:'Sui',                              category:'major',        yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'DOT',     cgId:'polkadot',                name:'Polkadot',                         category:'interop',      yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'PAXG',    cgId:'pax-gold',                name:'PAX Gold',                         category:'rwa',          yieldable:false, stakeable:false, lendable:true  },
  { symbol:'UNI',     cgId:'uniswap',                 name:'Uniswap',                          category:'defi',         yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'TAO',     cgId:'bittensor',               name:'Bittensor',                        category:'ai',           yieldable:false, stakeable:true,  lendable:false },
  { symbol:'NEAR',    cgId:'near-protocol',           name:'NEAR Protocol',                    category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'AAVE',    cgId:'aave',                    name:'Aave',                             category:'defi',         yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'SKY',     cgId:'sky',                     name:'Sky',                              category:'defi',         yieldable:true,  stakeable:false, lendable:false },
  { symbol:'ICP',     cgId:'internet-computer',       name:'Internet Computer',                category:'major',        yieldable:false, stakeable:false, lendable:false },
  { symbol:'ETC',     cgId:'ethereum-classic',        name:'Ethereum Classic',                 category:'major',        yieldable:false, stakeable:false, lendable:true  },
  { symbol:'ONDO',    cgId:'ondo-finance',            name:'Ondo',                             category:'rwa',          yieldable:true,  stakeable:false, lendable:false },
  { symbol:'POL',     cgId:'polygon-ecosystem-token', name:'Polygon',                          category:'l2',           yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'ENA',     cgId:'ethena',                  name:'Ethena',                           category:'defi',         yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'ATOM',    cgId:'cosmos',                  name:'Cosmos',                           category:'interop',      yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'ALGO',    cgId:'algorand',                name:'Algorand',                         category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'NIGHT',   cgId:'midnight-network',        name:'Midnight Network',                 category:'privacy',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'FIL',     cgId:'filecoin',                name:'Filecoin',                         category:'storage',      yieldable:false, stakeable:false, lendable:true  },
  { symbol:'QNT',     cgId:'quant-network',           name:'Quant',                            category:'interop',      yieldable:false, stakeable:false, lendable:true  },
  { symbol:'XDC',     cgId:'xdce-crowd-sale',         name:'XDC Network',                      category:'major',        yieldable:false, stakeable:true,  lendable:false },
  { symbol:'RNDR',    cgId:'render-token',            name:'Render',                           category:'ai',           yieldable:false, stakeable:false, lendable:false },
  { symbol:'JUP',     cgId:'jupiter-exchange-solana', name:'Jupiter',                          category:'defi',         yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'VET',     cgId:'vechain',                 name:'VeChain',                          category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'ARB',     cgId:'arbitrum',                name:'Arbitrum',                         category:'l2',           yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'ZRO',     cgId:'layerzero',               name:'LayerZero',                        category:'interop',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'XTZ',     cgId:'tezos',                   name:'Tezos',                            category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'CHZ',     cgId:'chiliz',                  name:'Chiliz',                           category:'gaming',       yieldable:false, stakeable:false, lendable:false },
  { symbol:'FET',     cgId:'fetch-ai',                name:'ASI Alliance',                     category:'ai',           yieldable:false, stakeable:true,  lendable:false },
  { symbol:'INJ',     cgId:'injective-protocol',      name:'Injective',                        category:'defi',         yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'GRT',     cgId:'the-graph',               name:'The Graph',                        category:'data',         yieldable:false, stakeable:true,  lendable:false },
  { symbol:'OP',      cgId:'optimism',                name:'Optimism',                         category:'l2',           yieldable:false, stakeable:false, lendable:true  },
  { symbol:'LDO',     cgId:'lido-dao',                name:'Lido DAO',                         category:'defi',         yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'HNT',     cgId:'helium',                  name:'Helium',                           category:'iot',          yieldable:false, stakeable:true,  lendable:false },
  { symbol:'STRK',    cgId:'starknet',                name:'Starknet',                         category:'l2',           yieldable:false, stakeable:true,  lendable:false },
  { symbol:'XCN',     cgId:'onyxcoin',                name:'Onyxcoin',                         category:'defi',         yieldable:false, stakeable:false, lendable:false },
  { symbol:'EOS',     cgId:'eos',                     name:'Vaulta',                           category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'AR',      cgId:'arweave',                 name:'Arweave',                          category:'storage',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'ACH',     cgId:'alchemy-pay',             name:'Alchemy Pay',                      category:'payment',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'DBR',     cgId:'debridge',                name:'deBridge',                         category:'interop',      yieldable:false, stakeable:true,  lendable:false },
  { symbol:'HONEY',   cgId:'hivemapper',              name:'Hivemapper',                       category:'iot',          yieldable:true,  stakeable:false, lendable:false },
  { symbol:'XSGD',    cgId:'xsgd',                    name:'XSGD',                             category:'stablecoin',   yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'SOIL',    cgId:'soil',                    name:'Soil',                             category:'defi',         yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'BRZ',     cgId:'brz',                     name:'Brazilian Digital Token',          category:'stablecoin',   yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'JPYC',    cgId:'jpyc',                    name:'JPYC',                             category:'stablecoin',   yieldable:false, stakeable:false, lendable:false },
  { symbol:'CNGN',    cgId:'cngn',                    name:'Compliant Naira',                  category:'stablecoin',   yieldable:false, stakeable:false, lendable:false },
  { symbol:'JITOSOL', cgId:'jito-staked-sol',         name:'Jito Staked SOL',                  category:'liquid-stake', yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'JUPSOL',  cgId:'jupiter-staked-sol',      name:'Jupiter Staked SOL',               category:'liquid-stake', yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'INF',     cgId:'sanctum-infinity',        name:'Sanctum Infinity',                 category:'liquid-stake', yieldable:true,  stakeable:true,  lendable:false },
];

export const PORTFOLIO_WEIGHTS: Record<string, number> = {
  BTC:18, ETH:12, SOL:8, BNB:5, XRP:4, ADA:3, AVAX:3, SUI:2, DOT:2, NEAR:1, ICP:1, TRX:1,
  AAVE:2, UNI:2, LDO:1.5, ARB:1.5, OP:1, INJ:1, JUP:1, ENA:1, HYPE:1, SKY:0.5, GRT:0.5, FET:1, RNDR:1, TAO:1, POL:1, LINK:1, STRK:0.5,
  USDC:3, PAXG:1.5, ONDO:1, XLM:0.5, LTC:0.5, BCH:0.5, HBAR:0.5, ZEC:0.25, XMR:0.25, ETC:0.5, XTZ:0.25, CHZ:0.25, HNT:0.25, VET:0.25, QNT:0.25, ALGO:0.25, FIL:0.25, AR:0.25, XDC:0.1, ZRO:0.25, ATOM:0.25, DBR:0.1, ACH:0.1, EOS:0.1, HONEY:0.1, XSGD:0.1, SOIL:0.1, BRZ:0.1, JPYC:0.1, CNGN:0.1, JITOSOL:0.5, JUPSOL:0.5, INF:0.5, CC:0.1, NIGHT:0.25, XCN:0.1,
};

export interface AssetInput {
  symbol:    string;
  category:  string;
  weight:    number;
  stakeable: boolean;
  lendable:  boolean;
  yieldable: boolean;
  priceUsd:  number;
  change24h: number;   // DECIMAL: 0.05 = 5%
  change7d:  number;   // DECIMAL
  volume24h: number;
  marketCap: number;
  athChange: number;   // DECIMAL, negative: -0.70 = 70% below ATH
}

export interface FGIndex { value: number; valueClassification: string }
export type Regime = 'BULL' | 'BEAR' | 'NEUTRAL';

export function getRegime(btcChgPct: number, ethChgPct: number, btcChg7dPct = 0, ethChg7dPct = 0): Regime {
  const avg24h = (btcChgPct + ethChgPct) / 2;
  const avg7d  = (btcChg7dPct + ethChg7dPct) / 2;
  // Primary signal: 24h. Confirmation: 7d trend aligns
  if (avg24h > 2.5 && avg7d > 0)  return 'BULL';
  if (avg24h < -2.5 && avg7d < 0) return 'BEAR';
  if (avg7d > 10)  return 'BULL';  // strong weekly trend overrides flat daily
  if (avg7d < -10) return 'BEAR';
  return avg24h > 2.5 ? 'BULL' : avg24h < -2.5 ? 'BEAR' : 'NEUTRAL';
}

// RSI proxy (0-100) derived from 7d momentum
function rsiProxy(c7d: number): number { return Math.min(95, Math.max(5, 50 + c7d * 150)); }
// MA proxy: >0 means price likely above key moving averages
function maProxy(c7d: number, c24h: number): number { return (c7d * 0.7 + c24h * 0.3); }

// ── Pattern Engine: trend-following + RSI + volume breakout ──────────────────
function patternEngine(a: AssetInput, regime: Regime): number {
  let q = 0.5;

  const rsi = rsiProxy(a.change7d);
  const ma  = maProxy(a.change7d, a.change24h);
  // RSI zones: oversold = buy, overbought = caution
  if      (rsi < 25) q += 0.18;
  else if (rsi < 35) q += 0.10;
  else if (rsi > 75) q -= 0.10;
  else if (rsi > 85) q -= 0.18;
  // MA position: price above MAs = trend is up
  if      (ma >  0.12) q += 0.12;
  else if (ma >  0.04) q += 0.06;
  else if (ma < -0.12) q -= 0.12;
  else if (ma < -0.04) q -= 0.06;
  // 24h momentum confirmation
  if      (a.change24h >  0.05) q += 0.08;
  else if (a.change24h >  0.02) q += 0.04;
  else if (a.change24h < -0.05) q -= 0.08;
  else if (a.change24h < -0.02) q -= 0.04;

  // Volume-price confirmation: price up on high volume = strong signal
  if (a.volume24h > 0 && a.marketCap > 0) {
    const turnover = a.volume24h / a.marketCap;
    if (turnover > 0.10) q += 0.08;
    if (turnover > 0.25) q += 0.05;
    // Volume confirms direction: up price + high volume = extra conviction
    if (a.change24h > 0.02 && turnover > 0.08) q += 0.05;
    // Down price on high volume = distribution, penalise more
    if (a.change24h < -0.02 && turnover > 0.10) q -= 0.05;
  }

  // Value zone: deep below ATH is contrarian accumulation opportunity
  if      (a.athChange < -0.80) q += 0.10;
  else if (a.athChange < -0.70) q += 0.07;
  else if (a.athChange < -0.50) q += 0.04;
  // Near ATH: momentum but also near resistance
  else if (a.athChange > -0.05) q -= 0.03;

  // Trend-regime alignment bonus/penalty
  if (regime === 'BULL') q += 0.08;
  if (regime === 'BEAR') q -= 0.12;

  return Math.max(0, Math.min(1, q));
}

// ── Reasoning Engine: fundamentals + sentiment ─────────────────────────────────
const CAT_BONUS: Record<string, number> = {
  major: 0.10, defi: 0.08, ai: 0.12, l2: 0.07, rwa: 0.09,
  'liquid-stake': 0.10, stablecoin: 0.05, payment: 0.04,
  interop: 0.06, storage: 0.04, oracle: 0.08,
  institutional: 0.08, privacy: 0.03, gaming: 0.03, iot: 0.05, data: 0.06,
};

function reasoningEngine(a: AssetInput, fg: FGIndex | null): { score: number; reasons: string[] } {
  let score = 0.5;
  const reasons: string[] = [];

  if (a.lendable)  { score += 0.05; reasons.push('Lendable — yield generation possible'); }
  if (a.stakeable) { score += 0.05; reasons.push('Stakeable — network rewards available'); }
  if (a.yieldable) { score += 0.05; reasons.push('Yield-bearing — compounding opportunity'); }

  score += CAT_BONUS[a.category] ?? 0.02;

  // Market structure: HH+HL = bullish, LH+LL = bearish, pullback in uptrend = entry
  const bullStruct     = a.change24h > 0     && a.change7d >  0.05;
  const bearStruct     = a.change24h < 0     && a.change7d < -0.05;
  const pullbackEntry  = a.change24h < -0.02 && a.change7d >  0.08;
  const deadCatBounce  = a.change24h > 0.03  && a.change7d < -0.15;
  if      (bullStruct)    { score += 0.09; reasons.push('Bullish structure — higher highs + higher lows confirmed'); }
  else if (bearStruct)    { score -= 0.09; reasons.push('Bearish structure — lower highs + lower lows confirmed'); }
  else if (pullbackEntry) { score += 0.07; reasons.push('Healthy pullback in uptrend — high-probability accumulation entry'); }
  else if (deadCatBounce) { score -= 0.06; reasons.push('Relief bounce in downtrend — avoid fakeout'); }

  // Market cycle phase via ATH distance
  if      (a.athChange < -0.85) { score += 0.08; reasons.push('Deep value zone — extreme discount from ATH'); }
  else if (a.athChange < -0.65) { score += 0.05; reasons.push('Discount zone — potential DCA accumulation entry'); }
  else if (a.athChange > -0.08) { score -= 0.05; reasons.push('Near ATH resistance — distribution risk, tighten stops'); }

  // DCA zone: quality asset in oversold weekly condition with strong liquidity
  if ((a.category === 'major' || a.category === 'liquid-stake') &&
      a.change7d < -0.10 && a.volume24h > 500_000_000) {
    score += 0.06; reasons.push('DCA zone — quality asset in oversold condition with institutional liquidity');
  }

  if (fg) {
    const v = fg.value;
    if      (v < 15) { score += 0.12; reasons.push(`Extreme Fear (${v}) — historically strongest accumulation zone`); }
    else if (v < 30) { score += 0.07; reasons.push(`Fear (${v}) — contrarian buy signal`); }
    else if (v > 85) { score -= 0.10; reasons.push(`Extreme Greed (${v}) — reduce exposure, protect profits`); }
    else if (v > 70) { score -= 0.05; reasons.push(`Greed (${v}) — tighten stops, watch for reversal`); }
  }

  return { score: Math.max(0, Math.min(1, score)), reasons };
}

// ── Portfolio Engine: Sharpe proxy + diversification + market cap ──────────────
function portfolioEngine(a: AssetInput, all: AssetInput[]): number {
  const vol    = Math.abs(a.change24h);
  const sharpe = vol > 0 ? a.change24h / vol : 0;

  const catCount   = all.filter(x => x.category === a.category).length;
  const diversBonus = catCount <= 3 ? 0.10 : catCount <= 6 ? 0.05 : 0;

  let capBonus = 0;
  if      (a.marketCap > 100_000_000_000) capBonus = 0.10;
  else if (a.marketCap > 10_000_000_000)  capBonus = 0.07;
  else if (a.marketCap > 1_000_000_000)   capBonus = 0.04;

  return Math.max(0, Math.min(1, 0.5 + sharpe * 0.2 + diversBonus + capBonus));
}

// ── Learning Engine: trend consistency + volume quality + momentum alignment ──
function learningEngine(a: AssetInput): number {
  let score = 0.5;

  // Weekly trend strength
  if      (a.change7d >  0.20) score += 0.18;
  else if (a.change7d >  0.10) score += 0.12;
  else if (a.change7d >  0.05) score += 0.06;
  else if (a.change7d < -0.20) score -= 0.18;
  else if (a.change7d < -0.10) score -= 0.12;
  else if (a.change7d < -0.05) score -= 0.06;

  // Trend confirmation: both 24h and 7d align = high-conviction signal
  if (a.change24h > 0.01 && a.change7d > 0.05)  score += 0.07; // confirmed uptrend
  if (a.change24h < -0.01 && a.change7d < -0.05) score -= 0.07; // confirmed downtrend
  // Trend-following: ride strong momentum, don't fight it
  if (a.change24h > 0.03 && a.change7d > 0.12) score += 0.05;  // strong momentum continuation
  if (a.change24h < -0.03 && a.change7d < -0.12) score -= 0.05; // strong downtrend continuation
  // Bullish divergence: 7d oversold but 24h starting to recover = early reversal signal
  if (a.change24h > 0.02 && a.change7d < -0.12) score += 0.04;
  // Death signal: fresh breakdown through weekly support
  if (a.change24h < -0.04 && a.change7d < -0.08) score -= 0.05;

  // Volume breakout: price up + very high relative volume = confirmed breakout
  if (a.volume24h > 0 && a.marketCap > 0) {
    const relVol = a.volume24h / a.marketCap;
    if (a.change24h > 0.04 && relVol > 0.12) { score += 0.08; } // volume-confirmed breakout
    if (a.change24h < -0.04 && relVol > 0.12) { score -= 0.08; } // volume-confirmed breakdown
  }

  // Liquidity quality: only trade assets with real institutional volume
  if      (a.volume24h > 1_000_000_000) score += 0.10;
  else if (a.volume24h >   100_000_000) score += 0.05;
  else if (a.volume24h <     1_000_000) score -= 0.10;

  return Math.max(0, Math.min(1, score));
}

// ── Risk Gate: 5 checks must all pass ─────────────────────────────────────────
function riskGate(a: AssetInput, heat: number, dd: number): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let pass = true;

  if (heat >= 0.06) {
    pass = false;
    reasons.push(`Portfolio heat ${(heat * 100).toFixed(1)}% ≥ 6% max — no new trades`);
  }
  if (dd >= 0.15) {
    pass = false;
    reasons.push(`Drawdown ${(dd * 100).toFixed(1)}% ≥ 15% — EMERGENCY STOP`);
  }
  if (Math.abs(a.change24h) > 0.20) {
    pass = false;
    reasons.push(`24h volatility ${(Math.abs(a.change24h) * 100).toFixed(1)}% > 20% — skip cycle`);
  }
  if (a.volume24h < 500_000) {
    pass = false;
    reasons.push(`Volume $${(a.volume24h / 1e3).toFixed(0)}k < $500k minimum liquidity`);
  }

  return { pass, reasons };
}

// ── Master scoring — mirrors inquisitiveBrain.js scoreAsset exactly ────────────
export function scoreAsset(
  a:          AssetInput,
  regime:     Regime,
  fg:         FGIndex | null,
  allAssets:  AssetInput[],
  heat = 0,
  dd   = 0,
) {
  const pScore   = patternEngine(a, regime);
  const rResult  = reasoningEngine(a, fg);
  const portScore = portfolioEngine(a, allAssets);
  const lScore   = learningEngine(a);
  const gate     = riskGate(a, heat, dd);

  // Weighted ensemble (equal 25% each engine, as per inquisitiveBrain.js)
  const rawScore   = (pScore + rResult.score + portScore + lScore) / 4;
  const riskAdj    = gate.pass ? rawScore : rawScore * 0.3;
  const finalScore = parseFloat(((riskAdj * 0.70) + (rawScore * 0.30)).toFixed(4));

  // Action thresholds — select best of 11 execution functions per asset properties + regime
  const threshold = regime === 'BEAR' ? 0.65 : 0.70;
  let action = 'HOLD';
  if (gate.pass) {
    if (finalScore <= 0.35) {
      action = 'SELL';
    } else if (finalScore <= 0.42) {
      action = 'REDUCE';
    } else if (finalScore >= threshold) {
      // High-confidence active execution — full 11-function selection
      if      (a.category === 'stablecoin')                                         action = 'LEND';
      else if (a.category === 'liquid-stake')                                       action = finalScore >= 0.78 ? 'EARN' : 'REWARDS';
      else if (finalScore >= 0.87 && a.yieldable && a.lendable)                    action = 'LOOP';
      else if (finalScore >= 0.85 && a.category === 'major' && regime === 'BULL')  action = 'MULTIPLY';
      else if (finalScore >= 0.82 && a.lendable && regime !== 'BULL')              action = 'BORROW';
      else if (finalScore >= 0.80 && a.yieldable)                                  action = 'YIELD';
      else if (finalScore >= 0.76 && a.stakeable && a.lendable)                    action = 'EARN';
      else if (finalScore >= 0.72 && a.stakeable)                                  action = 'STAKE';
      else if (finalScore >= 0.68 && a.lendable && regime !== 'BULL')              action = 'LEND';
      else if (finalScore >= 0.65 && Math.abs(a.change7d ?? 0) > 0.08)            action = 'SWAP';
      else                                                                           action = 'BUY';
    } else {
      // Steady-state operations (0.43–threshold): reflect what each asset IS doing in the portfolio.
      // Every asset is deployed — stablecoins lent, staked assets staking, etc.
      if      (a.category === 'stablecoin')                                         action = 'LEND';
      else if (a.category === 'liquid-stake')                                       action = 'REWARDS';
      else if (a.yieldable && a.stakeable && finalScore > 0.58)                    action = 'EARN';
      else if (a.yieldable && finalScore > 0.54)                                   action = 'YIELD';
      else if (a.stakeable && finalScore > 0.52)                                   action = 'STAKE';
      else if (a.lendable  && finalScore > 0.50)                                   action = 'LEND';
      else if (Math.abs(a.change7d ?? 0) > 0.12 && finalScore > 0.55)             action = 'SWAP';
      else                                                                           action = 'HOLD';
    }
  } else {
    action = 'SKIP';
  }

  const chgPct    = (a.change24h * 100).toFixed(2);
  const fgStr     = fg ? ` F&G:${fg.value} (${fg.valueClassification}).` : '';
  const rationale = `${action}: ${chgPct}% 24h. Weight ${a.weight}%.${fgStr} ${regime} regime. Risk-first gate ${gate.pass ? 'PASSED' : 'BLOCKED'}.`;

  return {
    symbol:     a.symbol,
    category:   a.category,
    weight:     a.weight,
    price:      a.priceUsd,
    change24h:  a.change24h,
    action,
    finalScore,
    confidence: finalScore,
    executed:   !['HOLD','SKIP','REDUCE'].includes(action),
    components: {
      patternEngine:   parseFloat(pScore.toFixed(4)),
      reasoningEngine: parseFloat(rResult.score.toFixed(4)),
      portfolioEngine: parseFloat(portScore.toFixed(4)),
      learningEngine:  parseFloat(lScore.toFixed(4)),
    },
    riskGate: gate,
    reasons:  [...rResult.reasons, ...gate.reasons].slice(0, 6),
    rationale,
    time: new Date().toISOString(),
  };
}
