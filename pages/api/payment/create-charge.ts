import type { NextApiRequest, NextApiResponse } from 'next';

const NP_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NP_BASE    = 'https://api.nowpayments.io/v1';

const CURRENCY_MAP: Record<string, string> = {
  BTC:  'btc',
  SOL:  'sol',
  ETH:  'eth',
  USDC: 'usdcerc20',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { usdAmount, inqaiAmount, payToken, walletAddress } = req.body;

  if (!NP_API_KEY) {
    return res.status(503).json({ error: 'NOWPAYMENTS_API_KEY not configured' });
  }
  if (!usdAmount || !payToken) {
    return res.status(400).json({ error: 'Missing usdAmount or payToken' });
  }

  const payCurrency = CURRENCY_MAP[payToken] || payToken.toLowerCase();
  const orderId     = `INQAI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  try {
    const resp = await fetch(`${NP_BASE}/payment`, {
      method: 'POST',
      headers: {
        'x-api-key':    NP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount:       Number(usdAmount),
        price_currency:     'usd',
        pay_currency:       payCurrency,
        order_id:           orderId,
        order_description:  `${inqaiAmount} INQAI tokens — wallet: ${walletAddress || 'not provided'}`,
        ipn_callback_url:   'https://getinqai.com/api/payment/webhook',
      }),
    });

    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.message || 'NOWPayments API error');

    return res.status(200).json({
      chargeId:  String(json.payment_id),
      address:   json.pay_address,
      amount:    String(json.pay_amount),
      currency:  json.pay_currency?.toUpperCase() || payToken,
      expiresAt: json.expiration_estimate_date || null,
      orderId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create payment' });
  }
}
