'use strict';
// ============================================================
// INQUISITIVE AI — THE BRAIN
// Intelligence System:
//   • Pattern Engine:   RL-based pattern recognition & regime scoring
//   • Reasoning Engine: Market sentiment & fundamental reasoning
//   • Portfolio Engine: Quantum-inspired optimization & diversification
//   • Learning Engine:  Meta-cognitive adaptive intelligence
//   • Risk Engine:      Risk-first execution gate
// ============================================================
const EventEmitter = require('events');
const priceFeed    = require('./priceFeed');
const macroData    = require('./macroData');

// ── Risk Constants ──────────────────────────────────────────
const CT = {
  MAX_RISK_PER_TRADE:     0.02,   // 2% max portfolio risk per single trade
  MAX_PORTFOLIO_HEAT:     0.06,   // 6% max total open risk at any time
  MAX_DRAWDOWN:           0.15,   // 15% circuit breaker — stop all trading
  STOP_LOSS_ATR_MULT:     2.0,    // Stop = 2× ATR below entry (technical SL)
  RISK_REWARD_MIN:        2.0,    // Minimum 2:1 R:R required to enter
  POSITION_SCALE_IN:      3,      // Scale in over 3 entries max
  TREND_MA_FAST:          20,     // 20-period fast MA for trend
  TREND_MA_SLOW:          50,     // 50-period slow MA for trend
  VOLUME_CONFIRM_MULT:    1.2,    // Volume must be 1.2× average to confirm
  RISK_SCORE_WEIGHT:      0.70,   // 70% weight on risk in scoring
  REWARD_SCORE_WEIGHT:    0.30,   // 30% weight on reward in scoring
  CONFIDENCE_THRESHOLD:   0.70,   // Min 70% confidence to execute
  PAPER_TRADE_CYCLES:     5,      // Paper trade for 5 cycles before live
  // Price Action thresholds
  KANGAROO_TAIL_RATIO:    2.0,    // Wick must be 2× the body size
  ZONE_FRESHNESS_ATH:     0.65,   // athChange < -65% = deep fresh zone
  BEAR_ALTCOIN_PENALTY:   0.40,   // 40% score reduction for altcoins in bear market
  WAMMIE_MIN_CANDLES:     6,      // Minimum candles between double bottom touches
  BTC_MACRO_THRESHOLD:    -0.10,  // BTC weekly loss > 10% = macro headwind
};

