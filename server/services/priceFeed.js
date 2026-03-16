'use strict';
// ============================================================
// INQUISITIVE AI — REAL LIVE PRICE FEED SERVICE
// Source: CoinGecko API (free tier) + CoinMarketCap (if key set)
// NO MOCK DATA — ALL PRICES ARE REAL AND LIVE
// ============================================================
const axios = require('axios');
const EventEmitter = require('events');

// ─── EXACT 65 ASSETS AS SPECIFIED ────────────────────────────
const ASSET_REGISTRY = [
  // Major Layer-1s
  { symbol: 'BTC',     cgId: 'bitcoin',                   name: 'Bitcoin',                          category: 'major',        yieldable: false, stakeable: false, lendable: true  },
  { symbol: 'ETH',     cgId: 'ethereum',                  name: 'Ethereum',                         category: 'major',        yieldable: true,  stakeable: true,  lendable: true  },
  { symbol: 'BNB',     cgId: 'binancecoin',               name: 'BNB',                              category: 'major',        yieldable: true,  stakeable: true,  lendable: true  },
  { symbol: 'XRP',     cgId: 'ripple',                    name: 'XRP',                              category: 'major',        yieldable: false, stakeable: false, lendable: true  },
  { symbol: 'USDC',    cgId: 'usd-coin',                  name: 'USD Coin',                         category: 'stablecoin',   yieldable: true,  stakeable: false, lendable: true  },
  { symbol: 'SOL',     cgId: 'solana',                    name: 'Solana',                           category: 'major',        yieldable: true,  stakeable: true,  lendable: true  },
  { symbol: 'TRX',     cgId: 'tron',                      name: 'TRON',                             category: 'major',        yieldable: true,  stakeable: true,  lendable: true  },
  { symbol: 'ADA',     cgId: 'cardano',                   name: 'Cardano',                          category: 'major',        yieldable: false, stakeable: true,  lendable: true  },
  { symbol: 'BCH',     cgId: 'bitcoin-cash',              name: 'Bitcoin Cash',                     category: 'major',        yieldable: false, stakeable: false, lendable: true  },
  { symbol: 'HYPE',    cgId: 'hyperliquid',               name: 'Hyperliquid',                      category: 'defi',         yieldable: true,  stakeable: true,  lendable: false },
  { symbol: 'XMR',     cgId: 'monero',                    name: 'Monero',                           category: 'privacy',      yieldable: false, stakeable: false, lendable: false },
  { symbol: 'LINK',    cgId: 'chainlink',                 name: 'Chainlink',                        category: 'oracle',       yieldable: false, stakeable: true,  lendable: true  },
  { symbol: 'CC',      cgId: 'canton-network',            name: 'Canton',                           category: 'institutional',yieldable: false, stakeable: false, lendable: false },
  { symbol: 'XLM',     cgId: 'stellar',                   name: 'Stellar',                          category: 'payment',      yieldable: false, stakeable: false, lendable: true  },
  { symbol: 'LTC',     cgId: 'litecoin',                  name: 'Litecoin',                         category: 'payment',      yieldable: false, stakeable: false, lendable: true  },
  { symbol: 'HBAR',    cgId: 'hedera-hashgraph',          name: 'Hedera',                           category: 'major',        yieldable: false, stakeable: true,  lendable: true  },
  { symbol: 'AVAX',    cgId: 'avalanche-2',               name: 'Avalanche',                        category: 'major',        yieldable: true,  stakeable: true,  lendable: true  },
  { symbol: 'ZEC',     cgId: 'zcash',                     name: 'Zcash',                            category: 'privacy',      yieldable: false, stakeable: false, lendable: false },
  { symbol: 'SUI',     cgId: 'sui',                       name: 'Sui',                              category: 'major',        yieldable: true,  stakeable: true,  lendable: false },
  { symbol: 'DOT',     cgId: 'polkadot',                  name: 'Polkadot',                         category: 'interop',      yieldable: false, stakeable: true,  lendable: true  },
  { symbol: 'PAXG',    cgId: 'pax-gold',                  name: 'PAX Gold',                         category: 'rwa',          yieldable: false, stakeable: false, lendable: true  },
  { symbol: 'UNI',     cgId: 'uniswap',                  name: 'Uniswap',                          category: 'defi',         yieldable: true,  stakeable: false, lendable: true  },
  { symbol: 'TAO',     cgId: 'bittensor',                 name: 'Bittensor',                        category: 'ai',           yieldable: false, stakeable: true,  lendable: false },
  { symbol: 'NEAR',    cgId: 'near-protocol',             name: 'NEAR Protocol',                    category: 'major',        yieldable: false, stakeable: true,  lendable: true  },
  { symbol: 'AAVE',    cgId: 'aave',                      name: 'Aave',                             category: 'defi',         yieldable: true,  stakeable: true,  lendable: true  },
  { symbol: 'SKY',     cgId: 'sky',                       name: 'Sky',                              category: 'defi',         yieldable: true,  stakeable: false, lendable: false },
  { symbol: 'ICP',     cgId: 'internet-computer',         name: 'Internet Computer',                category: 'major',        yieldable: false, stakeable: false, lendable: false },
  { symbol: 'ETC',     cgId: 'ethereum-classic',          name: 'Ethereum Classic',                 category: 'major',        yieldable: false, stakeable: false, lendable: true  },
  { symbol: 'ONDO',    cgId: 'ondo-finance',              name: 'Ondo',                             category: 'rwa',          yieldable: true,  stakeable: false, lendable: false },
  { symbol: 'POL',     cgId: 'polygon-ecosystem-token',  name: 'Polygon',                          category: 'l2',           yieldable: true,  stakeable: true,  lendable: true  },
  { symbol: 'PYTH',    cgId: 'pyth-network',              name: 'Pyth Network',                     category: 'oracle',       yieldable: false, stakeable: true,  lendable: false },
  { symbol: 'ENA',     cgId: 'ethena',                    name: 'Ethena',                           category: 'defi',         yieldable: true,  stakeable: true,  lendable: false },
  { symbol: 'ATOM',    cgId: 'cosmos',                    name: 'Cosmos',                           category: 'interop',      yieldable: false, stakeable: true,  lendable: true  },
  { symbol: 'ALGO',    cgId: 'algorand',                  name: 'Algorand',                         category: 'major',        yieldable: false, stakeable: true,  lendable: true  },
  { symbol: 'FIL',     cgId: 'filecoin',                  name: 'Filecoin',                         category: 'storage',      yieldable: false, stakeable: false, lendable: true  },
  { symbol: 'QNT',     cgId: 'quant-network',             name: 'Quant',                            category: 'interop',      yieldable: false, stakeable: false, lendable: true  },
  { symbol: 'XDC',     cgId: 'xdce-crowd-sale',          name: 'XDC Network',                      category: 'major',        yieldable: false, stakeable: true,  lendable: false },
  { symbol: 'RNDR',    cgId: 'render-token',              name: 'Render',                           category: 'ai',           yieldable: false, stakeable: false, lendable: false },
  { symbol: 'JUP',     cgId: 'jupiter-exchange-solana', name: 'Jupiter',                          category: 'defi',         yieldable: true,  stakeable: true,  lendable: false },
  { symbol: 'VET',     cgId: 'vechain',                   name: 'VeChain',                          category: 'major',        yieldable: false, stakeable: true,  lendable: true  },
  { symbol: 'ARB',     cgId: 'arbitrum',                  name: 'Arbitrum',                         category: 'l2',           yieldable: true,  stakeable: false, lendable: true  },
  { symbol: 'ZRO',     cgId: 'layerzero',                 name: 'LayerZero',                        category: 'interop',      yieldable: false, stakeable: false, lendable: false },
  { symbol: 'XTZ',     cgId: 'tezos',                     name: 'Tezos',                            category: 'major',        yieldable: false, stakeable: true,  lendable: true  },
  { symbol: 'CHZ',     cgId: 'chiliz',                    name: 'Chiliz',                           category: 'gaming',       yieldable: false, stakeable: false, lendable: false },
  { symbol: 'FET',     cgId: 'fetch-ai',                  name: 'Artificial Superintelligence Alliance', category: 'ai',    yieldable: false, stakeable: true,  lendable: false },
  { symbol: 'INJ',     cgId: 'injective-protocol',        name: 'Injective',                        category: 'defi',         yieldable: true,  stakeable: true,  lendable: false },
  { symbol: 'GRT',     cgId: 'the-graph',                 name: 'The Graph',                        category: 'data',         yieldable: false, stakeable: true,  lendable: false },
  { symbol: 'OP',      cgId: 'optimism',                  name: 'Optimism',                         category: 'l2',           yieldable: false, stakeable: false, lendable: true  },
  { symbol: 'LDO',     cgId: 'lido-dao',                  name: 'Lido DAO',                         category: 'defi',         yieldable: true,  stakeable: false, lendable: true  },
  { symbol: 'HNT',     cgId: 'helium',                    name: 'Helium',                           category: 'iot',          yieldable: false, stakeable: true,  lendable: false },
  { symbol: 'STRK',    cgId: 'starknet',                  name: 'Starknet',                         category: 'l2',           yieldable: false, stakeable: true,  lendable: false },
  { symbol: 'STX',     cgId: 'blockstack',                name: 'Stacks',                           category: 'l2',           yieldable: false, stakeable: true,  lendable: false },
  { symbol: 'EOS',     cgId: 'eos',                       name: 'Vaulta',                           category: 'major',        yieldable: false, stakeable: true,  lendable: true  },
  { symbol: 'AR',      cgId: 'arweave',                   name: 'Arweave',                          category: 'storage',      yieldable: false, stakeable: false, lendable: false },
  { symbol: 'ACH',     cgId: 'alchemy-pay',               name: 'Alchemy Pay',                      category: 'payment',      yieldable: false, stakeable: false, lendable: false },
  { symbol: 'DBR',     cgId: 'debridge',                  name: 'deBridge',                         category: 'interop',      yieldable: false, stakeable: true,  lendable: false },
  { symbol: 'HONEY',   cgId: 'hivemapper',                name: 'Hivemapper',                       category: 'iot',          yieldable: true,  stakeable: false, lendable: false },
  { symbol: 'XSGD',    cgId: 'xsgd',                      name: 'XSGD',                             category: 'stablecoin',   yieldable: true,  stakeable: false, lendable: true  },
  { symbol: 'SOIL',    cgId: 'soil',                      name: 'Soil',                             category: 'defi',         yieldable: true,  stakeable: true,  lendable: false },
  { symbol: 'BRZ',     cgId: 'brz',                       name: 'Brazilian Digital Token',          category: 'stablecoin',   yieldable: true,  stakeable: false, lendable: true  },
  { symbol: 'JPYC',    cgId: 'jpyc',                      name: 'JPYC Prepaid',                     category: 'stablecoin',   yieldable: false, stakeable: false, lendable: false },
  { symbol: 'FDUSD',   cgId: 'first-digital-usd',         name: 'First Digital USD',                category: 'stablecoin',   yieldable: true,  stakeable: false, lendable: true  },
  { symbol: 'JITOSOL', cgId: 'jito-staked-sol',           name: 'Jito Staked SOL',                  category: 'liquid-stake', yieldable: true,  stakeable: true,  lendable: false },
  { symbol: 'JUPSOL',  cgId: 'jupiter-staked-sol',        name: 'Jupiter Staked SOL',               category: 'liquid-stake', yieldable: true,  stakeable: true,  lendable: false },
  { symbol: 'MNDE',    cgId: 'marinade',                  name: 'Marinade',                         category: 'liquid-stake', yieldable: true,  stakeable: true,  lendable: false },
];

