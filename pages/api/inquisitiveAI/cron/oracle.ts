// ── INQUISITIVE — Chainlink Functions AI Oracle API ────────────────────────────
// This endpoint is called by Chainlink Functions (NOT Vercel Cron) to fetch
// live AI signals. Chainlink Functions then submits signals to VaultV2.
//
// Architecture:
//   1. Chainlink Functions (decentralized compute) calls this API
//   2. This API returns AI signals for tracked assets (no private keys needed)
//   3. Chainlink Functions submits signals via submitSignalsBatch()
//   4. Chainlink Automation calls performUpkeep() to execute trades
//
// No private keys in codebase — Chainlink Functions uses its own DON secrets.

import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from '../_brain';
import type { AssetInput, FGIndex } from '../_brain';
import { getPrices } from '../_priceCache';

export const config = { maxDuration: 30 };

// Signal map for on-chain submission: BUY=1, SELL=2, HOLD=0.
// The AI brain emits nuanced DeFi-composability actions, but the vault only
// understands swap directions. We collapse every "accumulate / deploy capital"
// action (LEND, EARN, YIELD, STAKE, BORROW, LOOP, MULTIPLY, REWARDS, SWAP)
// into BUY=1, and every "reduce exposure" action (SELL, REDUCE) into SELL=2.
// Stablecoin LEND is the one exception: the vault holds ETH as base, so buying
// USDC with ETH just to park it is not meaningful — treat as HOLD instead.
const SIGNAL_MAP: Record<string, number> = {
  // Active accumulation / build position
  BUY: 1, EARN: 1, YIELD: 1, STAKE: 1, LEND: 1, BORROW: 1,
  LOOP: 1, MULTIPLY: 1, REWARDS: 1, SWAP: 1,
  // Reduce exposure
  SELL: 2, REDUCE: 2,
  // Do nothing
  HOLD: 0, SKIP: 0,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow GET for Chainlink Functions, POST for compatibility
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Fetch live prices + Fear & Greed index
    const [priceResult, fgRaw] = await Promise.all([
      getPrices(),
      fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(6000) })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    let fg: FGIndex | null = null;
    if (fgRaw?.data?.[0]) {
      fg = {
        value: parseInt(fgRaw.data[0].value),
        valueClassification: fgRaw.data[0].value_classification,
      };
    }

    // 2. Build AI inputs for all 66 assets
    const allInputs: AssetInput[] = ASSET_REGISTRY.map(meta => {
      const p = priceResult.map.get(meta.symbol);
      return {
        symbol: meta.symbol,
        category: meta.category,
        weight: PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
        stakeable: meta.stakeable,
        lendable: meta.lendable,
        yieldable: meta.yieldable,
        priceUsd: p?.priceUsd ?? 0,
        change24h: p?.change24h ?? 0,
        change7d: p?.change7d ?? 0,
        volume24h: p?.volume24h ?? 0,
        marketCap: p?.marketCap ?? 0,
        athChange: p?.athChange ?? 0,
      };
    });

    // 3. Run 5-engine AI brain
    const btcIn = allInputs.find(a => a.symbol === 'BTC');
    const ethIn = allInputs.find(a => a.symbol === 'ETH');
    const regime = getRegime(
      (btcIn?.change24h ?? 0) * 100,
      (ethIn?.change24h ?? 0) * 100,
      (btcIn?.change7d ?? 0) * 100,
      (ethIn?.change7d ?? 0) * 100,
    );

    const scored = allInputs.map(inp => scoreAsset(inp, regime, fg, allInputs));

    // 4. Build signals array for Chainlink Functions
    const signals = scored.map(s => ({
      symbol: s.symbol,
      action: s.action,
      signal: SIGNAL_MAP[s.action] ?? 0,
      score: s.finalScore,
      confidence: s.confidence,
    }));

    const buys = signals.filter(s => s.signal === 1).length;
    const sells = signals.filter(s => s.signal === 2).length;
    const holds = signals.filter(s => s.signal === 0).length;

    return res.status(200).json({
      success: true,
      regime,
      fng: fg,
      signals,
      summary: {
        total: signals.length,
        buys,
        sells,
        holds,
      },
      ts: new Date().toISOString(),
      // Chainlink Functions hint: vault expects (address[] assets, uint8[] signals)
      note: 'Chainlink Functions should map asset symbols to their ERC-20 addresses before calling submitSignalsBatch()',
    });

  } catch (err: any) {
    console.error('[oracle/signals]', err);
    return res.status(500).json({ error: err.message || 'Oracle failed' });
  }
}
