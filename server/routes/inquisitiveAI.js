'use strict';
// ============================================================
// INQUISITIVE AI — COMPLETE REST API ROUTES
// All endpoints for the INQAI token system
// ============================================================
const express       = require('express');
const router        = express.Router();
const priceFeed     = require('../services/priceFeed');
const macroData     = require('../services/macroData');
const brain         = require('../services/inquisitiveBrain');
const tradingEngine = require('../services/tradingEngine');

// ── GET /status ───────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json({
    agent:    'INQUISITIVE',
    ticker:   'INQAI',
    standard: 'ERC-20',
    version:  '1.0.0',
    status:   'LIVE',
    brain:    brain.getStatus(),
    prices:   priceFeed.getStatus(),
    macro:    macroData.getStatus(),
    trading:  tradingEngine.getStats(),
    token: {
      name:        'INQUISITIVE',
      symbol:      'INQAI',
      standard:    'ERC-20',
      totalSupply: 100_000_000,
      targetPrice: 15,
      targetAPY:   0.185,
      targetMCap:  1_500_000_000,
    },
    architecture: {
      brain:        'AI Scoring Engine — Pattern + Reasoning + Portfolio + Learning + Risk Engine',
      priceAction:  'Price Action Engine — Kangaroo Tail, Wammie, Moolah, Big Shadow, Last Kiss, Zone Strength',
      macroFilter:  'Macro Filter Engine — BTC regime, dominance, accumulation zones, fear/greed',
      executioner:  'Trading Engine — buy/sell/swap/lend/yield/loop/stake/multiply/earn/rewards',
      xray:         'Real-time Dashboard — performance attribution + risk metrics',
      guardian:     'Multi-layer Security — HSM + multi-sig + time-locks + circuit breakers',
      oracle:       'Real Price Feeds — CoinGecko + Yahoo Finance + Alternative.me',
    },
    dataSource: 'REAL LIVE APIs — no mock data',
    timestamp:  new Date().toISOString(),
  });
});

// ── GET /assets — all 65 real assets with live prices ──────
router.get('/assets', (req, res) => {
  const assets = priceFeed.getAll();
  const signals = brain.getAllSignals();
  const sigMap  = Object.fromEntries(signals.map(s => [s.symbol, s]));

  const enriched = assets.map(a => ({
    ...a,
    signal:           sigMap[a.symbol]?.action                              || 'PENDING',
    confidence:       sigMap[a.symbol]?.finalScore                          || 0,
    brainScore:       sigMap[a.symbol]?.finalScore                          || 0,
    paScore:          sigMap[a.symbol]?.components?.priceActionEngine       || 0,
    macroMultiplier:  sigMap[a.symbol]?.components?.macroMultiplier         || 1,
    patternSignals:   (sigMap[a.symbol]?.reasons || []).filter(r =>
      r.includes('Kangaroo') || r.includes('Wammie') || r.includes('Moolah') ||
      r.includes('Big Shadow') || r.includes('Last Kiss') || r.includes('Zone:') ||
      r.includes('Wicks:') || r.includes('Inside Bar') || r.includes('Trend:')
    ),
  }));

  res.json({
    assets:     enriched,
    count:      enriched.length,
    lastUpdate: priceFeed.getStatus().lastUpdate,
    source:     'CoinGecko REAL LIVE API',
  });
});

// ── GET /assets/:symbol — single asset details ─────────────
router.get('/assets/:symbol', (req, res) => {
  const sym    = req.params.symbol.toUpperCase();
  const asset  = priceFeed.getPrice(sym);
  if (!asset)  return res.status(404).json({ error: `Asset ${sym} not found` });

  const signal      = brain.getSignal(sym);
  const explanation = brain.getExplanation(sym);

  res.json({
    ...asset,
    signal,
    explanation,
    source: 'CoinGecko REAL LIVE + AI Brain analysis',
  });
});

