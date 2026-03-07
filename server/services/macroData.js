'use strict';
// ============================================================
// INQUISITIVE AI — REAL LIVE MACRO DATA SERVICE
// Sources: Yahoo Finance, Alternative.me Fear & Greed
// NO MOCK DATA — ALL MACRO DATA IS REAL AND LIVE
// ============================================================
const axios        = require('axios');
const EventEmitter = require('events');

const MACRO_INDICATORS = [
  { key: 'TNX',  yahoo: '%5ETNX',      name: '10-Year US Treasury Yield',  unit: '%'  },
  { key: 'FVX',  yahoo: '%5EFVX',      name: '5-Year US Treasury Yield',   unit: '%'  },
  { key: 'IRX',  yahoo: '%5EIRX',      name: '3-Month US Treasury Yield',  unit: '%'  },
  { key: 'DXY',  yahoo: 'DX-Y.NYB',    name: 'US Dollar Index',            unit: 'pts' },
  { key: 'VIX',  yahoo: '%5EVIX',      name: 'CBOE Volatility Index',      unit: 'pts' },
  { key: 'SKEW', yahoo: '%5ESKEW',     name: 'CBOE SKEW Index',            unit: 'pts' },
  { key: 'EEM',  yahoo: 'EEM',         name: 'Emerging Markets ETF',       unit: 'USD' },
  { key: 'GC=F', yahoo: 'GC%3DF',     name: 'Gold Futures',               unit: 'USD' },
  { key: 'CL=F', yahoo: 'CL%3DF',     name: 'Crude Oil WTI Futures',      unit: 'USD' },
  { key: 'SPY',  yahoo: 'SPY',         name: 'S&P 500 ETF',                unit: 'USD' },
];

class MacroDataService extends EventEmitter {
  constructor() {
    super();
    this.data       = new Map();
    this.fearGreed  = null;
    this.lastUpdate = null;
    this.POLL_MS    = 120_000; // 2 min
  }

  async initialize() {
    console.log('📈 [MacroData] Initializing real macro data feed…');
    await Promise.all([this._fetchYahoo(), this._fetchFearGreed()]);
    this._startPolling();
    return this;
  }

