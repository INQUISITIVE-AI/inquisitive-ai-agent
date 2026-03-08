import type { NextApiRequest, NextApiResponse } from 'next';

const NP_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NP_BASE    = 'https://api.nowpayments.io/v1';

const STATUS_MAP: Record<string, string> = {
  waiting:         'pending',
  confirming:      'pending',
  confirmed:       'confirmed',
  sending:         'confirmed',
  partially_paid:  'pending',
  finished:        'confirmed',
  failed:          'failed',
  refunded:        'failed',
  expired:         'expired',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id || !NP_API_KEY) return res.status(400).json({ error: 'Missing payment id or API key' });

  try {
    const resp = await fetch(`${NP_BASE}/payment/${id}`, {
      headers: { 'x-api-key': NP_API_KEY },
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || 'Failed to fetch payment');

    const raw = json.payment_status || 'waiting';
    return res.status(200).json({
      status:    STATUS_MAP[raw] || 'pending',
      rawStatus: raw,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
