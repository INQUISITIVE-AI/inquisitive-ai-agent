import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from './_brain';
import type { AssetInput, FGIndex } from './_brain';

const NO_CC = new Set(['CC', 'JUPSOL']); // no reliable CryptoCompare ticker

function buildBaseAsset(meta: typeof ASSET_REGISTRY[0], coin: any, source: string) {
  return {
    symbol:            meta.symbol,
    name:              meta.name,
    cgId:              meta.cgId,
    category:          meta.category,
    yieldable:         meta.yieldable,
    stakeable:         meta.stakeable,
    lendable:          meta.lendable,
    price:             coin.current_price                           ?? 0,
    priceUsd:          coin.current_price                           ?? 0,
    change1h:         (coin.price_change_percentage_1h_in_currency  ?? 0) / 100,
    change24h:        (coin.price_change_percentage_24h              ?? 0) / 100,
    change7d:         (coin.price_change_percentage_7d_in_currency  ?? 0) / 100,
    volume24h:         coin.total_volume         ?? 0,
    marketCap:         coin.market_cap           ?? 0,
    high24h:           coin.high_24h             ?? 0,
    low24h:            coin.low_24h              ?? 0,
    circulatingSupply: coin.circulating_supply   ?? 0,
    ath:               coin.ath                  ?? 0,
    athChange:        (coin.ath_change_percentage ?? 0) / 100,
    weight:            PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
    lastUpdate:        new Date().toISOString(),
    source,
  };
}

// Single request — CoinGecko supports up to 250 coins per call; 65 is fine
const ALL_CGS = ASSET_REGISTRY.map(a => a.cgId).join(',');
async function fetchAllMarkets(): Promise<any[]> {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ALL_CGS}&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=1h,24h,7d`;
  const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
  return r.json();
}

// CryptoCompare fallback in parallel batches of 20 (avoids huge URL)
async function fetchCCBatch(batch: typeof ASSET_REGISTRY): Promise<Map<string, any>> {
  const result  = new Map<string, any>();
  const toFetch = batch.filter(a => !NO_CC.has(a.symbol));
  if (!toFetch.length) return result;
  const fsyms = toFetch.map(a => a.symbol).join(',');
  try {
    const r = await fetch(
      `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fsyms}&tsyms=USD`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) return result;
    const d   = await r.json();
    const raw = d?.RAW || {};
    for (const meta of toFetch) {
      const c = raw[meta.symbol]?.USD;
      if (c?.PRICE > 0) result.set(meta.symbol, c);
    }
  } catch {}
  return result;
}

async function getAssets() {
  const baseMap = new Map<string, any>();

  // Single CoinGecko request for all 65 + Fear & Greed in parallel
  const [cgRes, fgRes] = await Promise.allSettled([
    fetchAllMarkets(),
    fetch('https://api.alternative.me/fng/', { signal: AbortSignal.timeout(5000) }),
  ]);

  if (cgRes.status === 'fulfilled') {
    for (const coin of cgRes.value) {
      const meta = ASSET_REGISTRY.find(a => a.cgId === coin.id);
      if (meta) baseMap.set(meta.symbol, buildBaseAsset(meta, coin, 'coingecko'));
    }
  }

  // CryptoCompare fallback — parallel batches of 20
  const missing = ASSET_REGISTRY.filter(a => !baseMap.has(a.symbol));
  if (missing.length > 0) {
    const BSIZ = 20;
    const chunks: (typeof ASSET_REGISTRY)[] = [];
    for (let i = 0; i < missing.length; i += BSIZ) chunks.push(missing.slice(i, i + BSIZ));
    const ccResults = await Promise.allSettled(chunks.map(ch => fetchCCBatch(ch)));
    for (let i = 0; i < chunks.length; i++) {
      const res = ccResults[i];
      if (res.status !== 'fulfilled') continue;
      for (const meta of chunks[i]) {
        if (baseMap.has(meta.symbol)) continue;
        const c = res.value.get(meta.symbol);
        if (!c) continue;
        baseMap.set(meta.symbol, buildBaseAsset(meta, {
          current_price:                          c.PRICE             ?? 0,
          price_change_percentage_24h:            c.CHANGEPCT24HOUR   ?? 0,
          price_change_percentage_7d_in_currency: 0,
          price_change_percentage_1h_in_currency: c.CHANGEPCTHOUR     ?? 0,
          total_volume:                           c.VOLUME24HOURTO    ?? 0,
          market_cap:                             c.MKTCAP            ?? 0,
          high_24h:                               c.HIGH24HOUR        ?? 0,
          low_24h:                                c.LOW24HOUR         ?? 0,
          circulating_supply:                     c.CIRCULATINGSUPPLY ?? 0,
          ath: 0, ath_change_percentage: 0,
        }, 'cryptocompare'));
      }
    }
  }

  // Parse Fear & Greed
  let fg: FGIndex | null = null;
  if (fgRes.status === 'fulfilled' && fgRes.value.ok) {
    try {
      const d = await fgRes.value.json();
      if (d?.data?.[0]) fg = { value: parseInt(d.data[0].value), valueClassification: d.data[0].value_classification };
    } catch {}
  }

  // Build AssetInput array for brain scoring (all 65 in registry order)
  const allInputs: AssetInput[] = ASSET_REGISTRY.map(meta => {
    const b = baseMap.get(meta.symbol);
    return {
      symbol:    meta.symbol,
      category:  meta.category,
      weight:    PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
      stakeable: meta.stakeable,
      lendable:  meta.lendable,
      yieldable: meta.yieldable,
      priceUsd:  b?.priceUsd  ?? 0,
      change24h: b?.change24h ?? 0,
      change7d:  b?.change7d  ?? 0,
      volume24h: b?.volume24h ?? 0,
      marketCap: b?.marketCap ?? 0,
      athChange: b?.athChange ?? 0,
    };
  });

  // Determine market regime from BTC/ETH (convert decimal back to percent for getRegime)
  const btcChgPct = (baseMap.get('BTC')?.change24h ?? 0) * 100;
  const ethChgPct = (baseMap.get('ETH')?.change24h ?? 0) * 100;
  const regime    = getRegime(btcChgPct, ethChgPct);

  // Run real 5-engine brain scoring on all 65 assets simultaneously
  const scored = new Map(allInputs.map(inp => [inp.symbol, scoreAsset(inp, regime, fg, allInputs)]));

  // Merge base asset data with brain scores
  return ASSET_REGISTRY.map(meta => {
    const base = baseMap.get(meta.symbol);
    const s    = scored.get(meta.symbol)!;
    if (!base) {
      return {
        symbol: meta.symbol, name: meta.name, cgId: meta.cgId,
        category: meta.category, yieldable: meta.yieldable, stakeable: meta.stakeable, lendable: meta.lendable,
        price: 0, priceUsd: 0, change1h: 0, change24h: 0, change7d: 0,
        volume24h: 0, marketCap: 0, high24h: 0, low24h: 0, circulatingSupply: 0, ath: 0, athChange: 0,
        weight: PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
        signal: s.action, confidence: s.finalScore, brainScore: s.finalScore,
        components: s.components, reasons: s.reasons,
        lastUpdate: new Date().toISOString(), source: 'unavailable',
      };
    }
    return {
      ...base,
      signal:     s.action,
      confidence: s.finalScore,
      brainScore: s.finalScore,
      components: s.components,
      reasons:    s.reasons,
    };
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const assets = await getAssets();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json({ assets, count: assets.length, source: 'CoinGecko REAL LIVE + 5-Engine AI Brain' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
}
