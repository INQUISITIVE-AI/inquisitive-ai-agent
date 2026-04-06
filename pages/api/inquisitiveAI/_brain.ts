// ─── INQUISITIVE AI — Real 5-Engine Brain Scoring ─────────────────────────────
// Cryptoteacher + NakedForexNow trend-following methodology.
// Targets 70-90% win rate through strict trend-alignment, pullback entries,
// volume confirmation, and consensus scoring across all 4 engines.
// Used by assets.ts, dashboard.ts, portfolio/nav.ts

// ── Shared 66-asset registry ─────────────────────────────────────────────────
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
  { symbol:'CC',      cgId:'gfal-token',              name:'Canton',                           category:'institutional',yieldable:false, stakeable:false, lendable:false },
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
  { symbol:'SKY',     cgId:'sky-governance-token',    name:'Sky',                              category:'defi',         yieldable:true,  stakeable:false, lendable:false },
  { symbol:'ICP',     cgId:'internet-computer',       name:'Internet Computer',                category:'major',        yieldable:false, stakeable:false, lendable:false },
  { symbol:'ETC',     cgId:'ethereum-classic',        name:'Ethereum Classic',                 category:'major',        yieldable:false, stakeable:false, lendable:true  },
  { symbol:'ONDO',    cgId:'ondo-finance',            name:'Ondo',                             category:'rwa',          yieldable:true,  stakeable:false, lendable:false },
  { symbol:'POL',     cgId:'polygon-ecosystem-token', name:'Polygon',                          category:'l2',           yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'ENA',     cgId:'ethena',                  name:'Ethena',                           category:'defi',         yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'ATOM',    cgId:'cosmos',                  name:'Cosmos',                           category:'interop',      yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'ALGO',    cgId:'algorand',                name:'Algorand',                         category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'NIGHT',   cgId:'midnight-network-token',  name:'Midnight Network',                 category:'privacy',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'FIL',     cgId:'filecoin',                name:'Filecoin',                         category:'storage',      yieldable:false, stakeable:false, lendable:true  },
  { symbol:'QNT',     cgId:'quant-network',           name:'Quant',                            category:'interop',      yieldable:false, stakeable:false, lendable:true  },
  { symbol:'XDC',     cgId:'xdce-crowd-sale',         name:'XDC Network',                      category:'major',        yieldable:false, stakeable:true,  lendable:false },
  { symbol:'RNDR',    cgId:'render-token',            name:'Render',                           category:'ai',           yieldable:false, stakeable:true,  lendable:false },
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
  { symbol:'XCN',     cgId:'chain-2',                 name:'Onyxcoin',                         category:'defi',         yieldable:false, stakeable:false, lendable:false },
  { symbol:'EOS',     cgId:'eos',                     name:'Vaulta',                           category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'AR',      cgId:'arweave',                 name:'Arweave',                          category:'storage',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'ACH',     cgId:'alchemy-pay',             name:'Alchemy Pay',                      category:'payment',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'DBR',     cgId:'debridge-finance',        name:'deBridge',                         category:'interop',      yieldable:false, stakeable:true,  lendable:false },
  { symbol:'HONEY',   cgId:'hivemapper',              name:'Hivemapper',                       category:'iot',          yieldable:true,  stakeable:false, lendable:false },
  { symbol:'XSGD',    cgId:'xsgd',                    name:'XSGD',                             category:'stablecoin',   yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'SOIL',    cgId:'soil',                    name:'Soil',                             category:'defi',         yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'BRZ',     cgId:'brz',                     name:'Brazilian Digital Token',          category:'stablecoin',   yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'JPYC',    cgId:'jpyc',                    name:'JPYC',                             category:'stablecoin',   yieldable:false, stakeable:false, lendable:false },
  { symbol:'CNGN',    cgId:'cngn',                    name:'Compliant Naira',                  category:'stablecoin',   yieldable:false, stakeable:false, lendable:false },
  { symbol:'JITOSOL', cgId:'jito-staked-sol',         name:'Jito Staked SOL',                  category:'liquid-stake', yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'JUPSOL',  cgId:'jupiter-staked-sol',      name:'Jupiter Staked SOL',               category:'liquid-stake', yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'INF',     cgId:'sanctum-infinity',        name:'Sanctum Infinity',                 category:'liquid-stake', yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'ETHFI',   cgId:'ether-fi',                name:'EtherFi',                          category:'defi',         yieldable:true,  stakeable:true,  lendable:false },
];