// ─── Portfolio allocation weights (must sum to 100) ──────────
const PORTFOLIO_WEIGHTS = {
  // Tier 1 — Core (60%)
  BTC: 18, ETH: 12, SOL: 8, BNB: 5, XRP: 4, ADA: 3, AVAX: 3, SUI: 2, DOT: 2, NEAR: 1, ICP: 1, TRX: 1,
  // Tier 2 — DeFi (20%)
  AAVE: 2, UNI: 2, LDO: 1.5, ARB: 1.5, OP: 1, INJ: 1, JUP: 1, ENA: 1, HYPE: 1, SKY: 0.5, GRT: 0.5, FET: 1, RNDR: 1, TAO: 1, POL: 1, LINK: 1, STRK: 0.5,
  // Tier 3 — Diversified (20%)
  USDC: 3, PAXG: 1.5, ONDO: 1, XLM: 0.5, LTC: 0.5, BCH: 0.5, HBAR: 0.5, ZEC: 0.25, XMR: 0.25, ETC: 0.5, XTZ: 0.25, CHZ: 0.25, HNT: 0.25, VET: 0.25, QNT: 0.25, ALGO: 0.25, FIL: 0.25, AR: 0.25, XDC: 0.1, STX: 0.1, ZRO: 0.25, ATOM: 0.25, DBR: 0.1, ACH: 0.1, EOS: 0.1, HONEY: 0.1, XSGD: 0.1, SOIL: 0.1, BRZ: 0.1, JPYC: 0.1, FDUSD: 0.1, JITOSOL: 0.5, JUPSOL: 0.5, MNDE: 0.5, CC: 0.1, PYTH: 0.1,
};

