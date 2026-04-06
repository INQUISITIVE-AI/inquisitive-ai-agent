import type { NextApiRequest, NextApiResponse } from 'next';

const BTC_ADDRESS = process.env.PAYMENT_BTC_ADDRESS || 'bc1q54tccqs2z3gp74pdatfnfucrzxuv2755fq6cfg';
const SOL_ADDRESS = process.env.PAYMENT_SOL_ADDRESS || '7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk';
const TRX_ADDRESS = process.env.PAYMENT_TRX_ADDRESS || 'TDSkgbhuMAHChDw6kGCLJmM9v7PPMJgHJA';

// TTL: 30 minutes
const TTL_MS = 30 * 60 * 1000;

// Simple in-memory rate limiter (per IP) - 5 requests per minute
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    // New window or expired window
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  entry.count++;
  return { allowed: true };
}

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

  // Rate limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                   (req.headers['x-real-ip'] as string) || 
                   'unknown';
  
  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', rateCheck.retryAfter?.toString() || '60');
    return res.status(429).json({ 
      error: 'Rate limit exceeded', 
      message: `Too many requests. Please try again in ${rateCheck.retryAfter} seconds.` 
    });
  }

  const { usdAmount, inqaiAmount, payToken, walletAddress } = req.body;
  if (!usdAmount || !payToken) return res.status(400).json({ error: 'Missing usdAmount or payToken' });

  const usd = Number(usdAmount);
  if (!usd || usd < 10 || usd > 500_000) return res.status(400).json({ error: 'Amount must be between $10 and $500,000' });
  if (!['BTC','SOL','TRX'].includes(payToken)) return res.status(400).json({ error: `Unsupported payment token: ${payToken}` });

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

    if (payToken === 'TRX') {
      const price  = await getLivePrice('tron', 0.25);
      const dust   = dustIndex * 0.000001; // 1 SUN = 0.000001 TRX
      const amount = (usd / price + dust).toFixed(6);
      return res.status(200).json({
        chargeId:    orderId,
        address:     TRX_ADDRESS,
        amount,
        currency:    'TRX',
        expiresAt,
        orderId,
        checkParams: { since: now, expectedAmount: amount, currency: 'TRX' },
      });
    }

    return res.status(400).json({ error: `Unsupported payment token: ${payToken}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create payment order' });
  }
}
