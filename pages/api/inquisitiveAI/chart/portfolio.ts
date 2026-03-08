import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Return empty chart data until real deposits exist
    const mockData = {
      curve: []
    };

    res.status(200).json(mockData);
  } catch (err: any) {
    console.error('Portfolio chart API error:', err);
    res.status(500).json({ error: 'Failed to fetch portfolio chart data' });
  }
}