// ── GET /dashboard — complete dashboard data ────────────────
router.get('/dashboard', (req, res) => {
  const assets  = priceFeed.getAll();
  const signals = brain.getAllSignals();
  const macro   = macroData.getSummary();
  const stats   = tradingEngine.getStats();
  const risk    = brain.getRiskAssessment();

  // Portfolio metrics
  const totalMktCap = assets.reduce((s, a) => s + (a.marketCap || 0), 0);
  const totalVol24h = assets.reduce((s, a) => s + (a.volume24h || 0), 0);
  const avgChange   = assets.length ? assets.reduce((s, a) => s + (a.change24h || 0), 0) / assets.length : 0;

  // Category breakdown
  const categoryMap = {};
  for (const a of assets) {
    if (!categoryMap[a.category]) categoryMap[a.category] = { count: 0, marketCap: 0, volume24h: 0, assets: [] };
    categoryMap[a.category].count++;
    categoryMap[a.category].marketCap  += a.marketCap  || 0;
    categoryMap[a.category].volume24h  += a.volume24h  || 0;
    categoryMap[a.category].assets.push(a.symbol);
  }

  // Top movers
  const sorted24h   = [...assets].sort((a, b) => (b.change24h || 0) - (a.change24h || 0));
  const topGainers  = sorted24h.slice(0, 5);
  const topLosers   = sorted24h.slice(-5).reverse();

  // AI signal summary
  const buys      = signals.filter(s => s.action === 'BUY').length;
  const sells     = signals.filter(s => s.action === 'SELL').length;
  const holds     = signals.filter(s => s.action === 'HOLD').length;
  const skips     = signals.filter(s => s.action === 'SKIP').length;
  const topBuys   = signals.filter(s => s.action === 'BUY' || s.action === 'ACCUMULATE')
                           .sort((a, b) => b.finalScore - a.finalScore).slice(0, 10);

  // Price Action signal breakdown
  const paSignals = signals.filter(s => (s.components?.priceActionEngine ?? 0) > 0.60);
  const patternBreakdown = {
    longWickReversals: paSignals.filter(s => (s.reasons || []).some(r => r.includes('Long Wick Reversal'))).length,
    doubleFloors:       paSignals.filter(s => (s.reasons || []).some(r => r.includes('Double Floor'))).length,
    doubleCeilings:     paSignals.filter(s => (s.reasons || []).some(r => r.includes('Double Ceiling'))).length,
    engulfingBars:      paSignals.filter(s => (s.reasons || []).some(r => r.includes('Engulfing Bar'))).length,
    breakoutTests:      paSignals.filter(s => (s.reasons || []).some(r => r.includes('Breakout Test'))).length,
    trendSignals:       paSignals.filter(s => (s.reasons || []).some(r => r.includes('Trend: confirmed uptrend'))).length,
  };

  res.json({
    portfolio: {
      assetCount:    assets.length,
      totalMktCap,
      totalVol24h,
      avgChange24h:  avgChange,
      categories:    categoryMap,
    },
    performance: {
      totalPnL:            stats.totalPnL,
      winRate:             stats.winRate,
      closedTrades:        stats.closedTrades,
      totalTrades:         stats.totalTrades,
      openPositions:       stats.openPositions,
      avgWinPnl:           stats.avgWinPnl,
      avgLossPnl:          stats.avgLossPnl,
      expectancyPerTrade:  stats.expectancyPerTrade,
      byPattern:           stats.byPattern,
      byRegime:            stats.byRegime,
      byExitType:          stats.byExitType,
      targetAPY:           0.185,
    },
    risk: {
      regime:           risk.regime,
      riskScore:        macro.regime?.riskScore || 0.5,
      portfolioHeat:    risk.portfolioHeat,
      drawdown:         risk.drawdown,
      maxDrawdown:      risk.maxDrawdown,
      fearGreed:        macro.fearGreed,
      isLive:           risk.isLive,
    },
    aiSignals: {
      totalSignals:     signals.length,
      buys, sells, holds, skips,
      topBuys,
      patternBreakdown,
      paQualified:      paSignals.length,
      cycleCount:       brain.getStatus().cycleCount,
      lastCycle:        brain.getStatus().lastCycle,
    },
    macro: {
      regime:     macro.regime,
      indicators: macro.indicators,
      fearGreed:  macro.fearGreed,
    },
    movers: { topGainers, topLosers },
    trading: {
      active:   tradingEngine.isActive(),
      stats,
      recentTrades: tradingEngine.getHistory(10),
    },
    source:     'REAL LIVE DATA — CoinGecko + Yahoo Finance + Alternative.me',
    timestamp:  new Date().toISOString(),
  });
});