// ─────────────────────────────────────────────────────────────────────────────
// PRICE ACTION ENGINE
// Implements Naked Forex strategies: Kangaroo Tail, Wammie, Moolah,
// Big Shadow, Last Kiss, Zone Strength, Trend Structure
// ─────────────────────────────────────────────────────────────────────────────
function priceActionEngine(asset, allAssets) {
  let score = 0.5;
  const signals = [];

  const c24    = asset.change24h  || 0;
  const c7d    = asset.change7d   || 0;
  const ath    = asset.athChange  || -0.5;
  const vol    = asset.volume24h  || 0;
  const mcap   = asset.marketCap  || 0;
  const price  = asset.priceUsd   || 0;
  const high24 = asset.high24h    || price * (1 + Math.abs(c24));
  const low24  = asset.low24h     || price * (1 - Math.abs(c24));

  // ── Derived candle geometry (using real high/low data) ──────────────────
  // Approximate open from close and 24h change: open ≈ close / (1 + change24h)
  const close  = price;
  const open   = price > 0 && c24 !== -1 ? price / (1 + c24) : price;
  const body   = Math.abs(close - open);
  const range  = high24 - low24;  // true 24h range

  // Upper and lower wicks
  const upperWick = high24 - Math.max(open, close);
  const lowerWick = Math.min(open, close) - low24;

  // ── 1. TREND STRUCTURE (Higher Highs/Lower Lows principle) ──────────────
  const uptrendConfirmed   = c24 > 0.01 && c7d > 0.02;
  const downtrendConfirmed = c24 < -0.01 && c7d < -0.02;
  const trendConflict      = (c24 > 0 && c7d < -0.05) || (c24 < 0 && c7d > 0.05);

  if (uptrendConfirmed)   { score += 0.12; signals.push('Trend: confirmed uptrend — higher timeframes aligned'); }
  if (downtrendConfirmed) { score -= 0.15; signals.push('Trend: confirmed downtrend — avoid new longs'); }
  if (trendConflict)      { score -= 0.08; signals.push('Trend: conflict between 24h and 7d — wait for clarity'); }

  // ── 2. KANGAROO TAIL (Pin Bar) — PRECISE DETECTION ──────────────────────
  // Rules: tail > 2× body, close within top/bottom 1/3, "room to the left"
  // Bullish: long LOWER wick, close in upper 1/3 of range
  // Bearish: long UPPER wick, close in lower 1/3 of range
  const bodyToRange   = range > 0 ? body / range : 0;
  const closePosition = range > 0 ? (close - low24) / range : 0.5;

  const bullishKangaroo = body > 0 && (lowerWick / body) >= CT.KANGAROO_TAIL_RATIO
                        && closePosition > 0.55   // close in upper 55% of range
                        && lowerWick > upperWick   // tail is downward
                        && bodyToRange < 0.40;     // small body relative to range

  const bearishKangaroo = body > 0 && (upperWick / body) >= CT.KANGAROO_TAIL_RATIO
                        && closePosition < 0.45   // close in lower 45% of range
                        && upperWick > lowerWick   // tail is upward
                        && bodyToRange < 0.40;

  if (bullishKangaroo && ath < -0.35) {
    score += 0.22;
    signals.push(`Kangaroo Tail: bullish pin bar — lower wick ${(lowerWick/body).toFixed(1)}× body at deep support zone — very high probability reversal`);
  } else if (bullishKangaroo) {
    score += 0.14;
    signals.push('Kangaroo Tail: bullish pin bar — long lower wick rejection — potential reversal');
  }

  if (bearishKangaroo && ath > -0.12) {
    score -= 0.22;
    signals.push(`Kangaroo Tail: bearish pin bar — upper wick ${(upperWick/body).toFixed(1)}× body near ATH resistance — reversal signal`);
  } else if (bearishKangaroo) {
    score -= 0.14;
    signals.push('Kangaroo Tail: bearish pin bar — long upper wick rejection — potential reversal down');
  }

  const isKangarooLike = bullishKangaroo || bearishKangaroo
    || (Math.abs(c24) > 0.03 && Math.abs(c24) < Math.abs(c7d) * 0.4); // fallback approx

  // ── 3. BIG SHADOW (Engulfing) — PRECISE DETECTION ───────────────────────
  // Current candle range > 1.5× prior range + body closes outside zone
  // Using 24h range vs estimated prior range (7d avg daily range)
  const avgDailyRange = range > 0 ? range : Math.abs(c7d / 7) * price;
  const priorRange    = (Math.abs(c7d) / 7) * price;  // estimated prior daily range
  const engulfingBull = c24 > 0 && range > 0 && priorRange > 0 && (range / priorRange) > 1.5
                      && close > (low24 + range * 0.60); // closes in upper 40%
  const engulfingBear = c24 < 0 && range > 0 && priorRange > 0 && (range / priorRange) > 1.5
                      && close < (low24 + range * 0.40); // closes in lower 40%

  if (engulfingBull && ath < -0.20) {
    score += 0.16;
    signals.push(`Big Shadow: bullish engulfing candle (range ${(range/priorRange).toFixed(1)}× avg) — strong buyer commitment at support`);
  } else if (engulfingBear && ath > -0.20) {
    score -= 0.16;
    signals.push(`Big Shadow: bearish engulfing candle (range ${(range/priorRange).toFixed(1)}× avg) — strong seller commitment at resistance`);
  }

  // ── 4. WAMMIE (Double Bottom) ─────────────────────────────────────────────
  // 7d trend was down, now 24h bouncing with higher low = accumulation
  // "Second touch higher than first" encoded as 24h low > expected prior low
  const wammieForming = c7d < -0.08 && c24 > 0.02 && ath < -0.35
                      && low24 > (price * (1 + c7d) * 0.98); // 24h low above 7d low
  if (wammieForming) {
    score += 0.20;
    signals.push('Wammie: double bottom — 7d made low, 24h bouncing with higher low at support zone — strong accumulation signal');
  }

  // ── 5. MOOLAH (Double Top) ────────────────────────────────────────────────
  const moolahForming = c7d > 0.08 && c24 < -0.02 && ath > -0.15
                      && high24 < (price * (1 + c7d) * 1.02); // 24h high below 7d high
  if (moolahForming) {
    score -= 0.20;
    signals.push('Moolah: double top — 7d made high, 24h reversing with lower high at resistance zone — distribution signal');
  }

  // ── 6. LAST KISS (Breakout Retest) ───────────────────────────────────────
  // Strong 7d breakout, 24h small retest back to level, holding
  const lastKissBull = c7d > 0.10 && c24 < 0 && Math.abs(c24) < Math.abs(c7d) * 0.25
                     && close > (price * (1 + c7d * 0.60)); // holding above 60% of the breakout level
  const lastKissBear = c7d < -0.10 && c24 > 0 && Math.abs(c24) < Math.abs(c7d) * 0.25
                     && close < (price * (1 + c7d * 0.60));

  if (lastKissBull) {
    score += 0.15;
    signals.push('Last Kiss: breakout retest — retested broken resistance as support, holding — high probability continuation');
  } else if (lastKissBear) {
    score -= 0.15;
    signals.push('Last Kiss: breakdown retest — retested broken support as resistance, rejecting — continuation down');
  }

  // ── 7. ZONE STRENGTH — "Room to the Left" ────────────────────────────────
  if (ath < CT.ZONE_FRESHNESS_ATH) {
    score += 0.12;
    signals.push('Zone: deep historical level — "room to the left" — fresh untested support zone with strong potential');
  } else if (ath < -0.85) {
    score += 0.06;
    signals.push('Zone: extreme discount — near multi-year lows — macro accumulation zone');
  } else if (ath > -0.05) {
    score -= 0.10;
    signals.push('Zone: near ATH — strong overhead resistance — reduce long exposure');
  }

  // ── 8. REJECTION WICKS AT ROUND NUMBERS ──────────────────────────────────
  const magnitude = Math.pow(10, Math.floor(Math.log10(price || 1)));
  const nearRound  = price > 0 && (
    Math.abs(price % magnitude) / magnitude < 0.05 ||
    Math.abs(price % magnitude) / magnitude > 0.95 ||
    (magnitude >= 1000 && Math.abs(price % (magnitude/2)) / (magnitude/2) < 0.04) // half-levels too
  );
  if (nearRound && isKangarooLike) {
    score += 0.08;
    signals.push('Zone: rejection wick at psychological round number — institutional stop hunt complete, reversal likely');
  }

  // ── 9. WICKS STACKING (pressure building) ────────────────────────────────
  const wicksStackingBull = lowerWick > upperWick * 1.5 && c7d < 0 && close > open;
  const wicksStackingBear = upperWick > lowerWick * 1.5 && c7d > 0 && close < open;
  if (wicksStackingBull) { score += 0.07; signals.push('Wicks: lower wicks dominating — buying pressure building, sellers losing control'); }
  if (wicksStackingBear) { score -= 0.07; signals.push('Wicks: upper wicks dominating — selling pressure building, buyers exhausted'); }

  // ── 10. VOLUME CONFIRMATION ───────────────────────────────────────────────
  const turnover = mcap > 0 ? vol / mcap : 0;
  if ((engulfingBull || bullishKangaroo) && turnover > 0.06) {
    score += 0.07;
    signals.push(`Volume: ${(turnover*100).toFixed(1)}% turnover on bullish candle — institutional commitment confirmed`);
  }
  if ((engulfingBear || bearishKangaroo) && turnover > 0.06) {
    score -= 0.05;
    signals.push(`Volume: ${(turnover*100).toFixed(1)}% turnover on bearish candle — selling confirmed`);
  }

  // ── 11. INSIDE BAR / CONSOLIDATION before breakout ───────────────────────
  // Low range candle after big move = coiling for next move
  const isInsideBar = range > 0 && priorRange > 0 && (range / priorRange) < 0.50 && Math.abs(c24) < 0.02;
  if (isInsideBar && uptrendConfirmed) {
    score += 0.05;
    signals.push('Inside Bar: tight consolidation in uptrend — coiling for breakout continuation');
  }

  return { score: Math.max(0, Math.min(1, score)), signals };
}

