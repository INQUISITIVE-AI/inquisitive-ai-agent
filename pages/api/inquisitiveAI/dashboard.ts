import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from './_brain';
import type { AssetInput, FGIndex } from './_brain';

const NO_CC   = new Set(['CC', 'JUPSOL']);
const ALL_CGS = ASSET_REGISTRY.map(a => a.cgId).join(',');

async function fetchMarkets(): Promise<any[]> {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ALL_CGS}&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=1h,24h,7d`;
  const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`CG ${r.status}`);
  return r.json();
}

async function buildInputMap(): Promise<Map<string, AssetInput>> {
  const map = new Map<string, AssetInput>();

  let coins: any[] = [];
  try { coins = await fetchMarkets(); } catch {}

  for (const coin of coins) {
    const meta = ASSET_REGISTRY.find(a => a.cgId === coin.id);
    if (!meta) continue;
    map.set(meta.symbol, {
      symbol:    meta.symbol,
      category:  meta.category,
      weight:    PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
      stakeable: meta.stakeable,
      lendable:  meta.lendable,
      yieldable: meta.yieldable,
      priceUsd:  coin.current_price ?? 0,
      change24h: (coin.price_change_percentage_24h ?? 0) / 100,
      change7d:  (coin.price_change_percentage_7d_in_currency ?? 0) / 100,
      volume24h: coin.total_volume ?? 0,
      marketCap: coin.market_cap ?? 0,
      athChange: (coin.ath_change_percentage ?? 0) / 100,
    });
  }

  // CryptoCompare fallback — parallel batches of 20
  const missing = ASSET_REGISTRY.filter(a => !map.has(a.symbol) && !NO_CC.has(a.symbol));
  if (missing.length > 0) {
    const BSIZ = 20;
    const chunks: (typeof ASSET_REGISTRY)[] = [];
    for (let i = 0; i < missing.length; i += BSIZ) chunks.push(missing.slice(i, i + BSIZ));
    const results = await Promise.allSettled(chunks.map(async ch => {
      const fsyms = ch.map(a => a.symbol).join(',');
      const r = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fsyms}&tsyms=USD`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return {} as Record<string, any>;
      const d = await r.json();
      return (d?.RAW || {}) as Record<string, any>;
    }));
    for (let i = 0; i < chunks.length; i++) {
      const res = results[i];
      if (res.status !== 'fulfilled') continue;
      const raw = res.value;
      for (const meta of chunks[i]) {
        const c = raw[meta.symbol]?.USD;
        if (c?.PRICE > 0) {
          map.set(meta.symbol, {
            symbol: meta.symbol, category: meta.category, weight: PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
            stakeable: meta.stakeable, lendable: meta.lendable, yieldable: meta.yieldable,
            priceUsd: c.PRICE, change24h: (c.CHANGEPCT24HOUR ?? 0) / 100,
            change7d: 0, volume24h: c.VOLUME24HOURTO ?? 0, marketCap: c.MKTCAP ?? 0, athChange: 0,
          });
        }
      }
    }
  }

  return map;
}