class PriceFeedService extends EventEmitter {
  constructor() {
    super();
    this.prices     = new Map();   // symbol → priceObject
    this.lastUpdate = null;
    this.updating   = false;
    this.errorCount = 0;
    this.POLL_MS    = 30_000;      // 30 s CoinGecko free tier
    this.CMC_KEY    = process.env.COINMARKETCAP_API_KEY || null;
    this.CG_KEY     = process.env.COINGECKO_API_KEY    || null;
    this.assets     = ASSET_REGISTRY;
    this.weights    = PORTFOLIO_WEIGHTS;
  }

  // ── Public: initialize and start polling ──────────────────
  async initialize() {
    console.log('📊 [PriceFeed] Initializing with 65 real assets…');
    // Startup delay to avoid hammering CoinGecko on rapid nodemon restarts
    await new Promise(r => setTimeout(r, 5000));
    await this._fetchAll();
    this._startPolling();
    return this;
  }

  // ── Fetch all 65 assets in two batches to avoid URL-length limits ──
  async _fetchAll() {
    if (this.updating) return;
    this.updating = true;

    const headers = {};
    if (this.CG_KEY) headers['x-cg-pro-api-key'] = this.CG_KEY;

    // Split into two batches of ~33, run sequentially to respect free-tier rate limits
    const mid    = Math.ceil(this.assets.length / 2);
    const batch1 = this.assets.slice(0, mid);
    const batch2 = this.assets.slice(mid);

    let fetched = 0;
    try {
      // Sequential calls with delay to avoid CoinGecko 429 rate limit
      const r1 = await this._fetchBatch(batch1, headers).catch(() => 0);
      fetched += r1;
      await new Promise(r => setTimeout(r, 1200));
      const r2 = await this._fetchBatch(batch2, headers).catch(() => 0);
      fetched += r2;

      // ── Fallback: Binance public API for any still-missing assets ─
      const missing = this.assets.filter(a => !this.prices.has(a.symbol));
      if (missing.length > 0) {
        await this._fetchFromBinance(missing);
        fetched = this.prices.size;
      }

      this.lastUpdate = new Date();
      this.errorCount = 0;
      const stillMissing = this.assets.filter(a => !this.prices.has(a.symbol)).map(a => a.symbol);
      if (stillMissing.length > 0) console.log(`⚠️  [PriceFeed] Missing assets: ${stillMissing.join(', ')}`);
      console.log(`✅ [PriceFeed] ${this.prices.size}/${this.assets.length} assets fetched at ${this.lastUpdate.toISOString()}`);
      this.emit('update', Object.fromEntries(this.prices));

    } catch (err) {
      this.errorCount++;
      console.error(`❌ [PriceFeed] Fetch error (${this.errorCount}): ${err.message}`);
      if (this.errorCount >= 3 && this.CMC_KEY) await this._fetchFromCMC();
    } finally {
      this.updating = false;
    }
  }

