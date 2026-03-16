import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from '../_brain';
import type { AssetInput, FGIndex } from '../_brain';

async function fetchFearGreed(): Promise<FGIndex | null> {
  try {
    const r = await fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const d = await r.json();
    const item = d?.data?.[0];
    return item ? { value: parseInt(item.value), valueClassification: item.value_classification } : null;
  } catch { return null; }
}

async function fetchCoinData(cgId: string): Promise<any> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${cgId}&order=market_cap_desc&per_page=1&sparkline=false&price_change_percentage=1h,24h,7d`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.[0] ?? null;
  } catch { return null; }
}

async function fetchBtcEth(): Promise<any> {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true', { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const symbol = (req.query.symbol as string)?.toUpperCase();
  const meta   = ASSET_REGISTRY.find(a => a.symbol === symbol);
  if (!meta) return res.status(404).json({ error: `Unknown asset: ${symbol}` });

  try {
    const [coin, fg, btcEth] = await Promise.all([
      fetchCoinData(meta.cgId),
      fetchFearGreed(),
      fetchBtcEth(),
    ]);

    const btcChg = btcEth?.bitcoin?.usd_24h_change  ?? 0;
    const ethChg = btcEth?.ethereum?.usd_24h_change ?? 0;
    const regime = getRegime(btcChg, ethChg);

    // Build AssetInput for this coin
    const inp: AssetInput = {
      symbol:    meta.symbol,
      category:  meta.category,
      weight:    PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
      stakeable: meta.stakeable,
      lendable:  meta.lendable,
      yieldable: meta.yieldable,
      priceUsd:  coin?.current_price ?? 0,
      change24h: (coin?.price_change_percentage_24h ?? 0) / 100,
      change7d:  (coin?.price_change_percentage_7d_in_currency ?? 0) / 100,
      volume24h: coin?.total_volume ?? 0,
      marketCap: coin?.market_cap ?? 0,
      athChange: (coin?.ath_change_percentage ?? 0) / 100,
    };

    // Build portfolio context (category counts drive diversification bonus)
    const allInputs: AssetInput[] = ASSET_REGISTRY.map(m => ({
      symbol: m.symbol, category: m.category, weight: PORTFOLIO_WEIGHTS[m.symbol] ?? 0,
      stakeable: m.stakeable, lendable: m.lendable, yieldable: m.yieldable,
      priceUsd: m.symbol === meta.symbol ? inp.priceUsd : 0,
      change24h: 0, change7d: 0, volume24h: 0, marketCap: 0, athChange: 0,
    }));

    const signal = scoreAsset(inp, regime, fg, allInputs);

    const macro = {
      regime,
      riskScore: regime === 'BULL' ? 0.35 : regime === 'BEAR' ? 0.72 : 0.5,
      signals: [
        { signal: 'BTC 24h',     desc: `${btcChg >= 0 ? '+' : ''}${btcChg.toFixed(2)}% — market barometer` },
        { signal: 'ETH 24h',     desc: `${ethChg >= 0 ? '+' : ''}${ethChg.toFixed(2)}% — risk appetite proxy` },
        { signal: 'Fear & Greed', desc: `${fg?.value ?? '—'} (${fg?.valueClassification ?? 'Unknown'}) — sentiment gauge` },
      ],
    };

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ signal, macro, fearGreed: fg });
  } catch (err: any) {
    return res.status(500).json({ error: 'Analysis failed' });
  }
}
