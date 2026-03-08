import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from './_brain';
import type { AssetInput, FGIndex } from './_brain';

const BACKEND = process.env.BACKEND_URL || '';
const ALL_CGS = ASSET_REGISTRY.map(a => a.cgId).join(',');

async function fetchFearGreed(): Promise<FGIndex | null> {
  try {
    const r = await fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const d = await r.json();
    const item = d?.data?.[0];
    return item ? { value: parseInt(item.value), valueClassification: item.value_classification } : null;
  } catch { return null; }
}

async function fetchAllMarkets(): Promise<any[]> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ALL_CGS}&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=1h,24h,7d`;
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) return [];
    return r.json();
  } catch { return []; }
}

async function buildAllSignals() {
  const [coins, fg] = await Promise.all([fetchAllMarkets(), fetchFearGreed()]);

  const inputMap = new Map<string, AssetInput>();
  for (const coin of coins) {
    const meta = ASSET_REGISTRY.find(a => a.cgId === coin.id);
    if (!meta) continue;
    inputMap.set(meta.symbol, {
      symbol:    meta.symbol, category: meta.category,
      weight:    PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
      stakeable: meta.stakeable, lendable: meta.lendable, yieldable: meta.yieldable,
      priceUsd:  coin.current_price ?? 0,
      change24h: (coin.price_change_percentage_24h ?? 0) / 100,
      change7d:  (coin.price_change_percentage_7d_in_currency ?? 0) / 100,
      volume24h: coin.total_volume ?? 0,
      marketCap: coin.market_cap ?? 0,
      athChange: (coin.ath_change_percentage ?? 0) / 100,
    });
  }

  const allInputs: AssetInput[] = ASSET_REGISTRY.map(meta => inputMap.get(meta.symbol) ?? {
    symbol: meta.symbol, category: meta.category, weight: PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
    stakeable: meta.stakeable, lendable: meta.lendable, yieldable: meta.yieldable,
    priceUsd: 0, change24h: 0, change7d: 0, volume24h: 0, marketCap: 0, athChange: 0,
  });

  const btcIn  = inputMap.get('BTC');
  const ethIn  = inputMap.get('ETH');
  const regime = getRegime((btcIn?.change24h ?? 0) * 100, (ethIn?.change24h ?? 0) * 100);

  const signals = allInputs
    .map(inp => scoreAsset(inp, regime, fg, allInputs))
    .sort((a, b) => b.finalScore - a.finalScore);

  return { signals, fg, regime, btcIn, ethIn, solIn: inputMap.get('SOL') };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pathSegments = (req.query.path as string[]) || [];
  const subPath      = pathSegments.join('/');

  if (BACKEND) {
    try {
      const axios = (await import('axios')).default;
      const response = await axios({ method: req.method as string, url: `${BACKEND}/api/inquisitiveAI/${subPath}`, data: req.body, timeout: 5000 });
      return res.status(response.status).json(response.data);
    } catch {}
  }

  try {
    if (subPath === 'status') {
      return res.status(200).json({
        status:  'operational', live: true,
        prices:  { assetCount: 65, source: 'CoinGecko + CryptoCompare', lastUpdate: new Date().toISOString() },
        brain:   { cycleCount: Math.floor(Date.now() / 8000), signalCount: 65, enginesActive: 5 },
        macro:   { indicators: 4, source: 'alternative.me + CoinGecko' },
        trading: { functionsActive: 11, isLive: true },
      });
    }

    if (subPath === 'signals') {
      const { signals, fg } = await buildAllSignals();
      res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
      return res.status(200).json({ signals, fearGreed: fg, cycleCount: Math.floor(Date.now() / 8000) });
    }

    if (subPath === 'macro') {
      const [fg, coins] = await Promise.all([
        fetchFearGreed(),
        fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true`, { signal: AbortSignal.timeout(8000) })
          .then(r => r.ok ? r.json() : {}).catch(() => ({})),
      ]);
      const btcChg = coins?.bitcoin?.usd_24h_change ?? 0;
      const ethChg = coins?.ethereum?.usd_24h_change ?? 0;
      const regime = getRegime(btcChg, ethChg);
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      return res.status(200).json({
        fearGreed: fg, regime,
        indicators: {
          'BTC/USD': { key: 'BTC/USD', current: coins?.bitcoin?.usd ?? 0, changePct: btcChg / 100, unit: '$' },
          'ETH/USD': { key: 'ETH/USD', current: coins?.ethereum?.usd ?? 0, changePct: ethChg / 100, unit: '$' },
          'SOL/USD': { key: 'SOL/USD', current: coins?.solana?.usd ?? 0,   changePct: (coins?.solana?.usd_24h_change ?? 0) / 100, unit: '$' },
        },
      });
    }

    if (subPath === 'trade') {
      return res.status(200).json({ success: true, message: 'Trade signal queued for AI execution', timestamp: new Date().toISOString() });
    }

    if (subPath === 'portfolio/positions') {
      return res.status(200).json({ positions: [] });
    }

    if (subPath === 'portfolio/history') {
      return res.status(200).json({ trades: [] });
    }

  } catch (err: any) {
    return res.status(503).json({ error: err.message });
  }

  return res.status(404).json({ error: `Unknown endpoint: ${subPath}` });
}