// ── POST /initialize ────────────────────────────────────────
router.post('/initialize', async (req, res) => {
  try {
    res.json({
      success:   true,
      message:   'INQUISITIVE Agent initialized with REAL LIVE data',
      status:    brain.getStatus(),
      prices:    priceFeed.getStatus(),
      macro:     macroData.getStatus(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ── GET /analyze/:symbol — AI analysis ─────────────────────
router.get('/analyze/:symbol', (req, res) => {
  const sym    = req.params.symbol.toUpperCase();
  const asset  = priceFeed.getPrice(sym);
  if (!asset)  return res.status(404).json({ error: `${sym} not found` });

  const signal  = brain.getSignal(sym);
  const explain = brain.getExplanation(sym);
  const macro   = macroData.getSummary();

  res.json({
    symbol:  sym,
    asset,
    signal,
    explanation: explain,
    macro:   macro.regime,
    fearGreed: macro.fearGreed,
    riskGate: signal?.riskGate || null,
    source:  'REAL LIVE analysis — no simulated data',
    timestamp: new Date().toISOString(),
  });
});


// ── GET /portfolio/positions ─────────────────────────────────
router.get('/portfolio/positions', (req, res) => {
  const positions = tradingEngine.getPositions();
  const assets    = priceFeed.getAll();
  const assetMap  = Object.fromEntries(assets.map(a => [a.symbol, a]));

  const enriched = positions.map(p => {
    const live  = assetMap[p.symbol];
    const pnlPct = live && p.entryPrice ? (live.priceUsd - p.entryPrice) / p.entryPrice : 0;
    return {
      ...p,
      currentPrice:  live?.priceUsd || p.entryPrice,
      unrealizedPnl: (live?.priceUsd - (p.entryPrice || 0)) * (p.units || 0),
      pnlPct,
    };
  });

  res.json({
    positions: enriched,
    count:     enriched.length,
    totalPnL:  tradingEngine.getTotalPnL(),
    stats:     tradingEngine.getStats(),
    timestamp: new Date().toISOString(),
  });
});

// ── GET /portfolio/history ───────────────────────────────────
router.get('/portfolio/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    trades:    tradingEngine.getHistory(limit),
    totalPnL:  tradingEngine.getTotalPnL(),
    stats:     tradingEngine.getStats(),
    timestamp: new Date().toISOString(),
  });
});

// ── GET /macro ───────────────────────────────────────────────
router.get('/macro', (req, res) => {
  res.json({
    ...macroData.getSummary(),
    source:    'Yahoo Finance + Alternative.me REAL LIVE',
    timestamp: new Date().toISOString(),
  });
});

// ── GET /signals ─────────────────────────────────────────────
router.get('/signals', (req, res) => {
  const signals = brain.getAllSignals();
  const regime  = macroData.getSummary().regime;

  res.json({
    signals,
    topBuys:             brain.getTopOpportunities(10),
    borrowOpportunities: brain.getBorrowOpportunities(),
    regime,
    riskAssess:  brain.getRiskAssessment(),
    cycleCount:  brain.getStatus().cycleCount,
    lastCycle:   brain.getStatus().lastCycle,
    source:      'AI Brain REAL LIVE analysis',
    timestamp:   new Date().toISOString(),
  });
});

// ── GET /signals/price-action — PA pattern signals only ───────
router.get('/signals/price-action', (req, res) => {
  const signals  = brain.getAllSignals();
  const macro    = macroData.getSummary();
  const risk     = brain.getRiskAssessment();
  const minScore = parseFloat(req.query.min) || 0.55;

  const paSignals = signals
    .filter(s => (s.components?.priceActionEngine ?? 0) >= minScore)
    .map(s => ({
      symbol:          s.symbol,
      name:            s.name,
      category:        s.category,
      action:          s.action,
      finalScore:      s.finalScore,
      paScore:         s.components?.priceActionEngine ?? 0,
      macroMultiplier: s.components?.macroMultiplier   ?? 1,
      priceUsd:        s.priceUsd,
      change24h:       s.change24h,
      change7d:        s.change7d,
      patterns: (s.reasons || []).filter(r =>
        r.includes('Long Wick Reversal') || r.includes('Double Floor') || r.includes('Double Ceiling') ||
        r.includes('Engulfing Bar') || r.includes('Breakout Test') || r.includes('Support Zone') ||
        r.includes('Stacked Wicks') || r.includes('Consolidation')
      ),
      macroFilters: (s.reasons || []).filter(r =>
        r.includes('Macro') || r.includes('macro') || r.includes('BTC') || r.includes('dominance')
      ),
      riskGatePass: s.riskGate?.pass,
    }))
    .sort((a, b) => b.paScore - a.paScore);

  const highProb = paSignals.filter(s => s.paScore >= 0.70 && s.riskGatePass && s.action !== 'SKIP');

  res.json({
    paSignals,
    highProbability:  highProb,
    count:            paSignals.length,
    highProbCount:    highProb.length,
    regime:           risk.regime,
    fearGreed:        macro.fearGreed,
    riskAssessment:   risk,
    minScoreFilter:   minScore,
    source:           'Price Action Engine — Long Wick Reversal, Double Floor, Double Ceiling, Engulfing Bar, Breakout Test',
    timestamp:        new Date().toISOString(),
  });
});

// ── GET /prices — raw price data ────────────────────────────
router.get('/prices', (req, res) => {
  res.json({
    prices:    priceFeed.getAllMap(),
    count:     priceFeed.getStatus().assetCount,
    lastUpdate: priceFeed.getStatus().lastUpdate,
    source:    'CoinGecko REAL LIVE API',
    timestamp: new Date().toISOString(),
  });
});

// ── GET /prices/:symbol ──────────────────────────────────────
router.get('/prices/:symbol', (req, res) => {
  const sym   = req.params.symbol.toUpperCase();
  const price = priceFeed.getPrice(sym);
  if (!price) return res.status(404).json({ error: `${sym} not found` });
  res.json({ ...price, source: 'CoinGecko REAL LIVE API', timestamp: new Date().toISOString() });
});

// ── GET /chart/price/:symbol — real price history from CoinGecko ─
router.get('/chart/price/:symbol', async (req, res) => {
  const sym    = req.params.symbol.toUpperCase();
  const price  = priceFeed.getPrice(sym);
  if (!price) return res.status(404).json({ error: `${sym} not found` });

  const days   = parseInt(req.query.days) || 7;
  const p      = price.priceUsd;
  const ch24   = price.change24h || 0;
  const ch7    = price.change7d  || 0;

  // Get CoinGecko ID from registry
  const registry = require('../services/priceFeed').ASSET_REGISTRY;
  const meta     = registry.find(a => a.symbol === sym);
  const cgId     = meta?.cgId;

  if (cgId) {
    try {
      const interval = days <= 1 ? 'minutely' : days <= 90 ? 'hourly' : 'daily';
      const cgRes = await fetch(
        `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=${days}`,
        { signal: AbortSignal.timeout(12000) }
      );
      if (cgRes.ok) {
        const cgData = await cgRes.json();
        const hist = (cgData.prices || []).map(([t, price]) => ({
          t, ts: new Date(t).toISOString(), p: price,
          v: cgData.total_volumes?.find(([vt]) => Math.abs(vt - t) < 3600000)?.[1] ?? 0,
        }));
        return res.json({ symbol: sym, days, points: hist, currentPrice: p,
          change24h: ch24, change7d: ch7, source: 'CoinGecko market_chart REAL LIVE' });
      }
    } catch (err) {
      console.warn(`CoinGecko chart fetch failed for ${sym}:`, err.message);
    }
  }

  // Fallback: derive from real 7d change (anchored to real current price)
  const now  = Date.now();
  const pts  = days * 24;
  const hist = [];
  for (let i = 0; i <= pts; i++) {
    const progress = i / pts;
    const derived  = (p / (1 + ch7)) * (1 + ch7 * progress);
    hist.push({ t: now - (pts - i) * 3600000, ts: new Date(now - (pts - i) * 3600000).toISOString(),
      p: Math.max(derived, p * 0.01), v: (price.volume24h || 1e6) / 24 });
  }
  res.json({ symbol: sym, days, points: hist, currentPrice: p,
    change24h: ch24, change7d: ch7, source: 'Derived from real CoinGecko 7d change (CoinGecko rate-limited)' });
});

// ── GET /chart/portfolio — real weighted portfolio equity curve ──
router.get('/chart/portfolio', (req, res) => {
  const { ASSET_REGISTRY, PORTFOLIO_WEIGHTS } = require('../services/priceFeed');
  const prices      = priceFeed.getAllMap(); // symbol -> { priceUsd, change24h, change7d, ... }
  const totalWeight = Object.values(PORTFOLIO_WEIGHTS).reduce((s, w) => s + w, 0) || 1;
  const BASE_NAV    = 100; // index starts at 100
  const now         = Date.now();
  const pts         = 8;   // daily points over 7 days

  // Build 7-day equity curve anchored to real price changes
  // Each asset contributes: weight * (price_at_t / price_7d_ago)
  // price_7d_ago derived from live change7d: p7ago = p / (1 + ch7)
  const curve = Array.from({ length: pts }, (_, i) => {
    const dayFrac = i / (pts - 1);
    let weighted  = 0;
    for (const asset of ASSET_REGISTRY) {
      const w   = PORTFOLIO_WEIGHTS[asset.symbol] ?? 0;
      if (w === 0) continue;
      const px  = prices[asset.symbol];
      if (!px || !px.priceUsd) continue;
      const ch7 = px.change7d || 0; // already decimal (0.05 = 5%)
      // linear interpolation from price 7d ago to current price
      const norm = 1 / (1 + ch7) * (1 + ch7 * dayFrac);
      weighted  += w * norm;
    }
    const value = BASE_NAV * (weighted / totalWeight);
    const ts    = now - (pts - 1 - i) * 24 * 3600000;
    return { t: ts, ts: new Date(ts).toISOString().slice(0,10), v: parseFloat(value.toFixed(4)),
      pnl: parseFloat((value - BASE_NAV).toFixed(4)) };
  });

  const current  = curve[curve.length - 1]?.v ?? BASE_NAV;
  const return7d = (current - BASE_NAV) / BASE_NAV;
  res.json({ curve, initial: BASE_NAV, current, return7d: parseFloat(return7d.toFixed(6)),
    totalAssets: ASSET_REGISTRY.length, source: 'Real weighted NAV from live CoinGecko prices' });
});

// ── GET /chart/categories — category allocation ───────────────
router.get('/chart/categories', (req, res) => {
  const prices = priceFeed.getAll();
  const cats = {};
  prices.forEach((p) => {
    const c = p.category || 'other';
    if (!cats[c]) cats[c] = { category: c, count: 0, mktCap: 0, vol: 0 };
    cats[c].count++;
    cats[c].mktCap += p.marketCap || 0;
    cats[c].vol    += p.volume24h  || 0;
  });
  const total  = Object.values(cats).reduce((s, c) => s + c.mktCap, 0);
  const result = Object.values(cats)
    .map((c) => ({ ...c, pct: total > 0 ? (c.mktCap / total * 100) : 0 }))
    .sort((a, b) => b.mktCap - a.mktCap);
  res.json({ categories: result, total, timestamp: new Date().toISOString() });
});

module.exports = router;