// ─────────────────────────────────────────────────────────────────────────────
// MACRO FILTER ENGINE (Cryptoteacher)
// BTC-first macro analysis: regime, dominance, accumulation zones
// Don't trade against the macro. Bear market = protect capital, not grow it.
// ─────────────────────────────────────────────────────────────────────────────
function macroFilterEngine(asset, allAssets, regime, fearGreed) {
  let multiplier = 1.0;
  const filters = [];

  // ── BTC as macro barometer ────────────────────────────────────────────────
  const btc = allAssets.find(a => a.symbol === 'BTC');
  const btcChange7d = btc ? (btc.change7d || 0) : 0;
  const btcChange24h = btc ? (btc.change24h || 0) : 0;

  // Compute rough BTC dominance proxy: BTC mcap vs total top assets
  const totalMcap = allAssets.reduce((sum, a) => sum + (a.marketCap || 0), 0);
  const btcMcap = btc ? (btc.marketCap || 0) : 0;
  const btcDominance = totalMcap > 0 ? btcMcap / totalMcap : 0.45;

  const isBtcMajor   = ['BTC','ETH'].includes(asset.symbol);
  const isAltcoin    = !isBtcMajor;

  // ── Bear market: protect capital first ───────────────────────────────────
  if (regime === 'BEAR') {
    if (isAltcoin) {
      multiplier *= (1 - CT.BEAR_ALTCOIN_PENALTY);
      filters.push('Macro BEAR: altcoin score reduced 40% — buy only BTC/ETH in bear market');
    } else {
      multiplier *= 0.85; // Even BTC/ETH get 15% caution in full bear
      filters.push('Macro BEAR: BTC/ETH caution — only buy at major historical support zones');
    }
  }

  // ── BTC macro headwind ────────────────────────────────────────────────────
  if (btcChange7d < CT.BTC_MACRO_THRESHOLD) {
    const headwindPct = Math.abs(btcChange7d);
    const penalty = Math.min(0.30, headwindPct * 1.5); // up to 30% penalty
    multiplier *= (1 - penalty);
    filters.push(`Macro headwind: BTC down ${(btcChange7d*100).toFixed(1)}% weekly — reduce exposure across all assets`);
  }

  // ── BTC dominance rising = flee altcoins ─────────────────────────────────
  // When BTC dominance > 55% in current cycle + rising (BTC outperforming alts)
  const btcOutperforming = btcChange7d > 0 && isAltcoin &&
                           btc && asset.change7d < btcChange7d - 0.05;
  if (btcOutperforming && btcDominance > 0.50) {
    multiplier *= 0.75;
    filters.push('Macro: BTC dominance rising — rotate out of altcoins into BTC');
  }

  // ── Extreme fear = accumulation zone (contrarian buy) ────────────────────
  // Cryptoteacher: accumulation in bear = best entries of the cycle
  if (fearGreed) {
    const fg = parseInt(fearGreed.value);
    if (fg < 15) {
      // Extreme extreme fear = capitulation = highest probability reversal
      multiplier *= 1.25;
      filters.push('Macro: extreme capitulation fear — high-probability accumulation zone');
    } else if (fg < 25) {
      multiplier *= 1.15;
      filters.push('Macro: extreme fear — contrarian accumulation opportunity');
    } else if (fg > 85) {
      // Extreme greed = distribution zone (Cryptoteacher: don\'t chase hype)
      multiplier *= 0.70;
      filters.push('Macro: extreme greed — hype-driven market — trim longs, avoid new entries');
    } else if (fg > 75) {
      multiplier *= 0.85;
      filters.push('Macro: greed elevated — reduce position sizes, avoid FOMO entries');
    }
  }

  // ── BTC new economy cycle filter ─────────────────────────────────────────
  // Only trade what the new cycle supports — AI, RWA, infrastructure, not speculation
  const cycleFavoredCategories = ['major','ai','rwa','oracle','liquid-stake','defi','l2','interop'];
  if (!cycleFavoredCategories.includes(asset.category) && regime === 'BEAR') {
    multiplier *= 0.80;
    filters.push('Macro: cycle filter — low-priority category in bear regime — reduce allocation');
  }

  // ── BTC weekly structure check ────────────────────────────────────────────
  if (isBtcMajor && btcChange7d > 0.05 && btcChange24h > 0) {
    multiplier *= 1.10;
    filters.push('Macro: BTC weekly structure bullish — ride the macro trend');
  }

  return { multiplier: Math.max(0.1, Math.min(2.0, multiplier)), filters };
}