  async _fetchYahoo() {
    for (const ind of MACRO_INDICATORS) {
      try {
        const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${ind.yahoo}`;
        const resp = await axios.get(url, {
          params:  { interval: '1d', range: '5d', includePrePost: false },
          timeout: 10_000,
          headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
        });

        const result = resp.data?.chart?.result?.[0];
        if (!result) continue;

        const quotes = result.indicators?.quote?.[0];
        const ts     = result.timestamp || [];
        if (!quotes?.close?.length) continue;

        const lastIdx = quotes.close.length - 1;
        const cur     = quotes.close[lastIdx]  || 0;
        const prev    = quotes.close[lastIdx - 1] || cur;

        this.data.set(ind.key, {
          key:           ind.key,
          name:          ind.name,
          unit:          ind.unit,
          current:       cur,
          previous:      prev,
          change:        cur - prev,
          changePct:     prev ? ((cur - prev) / prev) * 100 : 0,
          high:          quotes.high?.[lastIdx]   || cur,
          low:           quotes.low?.[lastIdx]    || cur,
          volume:        quotes.volume?.[lastIdx] || 0,
          timestamp:     ts[lastIdx] ? new Date(ts[lastIdx] * 1000).toISOString() : new Date().toISOString(),
          source:        'yahoo_finance',
        });
      } catch (err) {
        console.warn(`⚠️  [MacroData] ${ind.key}: ${err.message}`);
      }
    }
    this.lastUpdate = new Date();
    console.log(`✅ [MacroData] ${this.data.size} indicators updated`);
    this.emit('update', this.getSummary());
  }

  async _fetchFearGreed() {
    try {
      const resp = await axios.get('https://api.alternative.me/fng/', {
        params:  { limit: 3, format: 'json' },
        timeout: 8_000,
      });
      const entries = resp.data?.data || [];
      if (!entries.length) return;

      this.fearGreed = {
        value:              parseInt(entries[0].value),
        valueClassification: entries[0].value_classification,
        timestamp:          new Date(parseInt(entries[0].timestamp) * 1000).toISOString(),
        history:            entries.map(e => ({
          value:              parseInt(e.value),
          classification:     e.value_classification,
          timestamp:          new Date(parseInt(e.timestamp) * 1000).toISOString(),
        })),
        source: 'alternative.me',
      };
      console.log(`✅ [MacroData] Fear & Greed Index: ${this.fearGreed.value} (${this.fearGreed.valueClassification})`);
    } catch (err) {
      console.warn(`⚠️  [MacroData] Fear & Greed: ${err.message}`);
    }
  }

  _startPolling() {
    setInterval(() => this._fetchYahoo(),    this.POLL_MS);
    setInterval(() => this._fetchFearGreed(), this.POLL_MS * 2);
  }

  // ── Compute macro regime signal ──────────────────────────
  getMarketRegime() {
    const vix  = this.data.get('VIX');
    const tnx  = this.data.get('TNX');
    const dxy  = this.data.get('DXY');
    const fg   = this.fearGreed;

    let riskScore = 0.5; // neutral baseline
    const signals = [];

    if (vix) {
      if      (vix.current < 15) { riskScore += 0.15; signals.push({ signal: 'LOW_VOL',     desc: 'VIX < 15 — calm market' }); }
      else if (vix.current > 30) { riskScore -= 0.25; signals.push({ signal: 'HIGH_VOL',    desc: 'VIX > 30 — elevated fear' }); }
      else if (vix.current > 25) { riskScore -= 0.10; signals.push({ signal: 'ELEV_VOL',    desc: 'VIX > 25 — caution zone' }); }
    }

    if (tnx) {
      const fvx = this.data.get('FVX');
      if (fvx && tnx.current < fvx.current) {
        riskScore -= 0.15;
        signals.push({ signal: 'YIELD_INVERSION', desc: 'Yield curve inverted — recession risk' });
      } else if (tnx.current > 5) {
        riskScore -= 0.10;
        signals.push({ signal: 'HIGH_RATES', desc: 'High rates suppress risk assets' });
      }
    }

    if (dxy && dxy.changePct > 0.8)  { riskScore -= 0.10; signals.push({ signal: 'DXY_SURGE',  desc: 'Dollar surge — crypto headwind' }); }
    if (dxy && dxy.changePct < -0.8) { riskScore += 0.10; signals.push({ signal: 'DXY_WEAK',   desc: 'Dollar weakness — crypto tailwind' }); }

    if (fg) {
      if      (fg.value < 20) { riskScore -= 0.15; signals.push({ signal: 'EXTREME_FEAR',  desc: 'Extreme fear — potential buy signal (contrarian)' }); }
      else if (fg.value > 80) { riskScore -= 0.05; signals.push({ signal: 'EXTREME_GREED', desc: 'Extreme greed — caution, top risk' }); }
      else if (fg.value < 40) { riskScore -= 0.05; signals.push({ signal: 'FEAR',          desc: 'Fear in market' }); }
      else if (fg.value > 60) { riskScore += 0.05; signals.push({ signal: 'GREED',         desc: 'Greed in market' }); }
    }

    riskScore = Math.max(0, Math.min(1, riskScore));
    const regime = riskScore >= 0.65 ? 'BULL' : riskScore <= 0.35 ? 'BEAR' : 'NEUTRAL';

    return { regime, riskScore, signals, fearGreed: fg, lastUpdate: this.lastUpdate };
  }

  getSummary() {
    return {
      indicators: Object.fromEntries(this.data),
      fearGreed:  this.fearGreed,
      regime:     this.getMarketRegime(),
      lastUpdate: this.lastUpdate,
    };
  }

  get(key) { return this.data.get(key) || null; }

  getStatus() {
    return {
      live:        this.data.size > 0,
      indicators:  this.data.size,
      fearGreed:   !!this.fearGreed,
      lastUpdate:  this.lastUpdate,
    };
  }
}

const macroData = new MacroDataService();
module.exports  = macroData;
