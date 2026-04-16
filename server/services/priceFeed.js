'use strict';
// ============================================================
// INQUISITIVE AI — PRICE FEED (production)
// Primary:   CoinGecko /coins/markets (1 batched request per cycle, 66 assets)
// Fallback:  Binance public /ticker/24hr
// Tertiary:  CoinMarketCap (only if COINMARKETCAP_API_KEY present)
// ============================================================
const axios = require('axios');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

const log = pino({ name: 'priceFeed', level: process.env.LOG_LEVEL || 'info' });

const CFG_PATH = path.join(__dirname, '..', '..', 'scripts', 'portfolio-config.json');
if (!fs.existsSync(CFG_PATH)) throw new Error('missing scripts/portfolio-config.json');
const ASSET_REGISTRY = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8')).assets;
if (!Array.isArray(ASSET_REGISTRY) || ASSET_REGISTRY.length !== 66) {
  throw new Error(`portfolio-config.json must contain exactly 66 assets; got ${ASSET_REGISTRY?.length}`);
}

const CG_KEY    = process.env.COINGECKO_API_KEY || '';
const CG_BASE   = CG_KEY ? process.env.COINGECKO_PRO_BASE : (process.env.COINGECKO_API_BASE || 'https://api.coingecko.com/api/v3');
const CMC_KEY   = process.env.COINMARKETCAP_API_KEY || '';
const BINANCE   = process.env.BINANCE_API_BASE || 'https://api.binance.com';
const REFRESH_MS = 30_000;

const cgClient = axios.create({
  baseURL: CG_BASE,
  timeout: 15_000,
  headers: CG_KEY ? { 'x-cg-pro-api-key': CG_KEY } : {},
});
const binanceClient = axios.create({ baseURL: BINANCE, timeout: 10_000 });

class PriceFeed extends EventEmitter {
  constructor() {
    super();
    this.snapshot = new Map();
    this.lastGoodFetchAt = 0;
    this.consecutiveFailures = 0;
    this.timer = null;
    this.inFlight = false;
  }

  getRegistry() { return ASSET_REGISTRY; }
  getWeights() {
    const w = {};
    for (const a of ASSET_REGISTRY) w[a.symbol] = a.targetWeight || 0;
    return w;
  }
  get(symbol) { return this.snapshot.get((symbol || '').toUpperCase()) || null; }
  getAll()    { return Object.fromEntries(this.snapshot); }
  isReady()   { return this.snapshot.size >= ASSET_REGISTRY.length * 0.9 && !this.isStale(); }
  isStale(maxAgeMs = 90_000) { return (Date.now() - this.lastGoodFetchAt) > maxAgeMs; }

  async initialize() {
    log.info({ assets: ASSET_REGISTRY.length, hasCgKey: !!CG_KEY }, 'priceFeed boot');
    await this.refresh();
    this.timer = setInterval(() => this.refresh().catch((e) => log.error({ err: e.message }, 'refresh err')), REFRESH_MS);
  }

  shutdown() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  async refresh() {
    if (this.inFlight) return;
    this.inFlight = true;
    try {
      try {
        const quotes = await this._fromCoinGecko();
        this._commit(quotes, 'coingecko');
        this.consecutiveFailures = 0;
        return;
      } catch (err) {
        this.consecutiveFailures += 1;
        log.warn({ err: err.message, consecutive: this.consecutiveFailures }, 'coingecko failed');
      }

      try {
        const quotes = await this._fromBinance();
        this._commit(quotes, 'binance');
        return;
      } catch (err) {
        log.warn({ err: err.message }, 'binance fallback failed');
      }

      if (CMC_KEY) {
        try {
          const quotes = await this._fromCMC();
          this._commit(quotes, 'coinmarketcap');
          return;
        } catch (err) {
          log.error({ err: err.message }, 'cmc fallback failed');
        }
      }

      for (const [sym, q] of this.snapshot) this.snapshot.set(sym, { ...q, stale: true });
      this.emit('stale');
    } finally {
      this.inFlight = false;
    }
  }