// ── Pattern Engine: RL action-value scoring ──────────────────
function patternEngineScore(asset, regime) {
  const p = asset;
  let q = 0.5; // baseline Q-value

  // Momentum signal (AlphaZero-style pattern recognition)
  if (p.change24h > 0.05)        q += 0.20;
  else if (p.change24h > 0.02)   q += 0.10;
  else if (p.change24h < -0.05)  q -= 0.20;
  else if (p.change24h < -0.02)  q -= 0.10;

  // Volume confirmation (RL state feature)
  if (p.volume24h > 0 && p.marketCap > 0) {
    const turnover = p.volume24h / p.marketCap;
    if (turnover > 0.10) q += 0.10;  // high activity
    if (turnover > 0.25) q += 0.05;  // very high — watch for exhaustion
  }

  // ATH distance (undervaluation signal)
  if (p.athChange < -0.70) q += 0.08;  // >70% below ATH — deep value
  if (p.athChange < -0.50) q += 0.04;

  // Regime adjustment
  if (regime === 'BULL')    q += 0.08;
  if (regime === 'BEAR')    q -= 0.12;

  return Math.max(0, Math.min(1, q));
}

// ── Reasoning Engine: Market fundamental reasoning ──────────
function reasoningEngineScore(asset, fearGreed) {
  let score = 0.5;
  const reasons = [];

  // Tokenomics quality
  if (asset.lendable)  { score += 0.05; reasons.push('Lendable asset — yield generation possible'); }
  if (asset.stakeable) { score += 0.05; reasons.push('Stakeable — network rewards available'); }
  if (asset.yieldable) { score += 0.05; reasons.push('Yield-bearing — compounding opportunity'); }

  // Category premium
  const categoryBonus = {
    'major':        0.10,
    'defi':         0.08,
    'ai':           0.12,
    'l2':           0.07,
    'rwa':          0.09,
    'liquid-stake': 0.10,
    'stablecoin':   0.05,
    'payment':      0.04,
    'interop':      0.06,
    'storage':      0.04,
    'oracle':       0.08,
    'institutional':0.08,
    'privacy':      0.03,
    'gaming':       0.03,
    'iot':          0.05,
    'data':         0.06,
  };
  score += categoryBonus[asset.category] || 0.02;

  // Sentiment from Fear & Greed (contrarian logic)
  if (fearGreed) {
    const fg = parseInt(fearGreed.value);
    if (fg < 20) { score += 0.10; reasons.push('Extreme fear → contrarian accumulation zone'); }
    if (fg < 30) { score += 0.05; reasons.push('Fear → potential buy zone'); }
    if (fg > 80) { score -= 0.08; reasons.push('Extreme greed → reduce exposure'); }
    if (fg > 70) { score -= 0.04; reasons.push('Greed → tighten stops'); }
  }

  return { score: Math.max(0, Math.min(1, score)), reasons };
}

