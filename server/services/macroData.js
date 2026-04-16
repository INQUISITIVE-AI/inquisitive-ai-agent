'use strict';
// ============================================================
// INQUISITIVE AI — Macro data (Alpha Vantage replaces Yahoo Finance)
// Fetches: DXY, VIX, SPX, BTC dominance (CoinGecko global), Fear & Greed (alternative.me)
// ============================================================
const axios = require('axios');
const EventEmitter = require('events');
const pino = require('pino');

const log = pino({ name: 'macroData', level: process.env.LOG_LEVEL || 'info' });

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY;
if (!AV_KEY || AV_KEY.startsWith('replace_with')) {
  log.warn('ALPHA_VANTAGE_API_KEY not set — macro metrics will be null');
}

const REFRESH_MS = 15 * 60 * 1000; // 15 min — AV free tier is 25 req/day

class MacroData extends EventEmitter {
  constructor() {
    super();
    this.snapshot = { dxy: null, vix: null, spx: null, btcDominance: null, fearGreed: null, updatedAt: 0 };
    this.timer = null;
  }
  get() { return { ...this.snapshot }; }

  async initialize() {
    try { await this.refresh(); } catch (e) { log.warn({ err: e.message }, 'macro boot refresh failed'); }
    this.timer = setInterval(() => this.refresh().catch(e => log.warn({ err: e.message }, 'macro refresh err')), REFRESH_MS);
  }
  shutdown() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  async refresh() {
    const [dxy, vix, spx, dom, fg] = await Promise.allSettled([
      this._avQuote('DX-Y.NYB'),
      this._avQuote('^VIX'),
      this._avQuote('^GSPC'),
      this._btcDominance(),
      this._fearGreed(),
    ]);
    this.snapshot = {
      dxy: val(dxy), vix: val(vix), spx: val(spx),
      btcDominance: val(dom), fearGreed: val(fg),
      updatedAt: Date.now(),
    };
    this.emit('macro:update', this.snapshot);
    log.info(this.snapshot, 'macro updated');
  }

  async _avQuote(symbol) {
    if (!AV_KEY || AV_KEY.startsWith('replace_with')) return null;
    const { data } = await axios.get('https://www.alphavantage.co/query', {
      params: { function: 'GLOBAL_QUOTE', symbol, apikey: AV_KEY },
      timeout: 15_000,
    });
    const price = parseFloat(data?.['Global Quote']?.['05. price']);
    return Number.isFinite(price) ? price : null;
  }

  async _btcDominance() {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/global', { timeout: 10_000 });
    return data?.data?.market_cap_percentage?.btc ?? null;
  }

  async _fearGreed() {
    const { data } = await axios.get('https://api.alternative.me/fng/?limit=1', { timeout: 10_000 });
    const v = data?.data?.[0]?.value;
    return v ? Number(v) : null;
  }
}

function val(r) { return r.status === 'fulfilled' ? r.value : null; }

module.exports = new MacroData();
module.exports.MacroData = MacroData;
