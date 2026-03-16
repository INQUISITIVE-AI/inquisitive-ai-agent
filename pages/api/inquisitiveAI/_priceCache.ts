// ── INQUISITIVE — Shared Price Cache ─────────────────────────────────────────
// Module-level cache persists across warm Vercel invocations of the same route.
// Both assets.ts and dashboard.ts import getPrices() from here so each route
// benefits from per-instance caching and last-known-good data on CG failures.

import { ASSET_REGISTRY } from './_brain';

const NO_CC   = new Set(['CC', 'JUPSOL']);
const ALL_CGS = ASSET_REGISTRY.map(a => a.cgId).join(',');
const CACHE_TTL = 5 * 60_000; // 5 minutes

export interface RawCoin {
  symbol:            string;
  priceUsd:          number;
  change1h:          number;
  change24h:         number;
  change7d:          number;
  volume24h:         number;
  marketCap:         number;
  high24h:           number;
  low24h:            number;
  circulatingSupply: number;
  ath:               number;
  athChange:         number;
  source:            'coingecko' | 'cryptocompare';
}

// Module-level cache — one per warm Vercel function instance
let _cache: { data: Map<string, RawCoin>; ts: number } | null = null;

function cgHeaders(): HeadersInit {
  const key = process.env.COINGECKO_API_KEY;
  return key ? { 'x-cg-demo-api-key': key } : {};
}

async function fetchFromCoinGecko(): Promise<Map<string, RawCoin>> {
  const url =
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ALL_CGS}` +
    `&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=1h,24h,7d`;
  const r = await fetch(url, { headers: cgHeaders(), signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
  const coins: any[] = await r.json();
  const map = new Map<string, RawCoin>();
  for (const coin of coins) {
    const meta = ASSET_REGISTRY.find(a => a.cgId === coin.id);
    if (!meta) continue;
    map.set(meta.symbol, {
      symbol:            meta.symbol,
      priceUsd:          coin.current_price                           ?? 0,
      change1h:         (coin.price_change_percentage_1h_in_currency  ?? 0) / 100,
      change24h:        (coin.price_change_percentage_24h              ?? 0) / 100,
      change7d:         (coin.price_change_percentage_7d_in_currency  ?? 0) / 100,
      volume24h:         coin.total_volume          ?? 0,
      marketCap:         coin.market_cap            ?? 0,
      high24h:           coin.high_24h              ?? 0,
      low24h:            coin.low_24h               ?? 0,
      circulatingSupply: coin.circulating_supply    ?? 0,
      ath:               coin.ath                   ?? 0,
      athChange:        (coin.ath_change_percentage  ?? 0) / 100,
      source:            'coingecko',
    });
  }
  return map;
}

async function fetchFromCryptoCompare(syms: string[]): Promise<Map<string, RawCoin>> {
  const map     = new Map<string, RawCoin>();
  const toFetch = syms.filter(s => !NO_CC.has(s));
  if (!toFetch.length) return map;

  const BSIZ   = 20;
  const chunks: string[][] = [];
  for (let i = 0; i < toFetch.length; i += BSIZ) chunks.push(toFetch.slice(i, i + BSIZ));

  const results = await Promise.allSettled(chunks.map(async ch => {
    const r = await fetch(
      `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${ch.join(',')}&tsyms=USD`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) return {} as Record<string, any>;
    const d = await r.json();
    return (d?.RAW || {}) as Record<string, any>;
  }));

  for (let i = 0; i < chunks.length; i++) {
    const res = results[i];
    if (res.status !== 'fulfilled') continue;
    const raw = res.value;
    for (const sym of chunks[i]) {
      const c = raw[sym]?.USD;
      if (!c?.PRICE || c.PRICE <= 0) continue;
      map.set(sym, {
        symbol:            sym,
        priceUsd:          c.PRICE              ?? 0,
        change1h:         (c.CHANGEPCTHOUR       ?? 0) / 100,
        change24h:        (c.CHANGEPCT24HOUR      ?? 0) / 100,
        change7d:          0,
        volume24h:         c.VOLUME24HOURTO      ?? 0,
        marketCap:         c.MKTCAP              ?? 0,
        high24h:           c.HIGH24HOUR          ?? 0,
        low24h:            c.LOW24HOUR           ?? 0,
        circulatingSupply: c.CIRCULATINGSUPPLY   ?? 0,
        ath:               0,
        athChange:         0,
        source:            'cryptocompare',
      });
    }
  }
  return map;
}

export async function getPrices(): Promise<{
  map:    Map<string, RawCoin>;
  source: string;
  cached: boolean;
}> {
  // Serve from fresh cache — skip all external calls
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return { map: _cache.data, source: 'cache', cached: true };
  }

  let map      = new Map<string, RawCoin>();
  let cgFailed = false;

  try {
    map = await fetchFromCoinGecko();
  } catch (e: any) {
    cgFailed = true;
    console.warn('[priceCache] CoinGecko failed:', e.message);
    // Seed map from stale cache so CC only fetches truly missing symbols
    if (_cache) {
      for (const [k, v] of _cache.data) map.set(k, v);
    }
  }

  // Fill gaps via CryptoCompare
  const missing = ASSET_REGISTRY.filter(a => !map.has(a.symbol)).map(a => a.symbol);
  if (missing.length > 0) {
    try {
      const cc = await fetchFromCryptoCompare(missing);
      for (const [sym, coin] of cc) map.set(sym, coin);
    } catch (e: any) {
      console.warn('[priceCache] CryptoCompare failed:', e.message);
    }
  }

  // Only promote to cache if we have at minimum BTC and ETH prices
  if (map.has('BTC') && map.has('ETH')) {
    _cache = { data: map, ts: Date.now() };
    const src = cgFailed ? 'cryptocompare' : 'coingecko';
    return { map, source: src, cached: false };
  }

  // Both sources failed — return stale cache rather than zeros
  if (_cache) {
    console.warn('[priceCache] Both sources failed — serving stale cache');
    return { map: _cache.data, source: 'stale-cache', cached: true };
  }

  // No cache and no data — return empty map (caller handles gracefully)
  return { map, source: 'unavailable', cached: false };
}
