'use strict';
// ============================================================
// INQUISITIVE AI — OHLC FEED (production)
// Primary: Binance REST /api/v3/klines (free, no auth)
// Fallback: Coinbase Exchange /products/{id}/candles
// ============================================================
const axios = require('axios');
const EventEmitter = require('events');
const pino = require('pino');
const priceFeed = require('./priceFeed');

const log = pino({ name: 'ohlcFeed', level: process.env.LOG_LEVEL || 'info' });

const BINANCE  = axios.create({ baseURL: process.env.BINANCE_API_BASE  || 'https://api.binance.com',              timeout: 10_000 });
const COINBASE = axios.create({ baseURL: process.env.COINBASE_API_BASE || 'https://api.exchange.coinbase.com',    timeout: 10_000 });

const INTERVALS = {
  '1m':  { binance: '1m',  coinbaseSec: 60,     pollMs: 10_000 },
  '5m':  { binance: '5m',  coinbaseSec: 300,    pollMs: 30_000 },
  '15m': { binance: '15m', coinbaseSec: 900,    pollMs: 60_000 },
  '1h':  { binance: '1h',  coinbaseSec: 3_600,  pollMs: 300_000 },
  '4h':  { binance: '4h',  coinbaseSec: 14_400, pollMs: 900_000 },
  '1d':  { binance: '1d',  coinbaseSec: 86_400, pollMs: 3_600_000 },
};

const RING_SIZE = 500;

class RingBuffer {
  constructor(size) { this.size = size; this.buf = []; }
  push(c) { this.buf.push(c); if (this.buf.length > this.size) this.buf.shift(); }
  last(n) { return this.buf.slice(-n); }
  all() { return this.buf.slice(); }
  len() { return this.buf.length; }
  latestOpenTime() { return this.buf.length ? this.buf[this.buf.length - 1].openTime : 0; }
}

class OHLCFeed extends EventEmitter {
  constructor() {
    super();
    this.ringBuffers = new Map();
    this.timers = new Map();
  }

  _key(sym, iv) { return `${sym}:${iv}`; }
  _ring(sym, iv) {
    const k = this._key(sym, iv);
    if (!this.ringBuffers.has(k)) this.ringBuffers.set(k, new RingBuffer(RING_SIZE));
    return this.ringBuffers.get(k);
  }

  get(symbol, interval = '15m', n = 200) {
    const r = this.ringBuffers.get(this._key((symbol||'').toUpperCase(), interval));
    return r ? r.last(n) : [];
  }

  async initialize() {
    const assets = priceFeed.getRegistry();
    log.info({ assets: assets.length, intervals: Object.keys(INTERVALS).length }, 'ohlcFeed boot');
    for (const a of assets) {
      for (const iv of Object.keys(INTERVALS)) {
        try { await this._backfill(a, iv); }
        catch (e) { log.warn({ sym: a.symbol, iv, err: e.message }, 'backfill failed'); }
      }
    }
    for (const iv of Object.keys(INTERVALS)) {
      const pollMs = INTERVALS[iv].pollMs;
      const t = setInterval(() => this._pollAll(iv).catch(e => log.error({ err: e.message }, 'poll err')), pollMs);
      this.timers.set(iv, t);
    }
    log.info('ohlcFeed ready');
  }

  shutdown() { for (const t of this.timers.values()) clearInterval(t); this.timers.clear(); }

  async _pollAll(interval) {
    const assets = priceFeed.getRegistry();
    const chunkSize = 20;
    for (let i = 0; i < assets.length; i += chunkSize) {
      const chunk = assets.slice(i, i + chunkSize);
      await Promise.all(chunk.map(a => this._pollOne(a, interval).catch(() => null)));
      await new Promise(r => setTimeout(r, 1_000));
    }
  }