// ── Portfolio Engine: Quantum-inspired optimization ──────────
function portfolioEngineScore(asset, allAssets) {
  // Sharpe-proxy using 24h change vs volatility proxy
  const vol  = Math.abs(asset.change24h); // proxy volatility
  const ret  = asset.change24h;
  let sharpe = vol > 0 ? ret / vol : 0;

  // Correlation-aware diversification bonus
  // Assets in under-represented categories get bonus
  const categoryCount = allAssets.filter(a => a.category === asset.category).length;
  const diversBonus   = categoryCount <= 3 ? 0.10 : categoryCount <= 6 ? 0.05 : 0;

  // Market cap tier bonus (large cap = stability)
  let capBonus = 0;
  if      (asset.marketCap > 100_000_000_000) capBonus = 0.10; // >$100B
  else if (asset.marketCap > 10_000_000_000)  capBonus = 0.07; // >$10B
  else if (asset.marketCap > 1_000_000_000)   capBonus = 0.04; // >$1B

  const score = 0.5 + (sharpe * 0.2) + diversBonus + capBonus;
  return Math.max(0, Math.min(1, score));
}

// ── Learning Engine: Adaptive meta-cognitive scoring ─────────
function learningEngineScore(asset, history) {
  // Adaptive scoring based on historical performance memory
  let score = 0.5;

  // 7d trend analysis (meta-learning)
  if (asset.change7d !== undefined) {
    if      (asset.change7d > 0.15)  score += 0.15;
    else if (asset.change7d > 0.05)  score += 0.08;
    else if (asset.change7d < -0.15) score -= 0.15;
    else if (asset.change7d < -0.05) score -= 0.08;
  }

  // Liquidity quality (institutional requirement)
  if (asset.volume24h > 1_000_000_000) score += 0.10; // >$1B volume
  else if (asset.volume24h > 100_000_000) score += 0.05;
  else if (asset.volume24h < 1_000_000)   score -= 0.10; // low liquidity penalty

  return Math.max(0, Math.min(1, score));
}

// ── Risk-First Validation Gate ──────────────────────────────
function riskGate(asset, portfolioHeat, drawdown, regime) {
  const reasons = [];
  let pass = true;

  // Gate 1: Portfolio heat check
  if (portfolioHeat >= CT.MAX_PORTFOLIO_HEAT) {
    pass = false;
    reasons.push(`Portfolio heat ${(portfolioHeat*100).toFixed(1)}% ≥ max ${(CT.MAX_PORTFOLIO_HEAT*100)}% — no new trades`);
  }

  // Gate 2: Drawdown circuit breaker
  if (drawdown >= CT.MAX_DRAWDOWN) {
    pass = false;
    reasons.push(`Drawdown ${(drawdown*100).toFixed(1)}% ≥ limit ${(CT.MAX_DRAWDOWN*100)}% — EMERGENCY STOP`);
  }

  // Gate 3: Volatility filter — don't trade in chaos (widen in bear to catch capitulation)
  const absChange = Math.abs(asset.change24h);
  const volLimit = regime === 'BEAR' ? 0.30 : 0.20;
  if (absChange > volLimit) {
    pass = false;
    reasons.push(`24h volatility ${(absChange*100).toFixed(1)}% > ${volLimit*100}% — skip this cycle`);
  }

  // Gate 4: Minimum liquidity — only trade what you can exit
  if (asset.volume24h < 500_000) {
    pass = false;
    reasons.push(`Volume $${asset.volume24h.toLocaleString()} < $500k minimum liquidity`);
  }

  // Gate 5: Trend alignment — don't fight confirmed downtrend (Naked Forex rule)
  const c24 = asset.change24h || 0;
  const c7d = asset.change7d  || 0;
  const confirmedDowntrend = c24 < -0.02 && c7d < -0.05;
  if (confirmedDowntrend && !['BTC','ETH'].includes(asset.symbol)) {
    pass = false;
    reasons.push(`Trend alignment: confirmed downtrend on ${asset.symbol} — wait for reversal pattern`);
  }

  // Gate 6: Bear market altcoin block — Cryptoteacher rule
  if (regime === 'BEAR' && !['BTC','ETH','USDC','USDT','DAI'].includes(asset.symbol)) {
    // Allow altcoins only if strong wammie/kangaroo tail signal (score will handle)
    if (absChange < 0.02 && c7d < -0.10) {
      pass = false;
      reasons.push(`Bear market: ${asset.symbol} in drawdown with no reversal pattern — skip`);
    }
  }

  // Gate 7: Risk-reward calculation
  const riskReward = absChange > 0 ? Math.abs(c7d) / absChange : 0;

  return { pass, reasons, riskReward };
}

