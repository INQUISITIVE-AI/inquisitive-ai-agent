import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS } from '../_brain';

export const config = { maxDuration: 30 };

// ── Module-level sparkline cache ─────────────────────────────────────────────
// Prevents the flat-line fallback chart when CoinGecko rate-limits or times out.
let _sparkCache: { curve: any[]; assetsInSeries: number; totalWeight: number; ts: number } | null = null;
const SPARK_CACHE_TTL = 10 * 60_000; // 10 minutes

// Single /coins/markets call with sparkline=true returns 168-hour sparklines for all assets.
// This replaces 15 individual market_chart calls that frequently hit CoinGecko rate limits.


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const totalWeight = Object.values(PORTFOLIO_WEIGHTS).reduce((s, w) => s + w, 0) || 1;
    const allIds      = ASSET_REGISTRY.map(a => a.cgId).join(',');

    // ONE API call — sparkline=true gives 168-point hourly price series per asset
    const cgKey = process.env.COINGECKO_API_KEY;
    const cgHeaders: Record<string, string> = cgKey ? { 'x-cg-demo-api-key': cgKey } : {};
    const marketsRes = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${allIds}` +
      `&order=market_cap_desc&per_page=100&sparkline=true&price_change_percentage=7d`,
      { headers: cgHeaders, signal: AbortSignal.timeout(15000) }
    ).then(r => r.ok ? r.json() : []).catch(() => []);

    if (!Array.isArray(marketsRes) || marketsRes.length === 0) {
      if (_sparkCache && Date.now() - _sparkCache.ts < SPARK_CACHE_TTL) {
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        return res.status(200).json({ curve: _sparkCache.curve, assetsInSeries: _sparkCache.assetsInSeries, totalWeight: _sparkCache.totalWeight, cached: true });
      }
      return res.status(200).json({ curve: [], assetsInSeries: 0, totalWeight: 0, unavailable: true });
    }

    // Build series: normalize each asset's sparkline to index 1.0 at t=0
    const series: { sym: string; w: number; pts: number[] }[] = [];
    for (const coin of marketsRes as any[]) {
      const meta   = ASSET_REGISTRY.find(a => a.cgId === coin.id);
      const prices = coin.sparkline_in_7d?.price as number[] | undefined;
      if (!meta || !prices || prices.length < 2) continue;
      const w = PORTFOLIO_WEIGHTS[meta.symbol] ?? 0;
      if (w === 0) continue;
      const base = prices[0] || 1;
      series.push({ sym: meta.symbol, w, pts: prices.map(p => p / base) });
    }

    if (series.length === 0) {
      if (_sparkCache && Date.now() - _sparkCache.ts < SPARK_CACHE_TTL) {
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        return res.status(200).json({ curve: _sparkCache.curve, assetsInSeries: _sparkCache.assetsInSeries, totalWeight: _sparkCache.totalWeight, cached: true });
      }
      return res.status(200).json({ curve: [], assetsInSeries: 0, totalWeight: 0, unavailable: true });
    }

    // Align all series to the shortest length (all should be ~168 points)
    const minLen = Math.min(...series.map(s => s.pts.length));
    const seriesWeight = series.reduce((s, a) => s + a.w, 0);

    // Assets with no sparkline data — use their 7d change distributed linearly
    const noSparkline  = Object.keys(PORTFOLIO_WEIGHTS).filter(sym => !series.find(s => s.sym === sym));
    const noSparkW     = noSparkline.reduce((s, sym) => s + (PORTFOLIO_WEIGHTS[sym] ?? 0), 0);
    const noSparkMap   = new Map<string, number>();
    for (const coin of marketsRes as any[]) {
      const meta = ASSET_REGISTRY.find(a => a.cgId === coin.id);
      if (meta && noSparkline.includes(meta.symbol)) {
        noSparkMap.set(meta.symbol, (coin.price_change_percentage_7d_in_currency ?? 0) / 100);
      }
    }
    const noSparkAvg7d = noSparkW > 0
      ? noSparkline.reduce((s, sym) => s + (PORTFOLIO_WEIGHTS[sym] ?? 0) * (noSparkMap.get(sym) ?? 0), 0) / noSparkW
      : 0;

    // Build weighted equity curve across minLen time points
    const now   = Date.now();
    const start = now - 7 * 24 * 3600_000;
    const step  = (7 * 24 * 3600_000) / (minLen - 1);

    const curve = Array.from({ length: minLen }, (_, i) => {
      const sparkContrib  = series.reduce((s, a) => s + a.w * a.pts[i], 0);
      const frac          = minLen > 1 ? i / (minLen - 1) : 1;
      const noSparkContrib= noSparkW * (1 + noSparkAvg7d * frac);
      const value         = 100 * (sparkContrib + noSparkContrib) / totalWeight;
      return { v: parseFloat(value.toFixed(4)), ts: new Date(start + i * step).toLocaleDateString() };
    });

    _sparkCache = { curve, assetsInSeries: series.length, totalWeight, ts: Date.now() };
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json({ curve, assetsInSeries: series.length, totalWeight });
  } catch (err: any) {
    console.error('Portfolio chart error:', err);
    res.status(500).json({ error: 'Failed to compute portfolio equity curve' });
  }
}