export const config = { maxDuration: 30 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [mapResult, fgResult] = await Promise.allSettled([
      buildInputMap(),
      fetch('https://api.alternative.me/fng/', { signal: AbortSignal.timeout(5000) }),
    ]);

    const inputMap = mapResult.status === 'fulfilled' ? mapResult.value : new Map<string, AssetInput>();

    let fg: FGIndex | null = null;
    if (fgResult.status === 'fulfilled' && fgResult.value.ok) {
      try {
        const d = await fgResult.value.json();
        if (d?.data?.[0]) fg = { value: parseInt(d.data[0].value), valueClassification: d.data[0].value_classification };
      } catch {}
    }

    const allInputs: AssetInput[] = ASSET_REGISTRY.map(meta => inputMap.get(meta.symbol) ?? {
      symbol: meta.symbol, category: meta.category, weight: PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
      stakeable: meta.stakeable, lendable: meta.lendable, yieldable: meta.yieldable,
      priceUsd: 0, change24h: 0, change7d: 0, volume24h: 0, marketCap: 0, athChange: 0,
    });

    const btcIn  = inputMap.get('BTC');
    const ethIn  = inputMap.get('ETH');
    const solIn  = inputMap.get('SOL');
    const regime = getRegime((btcIn?.change24h ?? 0) * 100, (ethIn?.change24h ?? 0) * 100);

    const signals = allInputs
      .map(inp => scoreAsset(inp, regime, fg, allInputs))
      .sort((a, b) => b.finalScore - a.finalScore);

    const buys  = signals.filter(s => s.action === 'BUY').length;
    const sells = signals.filter(s => s.action === 'SELL' || s.action === 'REDUCE').length;

    // ── Real portfolio performance from live weighted 65-asset basket ─────────
    const weightSum       = Object.values(PORTFOLIO_WEIGHTS).reduce((s, w) => s + w, 0) || 1;
    const assetsWithData  = allInputs.filter(inp => inp.priceUsd > 0);
    const return24h       = assetsWithData.reduce((s, inp) =>
      s + (PORTFOLIO_WEIGHTS[inp.symbol] || 0) * inp.change24h, 0) / weightSum;
    const return7d        = assetsWithData.reduce((s, inp) =>
      s + (PORTFOLIO_WEIGHTS[inp.symbol] || 0) * inp.change7d, 0) / weightSum;
    // Index value: base $100 invested 7 days ago → current value
    const indexValue      = 100 * (1 + return7d);
    // P&L expressed as $ per $100 base over 24 h
    const pnl24h          = return24h * 100;
    // Win rate: fraction of portfolio assets up in last 24 h
    const winRate         = assetsWithData.length > 0
      ? assetsWithData.filter(inp => inp.change24h > 0).length / assetsWithData.length : 0;

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    res.status(200).json({
      aiSignals: {
        cycleCount: Math.floor(Date.now() / 8000),
        buys, sells,
        topBuys: signals,
      },
      risk: {
        regime,
        riskScore: regime === 'BULL' ? 0.35 : regime === 'BEAR' ? 0.72 : 0.5,
        fearGreed: fg,
        portfolioHeat: 0,
        drawdown: 0,
        isLive: true,
      },
      performance: {
        totalPnL: pnl24h,
        winRate,
        totalTrades: buys + sells,
        return24h,
        return7d,
      },
      portfolio: {
        totalValue: indexValue,
        assetCount: ASSET_REGISTRY.length,
        return24h,
        return7d,
        composition: ASSET_REGISTRY
          .filter(meta => (PORTFOLIO_WEIGHTS[meta.symbol] ?? 0) > 0)
          .map(meta => {
            const inp    = inputMap.get(meta.symbol);
            const signal = signals.find(s => s.symbol === meta.symbol);
            return {
              symbol:     meta.symbol,
              name:       meta.name,
              category:   meta.category,
              weight:     PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
              priceUsd:   inp?.priceUsd  ?? 0,
              change24h:  inp?.change24h ?? 0,
              change7d:   inp?.change7d  ?? 0,
              action:     signal?.action     || 'HOLD',
              confidence: signal?.finalScore || 0,
            };
          })
          .sort((a, b) => b.weight - a.weight),
      },
      macro: {
        fearGreed: fg,
        indicators: {
          'BTC/USD': { key: 'BTC/USD', current: btcIn?.priceUsd ?? 0, changePct: btcIn?.change24h ?? 0, unit: '$' },
          'ETH/USD': { key: 'ETH/USD', current: ethIn?.priceUsd ?? 0, changePct: ethIn?.change24h ?? 0, unit: '$' },
          'SOL/USD': { key: 'SOL/USD', current: solIn?.priceUsd ?? 0, changePct: solIn?.change24h ?? 0, unit: '$' },
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}