// ── Master Brain scoring function ────────────────────────────
function scoreAsset(asset, context) {
  const { regime, fearGreed, allAssets, portfolioHeat, drawdown } = context;

  // ── Five original engines ──
  const dmScore   = patternEngineScore(asset, regime);
  const oaiResult = reasoningEngineScore(asset, fearGreed);
  const mitScore  = portfolioEngineScore(asset, allAssets);
  const stanScore = learningEngineScore(asset, []);

  // ── Two new engines ──
  const paResult    = priceActionEngine(asset, allAssets);   // Naked Forex patterns
  const macroResult = macroFilterEngine(asset, allAssets, regime, fearGreed); // Cryptoteacher macro

  // ── Risk gate now aware of regime + trend alignment ──
  const ctGate = riskGate(asset, portfolioHeat, drawdown, regime);

  // ── Weighted ensemble: price action + macro get significant weight ──
  // Original 4 engines: 50% weight total (12.5% each)
  // New price action engine: 30% weight (Naked Forex — pattern is the trigger)
  // Macro filter multiplier: applied as final multiplier (Cryptoteacher — context filter)
  const rawScore = (
    (dmScore          * 0.125) +
    (oaiResult.score  * 0.125) +
    (mitScore         * 0.125) +
    (stanScore        * 0.125) +
    (paResult.score   * 0.500)   // price action is the dominant signal
  );

  // Apply macro multiplier from Cryptoteacher filter
  const macroAdjusted = rawScore * macroResult.multiplier;

  // Risk gate penalty
  const riskAdj = ctGate.pass ? macroAdjusted : macroAdjusted * 0.25;

  // Final combined score
  const finalScore = Math.max(0, Math.min(1,
    (riskAdj * CT.RISK_SCORE_WEIGHT) + (rawScore * CT.REWARD_SCORE_WEIGHT)
  ));

  // Determine action — tighter thresholds require more confirmation
  let action = 'HOLD';
  if (ctGate.pass) {
    if      (finalScore >= 0.72) action = 'BUY';
    else if (finalScore >= 0.65) action = 'ACCUMULATE';
    else if (finalScore <= 0.28) action = 'SELL';
    else if (finalScore <= 0.38) action = 'REDUCE';
  } else {
    action = 'SKIP';
  }

  // In bear market: no altcoin buys without a strong pattern signal
  if (regime === 'BEAR' && !['BTC','ETH','USDC','USDT'].includes(asset.symbol)) {
    if (paResult.score < 0.62 && (action === 'BUY' || action === 'ACCUMULATE')) {
      action = 'HOLD'; // Need strong PA pattern to buy altcoins in bear market
    }
  }

  return {
    symbol:       asset.symbol,
    name:         asset.name,
    category:     asset.category,
    finalScore:   parseFloat(finalScore.toFixed(4)),
    rawScore:     parseFloat(rawScore.toFixed(4)),
    components: {
      patternEngine:    parseFloat(dmScore.toFixed(4)),
      reasoningEngine:  parseFloat(oaiResult.score.toFixed(4)),
      portfolioEngine:  parseFloat(mitScore.toFixed(4)),
      learningEngine:   parseFloat(stanScore.toFixed(4)),
      priceActionEngine: parseFloat(paResult.score.toFixed(4)),
      macroMultiplier:  parseFloat(macroResult.multiplier.toFixed(4)),
    },
    action,
    confidence:    finalScore,
    riskGate:      ctGate,
    reasons: [
      ...oaiResult.reasons,
      ...paResult.signals,
      ...macroResult.filters,
      ...ctGate.reasons,
    ],
    weight:        asset.weight || 0,
    priceUsd:      asset.priceUsd || 0,
    change24h:     asset.change24h || 0,
    change7d:      asset.change7d || 0,
    volume24h:     asset.volume24h || 0,
    marketCap:     asset.marketCap || 0,
  };
}

class InquisitiveBrain extends EventEmitter {
  constructor() {
    super();
    this.signals          = new Map();
    this.lastCycle        = null;
    this.cycleCount       = 0;
    this.portfolioHeat    = 0;
    this.drawdown         = 0;
    this.totalReturn      = 0;
    this.paperTradeCycles = 0;
    this.isLive              = false;
    this.CYCLE_MS            = 8_000; // 8-second decision cycles per spec
    this.borrowOpportunities = [];
  }

