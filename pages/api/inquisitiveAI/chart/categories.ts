import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS } from '../_brain';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const totals: Record<string, number> = {};
    const assetList: { symbol: string; category: string; weight: number }[] = [];

    for (const asset of ASSET_REGISTRY) {
      const w = PORTFOLIO_WEIGHTS[asset.symbol] ?? 0;
      if (w === 0) continue;
      totals[asset.category] = (totals[asset.category] || 0) + w;
      assetList.push({ symbol: asset.symbol, category: asset.category, weight: w });
    }

    const total = Object.values(totals).reduce((s, v) => s + v, 0) || 1;
    const categories = Object.entries(totals)
      .map(([category, w]) => ({
        category,
        weight:  parseFloat(w.toFixed(4)),
        pct:     parseFloat(((w / total) * 100).toFixed(2)),
        assets:  assetList.filter(a => a.category === category).map(a => a.symbol),
      }))
      .sort((a, b) => b.weight - a.weight);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.status(200).json({ categories, totalWeight: total, assetCount: assetList.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute categories' });
  }
}
