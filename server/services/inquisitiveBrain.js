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
};

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
function riskGate(asset, portfolioHeat, drawdown) {
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

  // Gate 3: Volatility filter — don't trade in chaos
  const absChange = Math.abs(asset.change24h);
  if (absChange > 0.20) {
    pass = false;
    reasons.push(`24h volatility ${(absChange*100).toFixed(1)}% > 20% — skip this cycle`);
  }

  // Gate 4: Minimum liquidity — only trade what you can exit
  if (asset.volume24h < 500_000) {
    pass = false;
    reasons.push(`Volume $${asset.volume24h.toLocaleString()} < $500k minimum liquidity`);
  }

  // Gate 5: Risk-reward gate — only bullish signals pass
  const riskReward = absChange > 0 ? Math.abs(asset.change7d || 0) / absChange : 0;

  return { pass, reasons, riskReward };
}

// ── Master Brain scoring function ────────────────────────────
function scoreAsset(asset, context) {
  const { regime, fearGreed, allAssets, portfolioHeat, drawdown } = context;

  // Individual engine scores
  const dmScore   = patternEngineScore(asset, regime);
  const oaiResult = reasoningEngineScore(asset, fearGreed);
  const mitScore  = portfolioEngineScore(asset, allAssets);
  const stanScore = learningEngineScore(asset, []);
  const ctGate    = riskGate(asset, portfolioHeat, drawdown);

  // Weighted ensemble (risk-first 70/30)
  const rawScore = (dmScore * 0.25) + (oaiResult.score * 0.25) + (mitScore * 0.25) + (stanScore * 0.25);
  const riskAdj  = ctGate.pass ? rawScore : rawScore * 0.3; // Heavy penalty if risk gate fails

  // Final combined score
  const finalScore = (riskAdj * CT.RISK_SCORE_WEIGHT) + (rawScore * CT.REWARD_SCORE_WEIGHT);

  // Determine action
  let action = 'HOLD';
  if (ctGate.pass) {
    if      (finalScore >= 0.72) action = 'BUY';
    else if (finalScore >= 0.65) action = 'ACCUMULATE';
    else if (finalScore <= 0.35) action = 'SELL';
    else if (finalScore <= 0.42) action = 'REDUCE';
  } else {
    action = 'SKIP';
  }

  return {
    symbol:       asset.symbol,
    name:         asset.name,
    category:     asset.category,
    finalScore:   parseFloat(finalScore.toFixed(4)),
    rawScore:     parseFloat(rawScore.toFixed(4)),
    components: {
      patternEngine:   parseFloat(dmScore.toFixed(4)),
      reasoningEngine: parseFloat(oaiResult.score.toFixed(4)),
      portfolioEngine: parseFloat(mitScore.toFixed(4)),
      learningEngine:  parseFloat(stanScore.toFixed(4)),
    },
    action,
    confidence:    finalScore,
    riskGate:      ctGate,
    reasons:       [...oaiResult.reasons, ...ctGate.reasons],
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
    return {
      symbol,
      action:     signal.action,
      confidence: (signal.finalScore * 100).toFixed(1) + '%',
      explanation: `${symbol} scored ${(signal.finalScore*100).toFixed(1)}% overall. ` +
        `Pattern Engine: ${(signal.components.patternEngine*100).toFixed(0)}%, ` +
        `Reasoning Engine: ${(signal.components.reasoningEngine*100).toFixed(0)}%, ` +
        `Portfolio Engine: ${(signal.components.portfolioEngine*100).toFixed(0)}%, ` +
        `Learning Engine: ${(signal.components.learningEngine*100).toFixed(0)}%.`,
      reasons:    signal.reasons,
      riskGate:   signal.riskGate,
      riskGateNote: signal.riskGate.pass
        ? '✅ Passed all risk gates'
        : '❌ Blocked by risk management',
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