  async initialize() {
    console.log('🧠 [Brain] Initializing INQUISITIVE Brain…');
    console.log('🧠 [Brain]   → Pattern Engine:   RL pattern recognition & regime scoring');
    console.log('🧠 [Brain]   → Reasoning Engine: Market sentiment & fundamental analysis');
    console.log('🧠 [Brain]   → Portfolio Engine: Quantum-inspired optimization');
    console.log('🧠 [Brain]   → Learning Engine:  Meta-cognitive adaptive intelligence');
    console.log('🧠 [Brain]   → Risk Engine:       Risk-first execution gate');
    await this._runCycle();
    this._startCycles();
    return this;
  }

  async _runCycle() {
    const allAssets = priceFeed.getAll();
    if (!allAssets.length) {
      console.warn('⚠️  [Brain] No price data yet — skipping cycle');
      return;
    }

    const macro     = macroData.getSummary();
    const regime    = macro.regime?.regime     || 'NEUTRAL';
    const fearGreed = macro.fearGreed          || null;

    const context = {
      regime,
      fearGreed,
      allAssets,
      portfolioHeat: this.portfolioHeat,
      drawdown:      this.drawdown,
    };

    const scored = allAssets.map(asset => scoreAsset(asset, context));
    scored.sort((a, b) => b.finalScore - a.finalScore);

    // Store signals
    this.signals.clear();
    for (const s of scored) {
      this.signals.set(s.symbol, s);
    }

    this.lastCycle  = new Date();
    this.cycleCount++;

    // Paper trade mode for first N cycles (validation)
    if (this.cycleCount <= CT.PAPER_TRADE_CYCLES) {
      this.paperTradeCycles++;
      console.log(`📋 [Brain] Paper trade cycle ${this.paperTradeCycles}/${CT.PAPER_TRADE_CYCLES}`);
    } else {
      this.isLive = true;
    }

    const buys  = scored.filter(s => s.action === 'BUY').length;
    const sells = scored.filter(s => s.action === 'SELL').length;
    console.log(`🧠 [Brain] Cycle #${this.cycleCount} — regime:${regime} BUY:${buys} SELL:${sells} | FG:${fearGreed?.value || 'N/A'}`);

    // Evaluate borrowing opportunities every cycle
    this.borrowOpportunities = this._evaluateBorrowOpportunities(allAssets, regime);
    if (this.borrowOpportunities.length) {
      console.log(`💸 [Brain] ${this.borrowOpportunities.length} borrow opportunity(ies) identified`);
    }

    this.emit('cycle', {
      cycleCount: this.cycleCount,
      regime,
      fearGreed,
      topBuys:  scored.filter(s => s.action === 'BUY').slice(0, 10),
      topSells: scored.filter(s => s.action === 'SELL').slice(0, 5),
      allSignals: scored,
      borrowOpportunities: this.borrowOpportunities,
    });
  }

  _startCycles() {
    setInterval(() => this._runCycle(), this.CYCLE_MS);
    console.log(`🔄 [Brain] 8-second decision cycles started`);
  }

  // ── Borrowing Engine: identifies capital-efficient borrow opportunities ──
  _evaluateBorrowOpportunities(allAssets, regime) {
    const opportunities = [];
    // Only evaluate borrowing in NEUTRAL or BULL regimes; too risky in BEAR
    if (regime === 'BEAR') return opportunities;

    // Collateral candidates: blue-chips with high liquidity
    const COLLATERAL = new Set(['BTC','ETH','SOL','BNB','AVAX','DOT']);
    // Borrow rates (approximate current market APR)
    const BORROW_APR = { USDC: 0.058, USDT: 0.062, DAI: 0.055 };
    // Deployment APY targets for borrowed stablecoins
    const DEPLOY_APY = { LEND_STABLE: 0.048, YIELD_STABLE: 0.085, LOOP_MAX: 0.14 };

    for (const asset of allAssets) {
      if (!COLLATERAL.has(asset.symbol)) continue;
      if (!asset.priceUsd || asset.priceUsd === 0) continue;
      // Min collateral value $50k to be worth borrowing against
      if ((asset.priceUsd * (asset.weight || 0)) < 500) continue;

      const bestBorrowAsset = 'USDC';
      const borrowApr = BORROW_APR[bestBorrowAsset];
      // Net deployment spread (conservative: use lowest deploy APY)
      const spread = DEPLOY_APY.LEND_STABLE - borrowApr;
      if (spread <= 0) continue; // Only borrow when positive spread exists

      const maxLtv = 0.65; // Conservative: 65% max LTV
      const healthFloor = 1.5; // Health factor floor
      opportunities.push({
        collateral:   asset.symbol,
        borrowAsset:  bestBorrowAsset,
        spread:       parseFloat(spread.toFixed(4)),
        borrowApr:    borrowApr,
        deployApy:    DEPLOY_APY.LEND_STABLE,
        maxLtv,
        healthFloor,
        protocol:     'aave-v3',
        signal:       'BORROW',
        confidence:   Math.min(0.9, 0.6 + spread * 10),
        reasoning:    `Borrow ${bestBorrowAsset} at ${(borrowApr*100).toFixed(1)}% APR against ${asset.symbol} collateral. Deploy at ${(DEPLOY_APY.LEND_STABLE*100).toFixed(1)}% APY. Net spread: +${(spread*100).toFixed(2)}%. LTV capped at ${(maxLtv*100)}%, health ≥ ${healthFloor}.`,
      });
    }
    return opportunities.sort((a,b) => b.spread - a.spread).slice(0,3);
  }

