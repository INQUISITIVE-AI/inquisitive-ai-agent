import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS } from '../_brain';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const totals: Record<string, number> = {};
    for (const meta of ASSET_REGISTRY) {
      const w = PORTFOLIO_WEIGHTS[meta.symbol] ?? 0;
      totals[meta.category] = (totals[meta.category] || 0) + w;
    }
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    const categories = Object.entries(totals)
      .map(([category, w]) => ({ category, mktCap: w, pct: +((w / total) * 100).toFixed(2) }))
      .sort((a, b) => b.mktCap - a.mktCap);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.status(200).json({ categories });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute categories' });
  }
}