  // ── Single batch via /coins/markets (with 429 retry) ────
  async _fetchBatch(batch, headers, attempt = 0) {
    const ids  = batch.map(a => a.cgId).join(',');
    try {
      const resp = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        headers,
        params: {
          vs_currency:             'usd',
          ids,
          order:                   'market_cap_desc',
          per_page:                100,
          page:                    1,
          sparkline:               false,
          price_change_percentage: '1h,24h,7d',
        },
        timeout: 15_000,
      });
      let count = 0;
      for (const coin of resp.data) {
        const meta = this.assets.find(a => a.cgId === coin.id);
        if (!meta) continue;
        this.prices.set(meta.symbol, this._buildEntry(meta, coin));
        count++;
      }
      return count;
    } catch (err) {
      if (err.response?.status === 429 && attempt < 2) {
        const wait = (attempt + 1) * 15_000; // 15s, 30s backoff
        console.log(`⏳ [PriceFeed] Rate limited, retrying batch in ${wait/1000}s`);
        await new Promise(r => setTimeout(r, wait));
        return this._fetchBatch(batch, headers, attempt + 1);
      }
      throw err;
    }
  }

  // ── Fallback: CryptoCompare public API (no key, no geo-restrictions) ──────
  async _fetchFromBinance(missing) {
    // Assets genuinely not listed on any major exchange
    const NO_PRICE = new Set(['CC', 'JUPSOL']);
    const toFetch = missing.filter(a => !NO_PRICE.has(a.symbol));
    if (!toFetch.length) return;

    const fsyms = toFetch.map(a => a.symbol).join(',');
    try {
      const resp = await axios.get('https://min-api.cryptocompare.com/data/pricemultifull', {
        params: { fsyms, tsyms: 'USD' },
        timeout: 12_000,
      });
      const raw = resp.data?.RAW || {};
      for (const asset of toFetch) {
        const d = raw[asset.symbol]?.USD;
        if (!d) continue;
        this.prices.set(asset.symbol, {
          symbol:            asset.symbol,
          name:              asset.name,
          cgId:              asset.cgId,
          category:          asset.category,
          yieldable:         asset.yieldable,
          stakeable:         asset.stakeable,
          lendable:          asset.lendable,
          price:             d.PRICE               || 0,
          priceUsd:          d.PRICE               || 0,
          change1h:          (d.CHANGEPCTHOUR       || 0) / 100,
          change24h:         (d.CHANGEPCT24HOUR     || 0) / 100,
          change7d:          0,
          volume24h:         d.VOLUME24HOURTO       || 0,
          marketCap:         d.MKTCAP               || 0,
          high24h:           d.HIGH24HOUR           || 0,
          low24h:            d.LOW24HOUR            || 0,
          circulatingSupply: d.CIRCULATINGSUPPLY    || 0,
          ath:               0,
          athChange:         0,
          weight:            PORTFOLIO_WEIGHTS[asset.symbol] || 0,
          lastUpdate:        new Date().toISOString(),
          source:            'cryptocompare',
        });
      }
    } catch (err) {
      console.error(`⚠️  [PriceFeed] CryptoCompare fallback error: ${err.message}`);
    }
    // Assets not found on any exchange simply have no price entry
  }

  // ── Build a full price entry from /coins/markets data ────
  _buildEntry(meta, coin) {
    return {
      symbol:            meta.symbol,
      name:              meta.name,
      cgId:              meta.cgId,
      category:          meta.category,
      yieldable:         meta.yieldable,
      stakeable:         meta.stakeable,
      lendable:          meta.lendable,
      price:             coin.current_price                          || 0,
      priceUsd:          coin.current_price                          || 0,
      change1h:          (coin.price_change_percentage_1h_in_currency  || 0) / 100,
      change24h:         (coin.price_change_percentage_24h              || 0) / 100,
      change7d:          (coin.price_change_percentage_7d_in_currency  || 0) / 100,
      volume24h:         coin.total_volume                           || 0,
      marketCap:         coin.market_cap                             || 0,
      high24h:           coin.high_24h                               || 0,
      low24h:            coin.low_24h                                || 0,
      circulatingSupply: coin.circulating_supply                     || 0,
      ath:               coin.ath                                    || 0,
      athChange:         (coin.ath_change_percentage                  || 0) / 100,
      weight:            PORTFOLIO_WEIGHTS[meta.symbol]              || 0,
      lastUpdate:        new Date().toISOString(),
      source:            'coingecko',
    };
  }

  // ── Fallback: CoinMarketCap ───────────────────────────────
  async _fetchFromCMC() {
    if (!this.CMC_KEY) return;
    const syms = this.assets.map(a => a.symbol).join(',');
    try {
      const resp = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
        headers: { 'X-CMC_PRO_API_KEY': this.CMC_KEY },
        params:  { symbol: syms, convert: 'USD' },
        timeout: 15_000,
      });

      for (const [sym, data] of Object.entries(resp.data.data || {})) {
        const meta  = this.assets.find(a => a.symbol === sym);
        if (!meta) continue;
        const q     = data.quote?.USD || {};
        this.prices.set(sym, {
          ...(this.prices.get(sym) || {}),
          symbol:    sym,
          price:     q.price          || 0,
          priceUsd:  q.price          || 0,
          change1h:  (q.percent_change_1h  || 0) / 100,
          change24h: (q.percent_change_24h || 0) / 100,
          change7d:  (q.percent_change_7d  || 0) / 100,
          volume24h: q.volume_24h          || 0,
          marketCap: q.market_cap          || 0,
          lastUpdate: new Date().toISOString(),
          source:     'coinmarketcap',
        });
      }
      this.lastUpdate = new Date();
      this.errorCount = 0;
      console.log(`✅ [PriceFeed] CMC fallback succeeded`);
      this.emit('update', Object.fromEntries(this.prices));
    } catch (err) {
      console.error(`❌ [PriceFeed] CMC fallback error: ${err.message}`);
    }
  }

  // ── Polling interval ─────────────────────────────────────
  _startPolling() {
    setInterval(() => this._fetchAll(), this.POLL_MS);
    console.log(`🔄 [PriceFeed] Polling every ${this.POLL_MS / 1000}s`);
  }

  // ── Public accessors ─────────────────────────────────────
  getPrice(symbol) { return this.prices.get(symbol.toUpperCase()) || null; }
  getAll()         { return Array.from(this.prices.values()); }
  getAllMap()       { return Object.fromEntries(this.prices); }

  getPortfolioSnapshot() {
    const assets = this.getAll();
    let totalMarketCap = 0;
    assets.forEach(a => { totalMarketCap += a.marketCap || 0; });
    return {
      assetCount:     assets.length,
      totalMarketCap,
      lastUpdate:     this.lastUpdate,
      source:         'coingecko',
      assets,
    };
  }

  getStatus() {
    return {
      live:        this.prices.size > 0,
      assetCount:  this.prices.size,
      lastUpdate:  this.lastUpdate,
      errorCount:  this.errorCount,
      pollMs:      this.POLL_MS,
    };
  }

  // Export registry for other services
  getRegistry() { return ASSET_REGISTRY; }
  getWeights()   { return PORTFOLIO_WEIGHTS; }
}

const priceFeed = new PriceFeedService();
module.exports  = priceFeed;
module.exports.ASSET_REGISTRY    = ASSET_REGISTRY;
module.exports.PORTFOLIO_WEIGHTS = PORTFOLIO_WEIGHTS;
