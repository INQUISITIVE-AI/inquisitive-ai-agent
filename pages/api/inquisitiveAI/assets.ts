import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from './_brain';
import type { AssetInput, FGIndex } from './_brain';
import { getPrices } from './_priceCache';

async function getAssets() {
  const baseMap = new Map<string, any>();

  // Shared cached price fetch + Fear & Greed in parallel
  const [priceResult, fgRes] = await Promise.allSettled([
    getPrices(),
    fetch('https://api.alternative.me/fng/', { signal: AbortSignal.timeout(5000) }),
  ]);

  if (priceResult.status === 'fulfilled') {
    const { map: priceMap } = priceResult.value;
    for (const meta of ASSET_REGISTRY) {
      const p = priceMap.get(meta.symbol);
      if (!p) continue;
      baseMap.set(meta.symbol, {
        symbol:            meta.symbol,
        name:              meta.name,
        cgId:              meta.cgId,
        category:          meta.category,
        yieldable:         meta.yieldable,
        stakeable:         meta.stakeable,
        lendable:          meta.lendable,
        price:             p.priceUsd,
        priceUsd:          p.priceUsd,
        change1h:          p.change1h,
        change24h:         p.change24h,
        change7d:          p.change7d,
        volume24h:         p.volume24h,
        marketCap:         p.marketCap,
        high24h:           p.high24h,
        low24h:            p.low24h,
        circulatingSupply: p.circulatingSupply,
        ath:               p.ath,
        athChange:         p.athChange,
        weight:            PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
        lastUpdate:        new Date().toISOString(),
        source:            p.source,
      });
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
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ assets, count: assets.length, source: 'CoinGecko REAL LIVE + 5-Engine AI Brain' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
}
