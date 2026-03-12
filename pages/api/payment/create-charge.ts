import type { NextApiRequest, NextApiResponse } from 'next';

// ── Static institutional payment addresses ────────────────────────────────────
// No third-party payment processor required. Payments monitored via free public
// blockchain APIs: Blockstream.info (BTC) and Solana mainnet RPC (SOL).
// These addresses are the team wallets defined in wagmi.ts.
const BTC_ADDRESS = process.env.PAYMENT_BTC_ADDRESS || 'bc1q54tccqs2z3gp74pdatfnfucrzxuv2755fq6cfg';
const SOL_ADDRESS = process.env.PAYMENT_SOL_ADDRESS || '7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk';

// TTL: 30 minutes
const TTL_MS = 30 * 60 * 1000;

async function getLivePrice(coinId: string, fallback: number): Promise<number> {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!r.ok) return fallback;
    const d = await r.json();
    return d?.[coinId]?.usd ?? fallback;
  } catch { return fallback; }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { usdAmount, inqaiAmount, payToken, walletAddress } = req.body;
  if (!usdAmount || !payToken) return res.status(400).json({ error: 'Missing usdAmount or payToken' });

  const usd     = Number(usdAmount);
  const now     = Date.now();
  const orderId = `INQAI-${now}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const expiresAt = new Date(now + TTL_MS).toISOString();

  // Unique "dust" nonce: 1–99 units of smallest denomination
  // This makes each order's required amount unique so we can match it on-chain.
  const dustIndex = (now % 99) + 1;

  try {
    if (payToken === 'BTC') {
      const price  = await getLivePrice('bitcoin', 85000);
      const dust   = dustIndex * 0.00000001; // satoshis as BTC
      const amount = (usd / price + dust).toFixed(8);
      return res.status(200).json({
        chargeId:    orderId,
        address:     BTC_ADDRESS,
        amount,
        currency:    'BTC',
        expiresAt,
        orderId,
        checkParams: { since: now, expectedAmount: amount, currency: 'BTC' },
      });
    }

    if (payToken === 'SOL') {
      const price  = await getLivePrice('solana', 140);
      const dust   = dustIndex * 0.000000001; // lamports as SOL
      const amount = (usd / price + dust).toFixed(9);
      return res.status(200).json({
        chargeId:    orderId,
        address:     SOL_ADDRESS,
        amount,
        currency:    'SOL',
        expiresAt,
        orderId,
        checkParams: { since: now, expectedAmount: amount, currency: 'SOL' },
      });
    }

    return res.status(400).json({ error: `Unsupported payment token for manual flow: ${payToken}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create payment order' });
  }
}