export const PORTFOLIO_WEIGHTS: Record<string, number> = {
  BTC:18, ETH:12, SOL:8, BNB:5, XRP:4, ADA:3, AVAX:3, SUI:2, DOT:2, NEAR:1, ICP:1, TRX:1,
  AAVE:2, UNI:2, LDO:1.5, ARB:1.5, OP:1, INJ:1, JUP:1, ENA:1, HYPE:1, SKY:0.5, GRT:0.5, FET:1, RNDR:1, TAO:1, POL:1, LINK:1, STRK:0.5,
  USDC:3, PAXG:1.5, ONDO:1, XLM:0.5, LTC:0.5, BCH:0.5, HBAR:0.5, ZEC:0.25, XMR:0.25, ETC:0.5, XTZ:0.25, CHZ:0.25, HNT:0.25, VET:0.25, QNT:0.25, ALGO:0.25, FIL:0.25, AR:0.25, XDC:0.1, ZRO:0.25, ATOM:0.25, DBR:0.1, ACH:0.1, EOS:0.1, HONEY:0.1, XSGD:0.1, SOIL:0.1, BRZ:0.1, JPYC:0.1, CNGN:0.1, JITOSOL:0.5, JUPSOL:0.5, INF:0.5, CC:0.1, NIGHT:0.25, XCN:0.1, ETHFI:0.5,
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
// Momentum composite: weighted blend of 7d (HTF) and 24h (LTF)
function maProxy(c7d: number, c24h: number): number { return (c7d * 0.7 + c24h * 0.3); }

// ── Pattern Engine: Cryptoteacher + NakedForexNow trend-following ─────────────
// Methodology: identify trend on higher timeframe (7d), enter on pullback or
// volume-confirmed breakout. NEVER buy counter-trend. NEVER catch falling knives.
// Best entries (in priority order):
//   1. Pullback in confirmed uptrend — 7d up, 24h slight dip = accumulation zone
//   2. Volume-confirmed breakout — 7d + 24h up with above-average turnover
//   3. Oversold bounce in uptrend — RSI dip within established bull structure
// Entries to AVOID:
//   - RSI oversold in downtrend (falling knife)
//   - Counter-trend bounce (dead-cat)
//   - Buying near ATH (no runway / poor R:R)
function patternEngine(a: AssetInput, regime: Regime): number {
  let q = 0.5;

  const rsi = rsiProxy(a.change7d);

  // ── TREND IDENTIFICATION (higher timeframe — 7d as HTF proxy) ──────────────
  const strongUptrend   = a.change7d >  0.10; // +10% weekly = strong bull structure
  const uptrend         = a.change7d >  0.04; // +4% weekly = confirmed uptrend
  const downtrend       = a.change7d < -0.04; // -4% weekly = confirmed downtrend
  const strongDowntrend = a.change7d < -0.10; // -10% weekly = strong bear structure

  // ── HIGH-PROBABILITY SETUPS ────────────────────────────────────────────────
  // #1 BEST: Pullback entry in confirmed uptrend (NakedForexNow bread-and-butter)
  //    7d uptrend established, 24h slight pullback = retest of support = ideal entry
  const pullbackInUptrend = uptrend && a.change24h >= -0.06 && a.change24h < -0.004;

  // #2 GOOD: Momentum continuation — trend + 24h confirming, volume optional
  const trendContinuation = uptrend && a.change24h >= 0.015;

  // #3 SECONDARY: Oversold dip in established uptrend (Cryptoteacher RSI divergence)
  const oversoldInUptrend = strongUptrend && rsi < 32;

  // ── TRAPS TO AVOID ─────────────────────────────────────────────────────────
  // Counter-trend bounce = dead cat = most common retail trap
  const deadCatBounce  = downtrend && a.change24h >  0.025;
  // Falling knife = RSI oversold in downtrend = never buy
  const fallingKnife   = strongDowntrend && a.change24h <= 0;
  // Downtrend continuation
  const downContinuation = downtrend && a.change24h < -0.015;

  if      (pullbackInUptrend)   q += 0.26; // Highest-probability setup
  else if (trendContinuation)   q += 0.17;
  else if (oversoldInUptrend)   q += 0.12;
  else if (uptrend)             q += 0.07; // In uptrend but no clear pattern yet
  else if (deadCatBounce)       q -= 0.18; // Counter-trend trap
  else if (fallingKnife)        q -= 0.28; // Never catch falling knives
  else if (downContinuation)    q -= 0.16;
  else if (downtrend)           q -= 0.10;

  // ── RSI CONFIRMATION (secondary — only meaningful within trend context) ─────
  // RSI oversold is ONLY bullish when IN an uptrend — otherwise it's a warning
  if      (rsi < 20 && uptrend)          q += 0.12; // Very oversold in uptrend = strong entry
  else if (rsi < 30 && uptrend)          q += 0.07;
  else if (rsi < 25 && !uptrend)         q -= 0.06; // Oversold in downtrend = falling knife
  else if (rsi > 82 && uptrend)          q -= 0.05; // Slightly overbought — tighten stops
  else if (rsi > 80 && !uptrend)         q -= 0.12; // Overbought without trend = distribution peak

  // ── VOLUME CONFIRMATION (Cryptoteacher: volume validates every move) ────────
  if (a.volume24h > 0 && a.marketCap > 0) {
    const turnover = a.volume24h / a.marketCap;
    // High volume + up price in uptrend = institutional breakout confirmation
    if (uptrend && a.change24h > 0.02 && turnover > 0.08)  q += 0.11;
    if (uptrend && a.change24h > 0.02 && turnover > 0.20)  q += 0.06;
    // Volume on pullback in uptrend = healthy (accumulation, not distribution)
    if (pullbackInUptrend && turnover > 0.10)               q += 0.04;
    // High volume + down price in downtrend = confirmed distribution
    if (downtrend && a.change24h < -0.02 && turnover > 0.08) q -= 0.11;
    // Price spike without volume = not confirmed = fade it
    if (a.change24h > 0.05 && turnover < 0.02)              q -= 0.09;
    // Low liquidity assets: extra penalty for uncertainty
    if (a.volume24h < 1_000_000)                            q -= 0.08;
  }

  // ── KEY LEVELS / R:R CHECK (NakedForexNow: only trade with room to run) ─────
  // ATH distance = available runway. Near ATH = near resistance = poor R:R.
  if      (a.athChange < -0.80) q += 0.13; // Deep discount — maximum runway + value
  else if (a.athChange < -0.60) q += 0.08;
  else if (a.athChange < -0.35) q += 0.03;
  else if (a.athChange > -0.10) q -= 0.13; // Near ATH = near resistance = avoid

  // ── REGIME MULTIPLIER ────────────────────────────────────────────────────
  if (regime === 'BULL') q += 0.07;
  if (regime === 'BEAR') q -= 0.16; // Stronger bear penalty — macro headwind kills setups

  return Math.max(0, Math.min(1, q));
}

// ── Reasoning Engine: fundamentals + structure + market sentiment ──────────────
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

  // Market structure: HH+HL = bullish (buy pullbacks), LH+LL = bearish (sell rallies)
  // Cryptoteacher: trade WITH structure, not against it
  const bullStruct    = a.change7d >  0.05 && a.change24h >  0;
  const bearStruct    = a.change7d < -0.05 && a.change24h <  0;
  const pullbackEntry = a.change7d >  0.08 && a.change24h >= -0.06 && a.change24h < 0;
  const deadCatBounce = a.change7d < -0.12 && a.change24h >  0.03;
  const strongBear    = a.change7d < -0.18;

  if      (pullbackEntry) { score += 0.10; reasons.push('Pullback in uptrend — high-probability NakedForex accumulation entry'); }
  else if (bullStruct)    { score += 0.08; reasons.push('Bullish structure — higher highs + higher lows confirmed'); }
  else if (deadCatBounce) { score -= 0.12; reasons.push('Dead-cat bounce in downtrend — high failure rate, avoid'); }
  else if (strongBear)    { score -= 0.14; reasons.push('Strong bear structure — capital preservation priority'); }
  else if (bearStruct)    { score -= 0.08; reasons.push('Bearish structure — lower highs + lower lows confirmed'); }

  // R:R Assessment via ATH distance (NakedForexNow: only trade with runway)
  if      (a.athChange < -0.85) { score += 0.08; reasons.push('Deep value — extreme ATH discount = maximum reward potential'); }
  else if (a.athChange < -0.65) { score += 0.05; reasons.push('Value zone — significant ATH discount = good risk:reward'); }
  else if (a.athChange > -0.10) { score -= 0.08; reasons.push('Near ATH resistance — minimal runway, poor risk:reward'); }
  else if (a.athChange > -0.05) { score -= 0.12; reasons.push('At ATH — distribution zone, very high failure rate for new entries'); }

  // Quality DCA zone: major asset oversold on weekly with institutional depth
  // Cryptoteacher: institutions accumulate at key levels with volume
  if ((a.category === 'major' || a.category === 'liquid-stake') &&
      a.change7d < -0.08 && a.change7d > -0.25 && a.volume24h > 300_000_000) {
    score += 0.05; reasons.push('DCA zone — quality asset at support with institutional volume');
  }

  // Fear & Greed: contrarian signal WITH trend context
  if (fg) {
    const v = fg.value;
    const inUptrend = a.change7d > 0.03;
    if      (v < 15 && inUptrend)  { score += 0.12; reasons.push(`Extreme Fear (${v}) in uptrend — historically strongest accumulation zone`); }
    else if (v < 15)               { score += 0.04; reasons.push(`Extreme Fear (${v}) — market-wide fear, watch for trend reversal`); }
    else if (v < 30 && inUptrend)  { score += 0.07; reasons.push(`Fear (${v}) — contrarian buy signal with trend support`); }
    else if (v < 30)               { score += 0.02; reasons.push(`Fear (${v}) — caution: fear without trend confirmation`); }
    else if (v > 85)               { score -= 0.12; reasons.push(`Extreme Greed (${v}) — reduce exposure, protect profits`); }
    else if (v > 70)               { score -= 0.06; reasons.push(`Greed (${v}) — tighten stops, watch for reversal`); }
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

// ── Learning Engine: trend quality + momentum alignment + liquidity ─────────────
// Cryptoteacher: trade only what has institutional backing and clean structure
function learningEngine(a: AssetInput): number {
  let score = 0.5;

  // ── Weekly trend strength (HTF confirmation) ──────────────────────────────
  if      (a.change7d >  0.20) score += 0.18;
  else if (a.change7d >  0.12) score += 0.13;
  else if (a.change7d >  0.06) score += 0.07;
  else if (a.change7d < -0.20) score -= 0.20; // Stronger downtrend penalty
  else if (a.change7d < -0.12) score -= 0.14;
  else if (a.change7d < -0.06) score -= 0.08;

  // ── Multi-timeframe alignment: 7d and 24h in same direction = high conviction ─
  if  (a.change24h >  0.01 && a.change7d >  0.05) score += 0.08; // Both timeframes bullish
  if  (a.change24h < -0.01 && a.change7d < -0.05) score -= 0.09; // Both timeframes bearish

  // ── PULLBACK QUALITY: slight 24h dip in strong 7d uptrend = ideal setup ────
  if (a.change7d > 0.10 && a.change24h >= -0.06 && a.change24h < -0.004) {
    score += 0.08; // Pullback in uptrend — learning engine confirms as best entry type
  }

  // ── Trend-following momentum ──────────────────────────────────────────────
  if (a.change24h >  0.03 && a.change7d >  0.10) score += 0.06; // Strong momentum continuation
  if (a.change24h < -0.03 && a.change7d < -0.10) score -= 0.07; // Strong downtrend continuation

  // ── COUNTER-TREND TRAP DETECTION ─────────────────────────────────────────
  // Bullish divergence in strong downtrend = dead-cat, NOT reversal yet
  if (a.change24h > 0.03 && a.change7d < -0.15) score -= 0.08;
  // Fresh breakdown through weekly support = accelerated selling
  if (a.change24h < -0.04 && a.change7d < -0.08) score -= 0.06;

  // ── Volume quality ────────────────────────────────────────────────────────
  if (a.volume24h > 0 && a.marketCap > 0) {
    const relVol = a.volume24h / a.marketCap;
    if (a.change24h >  0.03 && relVol > 0.10) score += 0.09; // Volume-confirmed breakout
    if (a.change24h < -0.03 && relVol > 0.10) score -= 0.09; // Volume-confirmed breakdown
    if (a.change24h >  0.06 && relVol < 0.02) score -= 0.07; // Spike without volume = suspect
  }

  // ── Institutional liquidity requirement ──────────────────────────────────
  if      (a.volume24h > 1_000_000_000) score += 0.10; // Deep institutional market
  else if (a.volume24h >   100_000_000) score += 0.05;
  else if (a.volume24h <     5_000_000) score -= 0.12; // Insufficient liquidity for safe sizing
  else if (a.volume24h <     1_000_000) score -= 0.18;

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

// ── Master Scoring — High-probability trend-following signal engine ────────────
// Targets 70-90% win rate via:
//   1. Trend alignment gate (pattern engine primary score)
//   2. Consensus requirement (all 4 engines must broadly agree)
//   3. Higher execution thresholds (0.76 BULL/NEUTRAL, 0.78 BEAR)
//   4. Counter-trend block (pattern engine < 0.48 = no active trade)
export function scoreAsset(
  a:          AssetInput,
  regime:     Regime,
  fg:         FGIndex | null,
  allAssets:  AssetInput[],
  heat = 0,
  dd   = 0,
) {
  const pScore    = patternEngine(a, regime);
  const rResult   = reasoningEngine(a, fg);
  const portScore = portfolioEngine(a, allAssets);
  const lScore    = learningEngine(a);
  const gate      = riskGate(a, heat, dd);

  // Weighted ensemble — pattern engine weighted heavier as primary trend filter
  const rawScore   = (pScore * 0.35 + rResult.score * 0.25 + portScore * 0.20 + lScore * 0.20);
  const riskAdj    = gate.pass ? rawScore : rawScore * 0.25;
  const finalScore = parseFloat(((riskAdj * 0.72) + (rawScore * 0.28)).toFixed(4));

  // ── Consensus check: all engines must broadly agree for active trades ──────
  // This prevents one excited engine from overriding genuine weakness elsewhere
  const minEngine    = Math.min(pScore, rResult.score, portScore, lScore);
  const hasConsensus = minEngine >= 0.50;

  // ── Pattern engine is the primary trend gate ──────────────────────────────
  // If pattern engine signals counter-trend (< 0.48), block active buys
  const patternGatePass = pScore >= 0.48;

  // ── Action thresholds — raised from previous 0.65/0.70 ───────────────────
  // BEAR: 0.78 (stricter — fewer setups work in bear markets)
  // BULL/NEUTRAL: 0.76 (high bar — only best pullback/breakout setups)
  const threshold = regime === 'BEAR' ? 0.78 : 0.76;

  let action = 'HOLD';
  if (gate.pass) {
    if (finalScore <= 0.33) {
      action = 'SELL';
    } else if (finalScore <= 0.40) {
      action = 'REDUCE';
    } else if (finalScore >= threshold && hasConsensus && patternGatePass) {
      // High-confidence active execution — all signals aligned
      if      (a.category === 'stablecoin')                                         action = 'LEND';
      else if (a.category === 'liquid-stake')                                       action = finalScore >= 0.82 ? 'EARN' : 'REWARDS';
      else if (finalScore >= 0.90 && a.yieldable && a.lendable)                    action = 'LOOP';
      else if (finalScore >= 0.88 && a.category === 'major' && regime === 'BULL')  action = 'MULTIPLY';
      else if (finalScore >= 0.85 && a.lendable && regime !== 'BULL')              action = 'BORROW';
      else if (finalScore >= 0.83 && a.yieldable)                                  action = 'YIELD';
      else if (finalScore >= 0.80 && a.stakeable && a.lendable)                    action = 'EARN';
      else if (finalScore >= 0.78 && a.stakeable)                                  action = 'STAKE';
      else if (finalScore >= 0.76 && a.lendable && regime !== 'BULL')              action = 'LEND';
      else if (finalScore >= 0.76 && Math.abs(a.change7d ?? 0) > 0.10)            action = 'SWAP';
      else                                                                           action = 'BUY';
    } else {
      // Steady-state: every deployed asset is working — stablecoins lent, staked assets earning, etc.
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
  const trendStr  = a.change7d > 0.04 ? 'UPTREND' : a.change7d < -0.04 ? 'DOWNTREND' : 'RANGING';
  const rationale = `${action}: ${chgPct}% 24h · ${(a.change7d*100).toFixed(1)}% 7d (${trendStr}). Weight ${a.weight}%.${fgStr} ${regime} regime. Gate ${gate.pass ? 'PASS' : 'BLOCK'} · Consensus ${hasConsensus ? 'YES' : 'NO'}.`;

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