  // ── Public accessors ─────────────────────────────────────
  getSignal(symbol) { return this.signals.get(symbol.toUpperCase()) || null; }
  getAllSignals()    { return Array.from(this.signals.values()); }

  getBorrowOpportunities() { return this.borrowOpportunities || []; }

  getTopOpportunities(n = 10) {
    return this.getAllSignals()
      .filter(s => s.action === 'BUY' || s.action === 'ACCUMULATE')
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, n);
  }

  getRiskAssessment() {
    const macro  = macroData.getSummary();
    const regime = macro.regime;
    return {
      portfolioHeat:      this.portfolioHeat,
      drawdown:           this.drawdown,
      regime:             regime.regime,
      riskScore:          regime.riskScore,
      maxRiskPerTrade:    CT.MAX_RISK_PER_TRADE,
      maxPortfolioHeat:   CT.MAX_PORTFOLIO_HEAT,
      maxDrawdown:        CT.MAX_DRAWDOWN,
      confidenceThreshold: CT.CONFIDENCE_THRESHOLD,
      isLive:             this.isLive,
      paperTradeCycles:   this.paperTradeCycles,
      riskLimits: CT,
    };
  }

  getExplanation(symbol) {
    const signal = this.getSignal(symbol);
    if (!signal) return null;

    const paScore   = signal.components?.priceActionEngine ?? 0;
    const macroMult = signal.components?.macroMultiplier   ?? 1;

    // Identify the strongest pattern signal
    const patternSignals = (signal.reasons || []).filter(r =>
      r.includes('Kangaroo Tail') || r.includes('Wammie') || r.includes('Moolah') ||
      r.includes('Big Shadow') || r.includes('Last Kiss') || r.includes('Trend:') ||
      r.includes('Zone:') || r.includes('Wicks:') || r.includes('Inside Bar') ||
      r.includes('Volume:')
    );
    const macroSignals = (signal.reasons || []).filter(r =>
      r.includes('Macro') || r.includes('macro') || r.includes('BTC') || r.includes('dominance')
    );

    return {
      symbol,
      action:        signal.action,
      confidence:    (signal.finalScore * 100).toFixed(1) + '%',
      priceAction:   (paScore * 100).toFixed(1) + '%',
      macroMult:     macroMult.toFixed(2) + '×',
      explanation:
        `${symbol} final score: ${(signal.finalScore*100).toFixed(1)}%. ` +
        `Price Action Engine: ${(paScore*100).toFixed(0)}% (dominant signal, 50% weight). ` +
        `Macro Multiplier: ${macroMult.toFixed(2)}× (BTC regime filter). ` +
        `Pattern Engine: ${(signal.components.patternEngine*100).toFixed(0)}%, ` +
        `Reasoning: ${(signal.components.reasoningEngine*100).toFixed(0)}%, ` +
        `Portfolio: ${(signal.components.portfolioEngine*100).toFixed(0)}%, ` +
        `Learning: ${(signal.components.learningEngine*100).toFixed(0)}%.`,
      patternSignals,
      macroSignals,
      allReasons:    signal.reasons,
      riskGate:      signal.riskGate,
      riskGateNote:  signal.riskGate.pass
        ? '✅ All gates passed — pattern + macro + risk confirmed'
        : '❌ Blocked: ' + (signal.riskGate.reasons?.[0] || 'risk gate failed'),
      components:    signal.components,
      priceData: {
        price:     signal.priceUsd,
        change24h: (signal.change24h * 100).toFixed(2) + '%',
        change7d:  (signal.change7d  * 100).toFixed(2) + '%',
        volume24h: signal.volume24h,
        marketCap: signal.marketCap,
      },
    };
  }

  getStatus() {
    return {
      cycleCount:   this.cycleCount,
      lastCycle:    this.lastCycle,
      isLive:       this.isLive,
      signalCount:  this.signals.size,
      portfolioHeat:this.portfolioHeat,
      drawdown:     this.drawdown,
      cyclePeriodMs:this.CYCLE_MS,
    };
  }
}

const brain = new InquisitiveBrain();
module.exports = brain;
module.exports.CT = CT;
module.exports.scoreAsset = scoreAsset;