  async _pollOne(asset, interval) {
    const ring = this._ring(asset.symbol, interval);
    const since = ring.latestOpenTime();
    const candles = asset.binanceSymbol
      ? await this._fetchBinance(asset.binanceSymbol, interval, since)
      : await this._fetchCoinbase(asset.symbol, interval, since);
    for (const c of candles) ring.push(c);
    if (candles.length) this.emit('candle', { symbol: asset.symbol, interval, candles });
  }

  async _backfill(asset, interval) {
    const ring = this._ring(asset.symbol, interval);
    if (ring.len() >= 200) return;
    const candles = asset.binanceSymbol
      ? await this._fetchBinance(asset.binanceSymbol, interval, 0, 500)
      : await this._fetchCoinbase(asset.symbol, interval, 0, 300);
    for (const c of candles) ring.push(c);
  }

  async _fetchBinance(pair, interval, sinceOpenTime, limit = 200) {
    const iv = INTERVALS[interval].binance;
    const params = { symbol: pair, interval: iv, limit };
    if (sinceOpenTime) params.startTime = sinceOpenTime + 1;
    const { data } = await BINANCE.get('/api/v3/klines', { params });
    return data.map(row => ({
      openTime: row[0],
      open:  parseFloat(row[1]),
      high:  parseFloat(row[2]),
      low:   parseFloat(row[3]),
      close: parseFloat(row[4]),
      volume: parseFloat(row[5]),
      closeTime: row[6],
      source: 'binance',
    }));
  }

  async _fetchCoinbase(symbol, interval, sinceOpenTime, limit = 300) {
    const sec = INTERVALS[interval].coinbaseSec;
    const productId = `${symbol}-USD`;
    const params = { granularity: sec };
    if (sinceOpenTime) {
      params.start = new Date(sinceOpenTime).toISOString();
      params.end   = new Date().toISOString();
    }
    try {
      const { data } = await COINBASE.get(`/products/${productId}/candles`, { params });
      return data.slice(0, limit).reverse().map(row => ({
        openTime: row[0] * 1000,
        open: row[3], high: row[2], low: row[1],
        close: row[4], volume: row[5],
        closeTime: (row[0] + sec) * 1000,
        source: 'coinbase',
      }));
    } catch (e) {
      if (e.response?.status === 404) return [];
      throw e;
    }
  }

  enableStream() {
    if (process.env.OHLC_STREAM !== 'true') return;
    const WebSocket = require('ws');
    const wsUrl = 'wss://stream.binance.com:9443/stream';
    const assets = priceFeed.getRegistry().filter(a => a.binanceSymbol);
    const streams = assets.flatMap(a =>
      Object.keys(INTERVALS).map(iv => `${a.binanceSymbol.toLowerCase()}@kline_${INTERVALS[iv].binance}`)
    );
    const ws = new WebSocket(`${wsUrl}?streams=${streams.join('/')}`);
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const k = msg.data?.k; if (!k) return;
        const sym = assets.find(a => a.binanceSymbol === k.s)?.symbol; if (!sym) return;
        const iv  = Object.keys(INTERVALS).find(i => INTERVALS[i].binance === k.i); if (!iv) return;
        const candle = {
          openTime: k.t, open: +k.o, high: +k.h, low: +k.l, close: +k.c,
          volume: +k.v, closeTime: k.T, source: 'binance-ws',
        };
        const ring = this._ring(sym, iv);
        const last = ring.buf[ring.buf.length - 1];
        if (last && last.openTime === candle.openTime) ring.buf[ring.buf.length - 1] = candle;
        else ring.push(candle);
        if (k.x) this.emit('candle:closed', { symbol: sym, interval: iv, candle });
      } catch (e) { /* ignore */ }
    });
    ws.on('close', () => { setTimeout(() => this.enableStream(), 5_000); });
    log.info({ streams: streams.length }, 'binance WS stream enabled');
  }
}

module.exports = new OHLCFeed();
module.exports.OHLCFeed = OHLCFeed;
module.exports.INTERVALS = INTERVALS;