  async _fromCoinGecko() {
    const ids = ASSET_REGISTRY.map(a => a.cgId).join(',');
    let attempt = 0;
    while (attempt < 3) {
      try {
        const { data } = await cgClient.get('/coins/markets', {
          params: {
            vs_currency: 'usd', ids, per_page: 250, page: 1, sparkline: false,
            price_change_percentage: '1h,24h,7d',
          },
        });
        if (!Array.isArray(data)) throw new Error('cg: non-array response');
        const out = new Map();
        for (const r of data) {
          const meta = ASSET_REGISTRY.find(a => a.cgId === r.id);
          if (!meta) continue;
          out.set(meta.symbol, {
            symbol: meta.symbol, name: meta.name, category: meta.category,
            price: r.current_price, priceUsd: r.current_price,
            marketCap: r.market_cap, volume24h: r.total_volume,
            change1h:  (r.price_change_percentage_1h_in_currency  || 0) / 100,
            change24h: (r.price_change_percentage_24h_in_currency || 0) / 100,
            change7d:  (r.price_change_percentage_7d_in_currency  || 0) / 100,
            high24h: r.high_24h, low24h: r.low_24h, ath: r.ath,
            athChangePct: (r.ath_change_percentage || 0) / 100,
            source: 'coingecko', fetchedAt: Date.now(), stale: false,
          });
        }
        if (out.size < ASSET_REGISTRY.length * 0.9) {
          throw new Error(`cg: partial snapshot (${out.size}/${ASSET_REGISTRY.length})`);
        }
        return out;
      } catch (err) {
        const status = err.response?.status;
        if (status === 429) {
          const retryAfter = Number(err.response?.headers?.['retry-after']) || [15, 30, 60][attempt];
          log.warn({ retryAfter }, 'cg 429 — backing off');
          await new Promise(r => setTimeout(r, retryAfter * 1000));
          attempt += 1;
          continue;
        }
        throw err;
      }
    }
    throw new Error('cg: exhausted retries');
  }

  async _fromBinance() {
    const pairs = ASSET_REGISTRY.filter(a => a.binanceSymbol).map(a => a.binanceSymbol);
    if (pairs.length === 0) throw new Error('no binance symbols in registry');
    const { data } = await binanceClient.get('/api/v3/ticker/24hr', {
      params: { symbols: JSON.stringify(pairs) },
    });
    const bySym = new Map(data.map(t => [t.symbol, t]));
    const out = new Map();
    for (const a of ASSET_REGISTRY) {
      if (!a.binanceSymbol) continue;
      const t = bySym.get(a.binanceSymbol);
      if (!t) continue;
      const price = parseFloat(t.lastPrice);
      out.set(a.symbol, {
        symbol: a.symbol, name: a.name, category: a.category,
        price, priceUsd: price,
        volume24h: parseFloat(t.quoteVolume),
        change24h: parseFloat(t.priceChangePercent) / 100,
        change1h: null, change7d: null,
        high24h: parseFloat(t.highPrice), low24h: parseFloat(t.lowPrice),
        source: 'binance', fetchedAt: Date.now(), stale: false,
      });
    }
    if (out.size === 0) throw new Error('binance: empty snapshot');
    return out;
  }

  async _fromCMC() {
    const { data } = await axios.get('https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest', {
      headers: { 'X-CMC_PRO_API_KEY': CMC_KEY },
      params: { symbol: ASSET_REGISTRY.map(a => a.symbol).join(',') },
      timeout: 15_000,
    });
    const out = new Map();
    for (const a of ASSET_REGISTRY) {
      const rows = data?.data?.[a.symbol];
      const q = Array.isArray(rows) ? rows[0]?.quote?.USD : rows?.quote?.USD;
      if (!q) continue;
      out.set(a.symbol, {
        symbol: a.symbol, name: a.name, category: a.category,
        price: q.price, priceUsd: q.price,
        marketCap: q.market_cap, volume24h: q.volume_24h,
        change1h:  (q.percent_change_1h  || 0) / 100,
        change24h: (q.percent_change_24h || 0) / 100,
        change7d:  (q.percent_change_7d  || 0) / 100,
        source: 'coinmarketcap', fetchedAt: Date.now(), stale: false,
      });
    }
    if (out.size === 0) throw new Error('cmc: empty snapshot');
    return out;
  }

  _commit(quotes, source) {
    const now = Date.now();
    for (const [sym, q] of quotes) this.snapshot.set(sym, q);
    this.lastGoodFetchAt = now;
    this.emit('prices:update', { source, count: quotes.size, at: now });
    log.info({ source, count: quotes.size }, 'prices updated');
  }
}

const priceFeed = new PriceFeed();
module.exports = priceFeed;
module.exports.PriceFeed = PriceFeed;
module.exports.ASSET_REGISTRY = ASSET_REGISTRY;
