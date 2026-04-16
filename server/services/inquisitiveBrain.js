'use strict';
// ============================================================
// INQUISITIVE AI — BRAIN (production)
// 5-engine scoring over live prices + real OHLC candles.
// Exports: default (brain instance), CT, scoreAll, scoreOne, ENGINES, ASSET_REGISTRY
// ============================================================
const EventEmitter = require('events');
const priceFeed = require('./priceFeed');
const macroData = require('./macroData');
const ohlcFeed = require('./ohlcFeed');

const CT = Object.freeze({
  MAX_RISK_PER_TRADE: 0.02,
  MAX_PORTFOLIO_HEAT: 0.06,
  MAX_DRAWDOWN:       0.15,
  STOP_LOSS_ATR_MULT: 2.0,
  RISK_REWARD_MIN:    2.0,
  POSITION_SCALE_IN:  3,
  TREND_MA_FAST:      20,
  TREND_MA_SLOW:      50,
  VOLUME_CONFIRM_MULT: 1.5,
  MIN_ACTION_SCORE:   0.72,
  SELL_ACTION_SCORE:  0.30,
});

const ENGINE_WEIGHTS = Object.freeze({
  pattern: 0.25, reasoning: 0.20, portfolio: 0.25, learning: 0.15, risk: 0.15,
});

function sma(values, n) {
  if (values.length < n) return null;
  let s = 0; for (let i = values.length - n; i < values.length; i++) s += values[i];
  return s / n;
}
function atr(candles, n = 14) {
  if (candles.length < n + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i-1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return sma(trs, n);
}

class Brain extends EventEmitter {
  constructor() { super(); this._latest = []; }

  _patternEngine(asset, p, candles) {
    if (!candles || candles.length < CT.TREND_MA_SLOW) return 0.5;
    const closes = candles.map(c => c.close);
    const fast = sma(closes, CT.TREND_MA_FAST);
    const slow = sma(closes, CT.TREND_MA_SLOW);
    if (!fast || !slow) return 0.5;
    let score = 0.5;
    if (fast > slow) score += 0.15;                       // uptrend
    else             score -= 0.15;                       // downtrend
    // Last candle bullish engulfing?
    const last = candles[candles.length - 1], prev = candles[candles.length - 2];
    if (last.close > prev.open && last.open < prev.close && last.close > last.open) score += 0.1;
    // Volume confirm
    const volMean = sma(candles.slice(-21, -1).map(c => c.volume), 20) || 1;
    if (last.volume > volMean * CT.VOLUME_CONFIRM_MULT && last.close > last.open) score += 0.08;
    // Long lower wick = reversal
    const body = Math.abs(last.close - last.open);
    const lowerWick = Math.min(last.close, last.open) - last.low;
    if (body > 0 && lowerWick > body * 2 && last.close > last.open) score += 0.05;
    return Math.max(0, Math.min(1, score));
  }

  _reasoningEngine(asset, p) {
    let score = 0.5;
    if ((p.change24h || 0) > 0.03) score += 0.08;
    if ((p.change24h || 0) < -0.05) score -= 0.1;
    if ((p.change7d  || 0) > 0.1)  score += 0.06;
    const macro = macroData.get();
    if (macro.fearGreed && macro.fearGreed < 25) score += 0.1;  // extreme fear = contrarian buy
    if (macro.fearGreed && macro.fearGreed > 80) score -= 0.1;
    if (asset.category === 'stablecoin') score = 0.5;           // neutral for stables
    return Math.max(0, Math.min(1, score));
  }

  _portfolioEngine(asset, p) {
    const target = asset.targetWeight || 0;
    if (!target) return 0.5;
    // If ATH distance is large, room to run
    if (p.athChangePct !== undefined && p.athChangePct < -0.5) return 0.65;
    return 0.5;
  }

  _learningEngine(asset, p) {
    // Simple momentum-confidence proxy until learning history is persisted
    const m = (p.change1h || 0);
    return Math.max(0, Math.min(1, 0.5 + m * 5));
  }

  _riskEngine(asset, p, candles) {
    const reasons = [];
    // Drawdown from ATH
    if (p.athChangePct !== undefined && p.athChangePct < -CT.MAX_DRAWDOWN) {
      // being far below ATH is not a risk veto (it's opportunity), but extreme gaps warrant caution
    }
    // Stale price = do not trade
    if (p.stale) { reasons.push('price stale'); return { pass: false, reasons }; }
    // Insufficient OHLC history
    if (!candles || candles.length < CT.TREND_MA_SLOW) {
      reasons.push('insufficient candles'); return { pass: false, reasons };
    }
    return { pass: true, reasons };
  }

  async scoreAll() {
    const prices = priceFeed.getAll();
    const assets = priceFeed.getRegistry();
    if (!priceFeed.isReady()) return [];
    const scored = [];
    for (const a of assets) {
      const p = prices[a.symbol]; if (!p) continue;
      const candles = ohlcFeed.get(a.symbol, '15m', 200);
      const paScore = this._patternEngine(a, p, candles);
      const rScore  = this._reasoningEngine(a, p);
      const pfScore = this._portfolioEngine(a, p);
      const lScore  = this._learningEngine(a, p);
      const riskGate = this._riskEngine(a, p, candles);

      const combined =
          paScore * ENGINE_WEIGHTS.pattern
        + rScore  * ENGINE_WEIGHTS.reasoning
        + pfScore * ENGINE_WEIGHTS.portfolio
        + lScore  * ENGINE_WEIGHTS.learning;

      let action = 'HOLD';
      if (riskGate.pass) {
        if      (combined >= CT.MIN_ACTION_SCORE)  action = 'BUY';
        else if (combined <= CT.SELL_ACTION_SCORE) action = 'SELL';
      }

      scored.push({
        symbol:       a.symbol,
        assetAddress: a.onchainAddress || '0x0000000000000000000000000000000000000000',
        action,
        finalScore:   Number(combined.toFixed(4)),
        targetBps:    Math.round((a.targetWeight || 0) * 10_000),
        components:   { pattern: paScore, reasoning: rScore, portfolio: pfScore, learning: lScore },
        riskGate,
        price:        p.priceUsd,
        priceSource:  p.source,
        fetchedAt:    p.fetchedAt,
        timestamp:    Date.now(),
      });
    }
    this._latest = scored;
    this.emit('scored', scored);
    return scored;
  }
  scoreOne(symbol) {
    const s = this._latest.find(x => x.symbol === symbol.toUpperCase());
    return s || null;
  }
  getLatestSignals() { return this._latest; }
}

const brain = new Brain();
module.exports = brain;
module.exports.Brain = Brain;
module.exports.CT = CT;
module.exports.ENGINE_WEIGHTS = ENGINE_WEIGHTS;
module.exports.ENGINES = ['PatternEngine','ReasoningEngine','PortfolioEngine','LearningEngine','RiskEngine'];
module.exports.scoreAll = (...a) => brain.scoreAll(...a);
module.exports.scoreOne = (...a) => brain.scoreOne(...a);
module.exports.getLatestSignals = (...a) => brain.getLatestSignals(...a);
module.exports.ASSET_REGISTRY = priceFeed.ASSET_REGISTRY;
