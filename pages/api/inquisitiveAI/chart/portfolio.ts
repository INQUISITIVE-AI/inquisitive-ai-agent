import type { NextApiRequest, NextApiResponse } from 'next';

// Top 3 assets by portfolio weight (BTC 18% + ETH 12% + SOL 8% = 38%)
// Remaining 62% approximated as correlated to BTC/ETH broad market movement
const TOP3 = [
  { id: 'bitcoin',  w: 18 },
  { id: 'ethereum', w: 12 },
  { id: 'solana',   w:  8 },
];
const TOTAL_W   = TOP3.reduce((s, a) => s + a.w, 0);    // 38
const OTHER_W   = 100 - TOTAL_W;                         // 62
const BASE_NAV  = 100;                                   // index starts at $100

export const config = { maxDuration: 30 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Fetch 7-day daily prices for BTC, ETH, SOL in parallel from CoinGecko
    const fetches = await Promise.allSettled(
      TOP3.map(a =>
        fetch(
          `https://api.coingecko.com/api/v3/coins/${a.id}/market_chart?vs_currency=usd&days=7&interval=daily`,
          { signal: AbortSignal.timeout(10000) },
        ).then(r => r.ok ? r.json() : null),
      ),
    );

    // Extract price arrays [[timestamp_ms, price], ...]
    const series = fetches.map((r): [number, number][] | null =>
      r.status === 'fulfilled' && r.value?.prices?.length ? r.value.prices : null,
    );

    const validSeries = series.filter((s): s is [number, number][] => s !== null);
    if (validSeries.length === 0) return res.status(200).json({ curve: [] });

    const minLen = Math.min(...validSeries.map(s => s.length));
    if (minLen < 2) return res.status(200).json({ curve: [] });

    // Normalize: norm[i] = price[i] / price[0]
    const normed = series.map(s => {
      if (!s || s.length < minLen) return null;
      const base = s[0][1] || 1;
      return s.slice(0, minLen).map(([ts, p]) => ({ ts, n: p / base }));
    });

    // Build equity curve
    const refTs = (normed.find(s => s !== null) as any[]).map((pt: any) => pt.ts);
    const curve = refTs.map((ts, i) => {
      let weighted = 0;
      let wUsed    = 0;
      TOP3.forEach((asset, j) => {
        const row = normed[j];
        if (row) { weighted += asset.w * row[i].n; wUsed += asset.w; }
      });
      // Approximate remaining 62% as market average of available top assets
      const avgNorm = wUsed > 0 ? weighted / wUsed : 1;
      weighted += OTHER_W * avgNorm;
      const value = BASE_NAV * (weighted / 100);
      return { v: parseFloat(value.toFixed(4)), ts: new Date(ts).toLocaleDateString() };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({ curve });
  } catch (err: any) {
    console.error('Portfolio chart error:', err);
    res.status(500).json({ error: 'Failed to compute portfolio equity curve' });
  }
}
