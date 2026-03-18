import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from './_brain';
import type { AssetInput, FGIndex } from './_brain';
import { getPrices } from './_priceCache';
import { getOnchain } from './_onchainCache';

async function buildInputMap(): Promise<Map<string, AssetInput>> {
  const { map: priceMap } = await getPrices();
  const map = new Map<string, AssetInput>();
  for (const meta of ASSET_REGISTRY) {
    const p = priceMap.get(meta.symbol);
    if (!p) continue;
    map.set(meta.symbol, {
      symbol:    meta.symbol,
      category:  meta.category,
      weight:    PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
      stakeable: meta.stakeable,
      lendable:  meta.lendable,
      yieldable: meta.yieldable,
      priceUsd:  p.priceUsd,
      change24h: p.change24h,
      change7d:  p.change7d,
      volume24h: p.volume24h,
      marketCap: p.marketCap,
      athChange: p.athChange,
    });
  }
  return map;
}


export const config = { maxDuration: 30 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [mapResult, fgResult, snap] = await Promise.allSettled([
      buildInputMap(),
      fetch('https://api.alternative.me/fng/', { signal: AbortSignal.timeout(5000) }),
      getOnchain(),
    ]);

    const inputMap  = mapResult.status === 'fulfilled' ? mapResult.value : new Map<string, AssetInput>();
    const vaultEthIQ = snap.status === 'fulfilled' ? snap.value.vaultEth : 0;

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
    const indexValue      = 100 * (1 + return7d);
    const ethPriceIQ      = inputMap.get('ETH')?.priceUsd ?? 2000;
    const vaultValueIQ    = vaultEthIQ > 0 ? vaultEthIQ * ethPriceIQ : 0;
    const pnl24h          = vaultValueIQ > 0 ? vaultValueIQ * return24h : 0;
    // Win rate: fraction of portfolio assets up in last 24 h
    const winRate         = assetsWithData.length > 0
      ? assetsWithData.filter(inp => inp.change24h > 0).length / assetsWithData.length : 0;

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({
      aiSignals: {
        cycleCount: snap.status === 'fulfilled' ? snap.value.cycleCount : 0,
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
      vault: { 
        eth: parseFloat(vaultEthIQ.toFixed(6)), 
        usd: parseFloat(vaultValueIQ.toFixed(2)), 
        ethPrice: ethPriceIQ,
        address: '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb',
        owner: snap.status === 'fulfilled' ? snap.value.ownerAddr : '',
        automationEnabled: snap.status === 'fulfilled' ? snap.value.automationEnabled : false,
        portfolioLength: snap.status === 'fulfilled' ? snap.value.portfolioLength : 0
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
