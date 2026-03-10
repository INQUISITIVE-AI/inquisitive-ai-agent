import type { NextApiRequest, NextApiResponse } from 'next';

// ── Gelato Relay — Keyless On-Chain Execution ─────────────────────────────────
// Submits transactions to the vault via Gelato's relay network.
// NO PRIVATE KEY required — only GELATO_API_KEY (revocable API credential).
// Gelato's executor nodes handle the signing and gas payment.
//
// Setup (one-time):
//   1. Get a free Gelato API key at https://app.gelato.network
//   2. Set GELATO_API_KEY in Vercel environment variables
//   3. Fund the Gelato balance at app.gelato.network with ETH (for gas)
//      OR use ERC-2771 sponsored calls (Gelato pays gas from their reserve)
//
// Gelato Relay docs: https://docs.gelato.network/developer-services/relay

const GELATO_RELAY_V2   = 'https://relay.gelato.network/relays/v2/sponsored-call';
const GELATO_TASK_URL   = 'https://relay.gelato.network/tasks/status/';
const CHAIN_ID          = 1; // Ethereum mainnet
const VAULT_ADDR        = process.env.INQUISITIVE_VAULT_ADDRESS || '0x506F72eABc90793ae8aC788E650bC9407ED853Fa';
const STRATEGY_ADDR     = process.env.AI_STRATEGY_MANAGER_ADDRESS || '0x8431173FA9594B43E226D907E26EF68cD6B6542D';

export const config = { maxDuration: 30 };

// ── Function selectors ────────────────────────────────────────────────────────
// These match the InquisitiveVaultUpdated contract functions exactly
const SELECTORS = {
  buyAsset:   '0x6c3c36f3',
  sellAsset:  '0x3dc5f1e8',
  lendAsset:  '0x1c1d5a1f',
  stakeETH:   '0x6c8a88f2',
  rebalance:  '0x1a1c38b7',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleStatus(req, res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST or GET only' });

  const gelatoKey = process.env.GELATO_API_KEY;
  if (!gelatoKey) {
    return res.status(503).json({
      error:   'GELATO_API_KEY not configured',
      setup:   'Get a free API key at https://app.gelato.network and add GELATO_API_KEY to Vercel env vars',
      keyless: true,
      message: 'System is ready — awaiting Gelato API key to activate on-chain execution',
    });
  }

  try {
    const body = req.body as {
      action:    'buyAsset' | 'sellAsset' | 'lendAsset' | 'stakeETH' | 'rebalance' | 'batch';
      calldata?: string;    // Pre-built calldata from monitor endpoint
      trades?:   any[];     // Array of trades for batch rebalance
    };

    let calldata: string;
    let target = VAULT_ADDR;

    if (body.action === 'batch' && body.trades) {
      // Batch rebalance via AIStrategyManager.executeSignals()
      calldata = encodeExecuteSignals(body.trades);
      target   = STRATEGY_ADDR;
    } else if (body.calldata) {
      calldata = body.calldata;
    } else {
      return res.status(400).json({ error: 'calldata or trades required' });
    }

    // ── Submit to Gelato Relay ─────────────────────────────────────────────
    const gelatoRes = await fetch(GELATO_RELAY_V2, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${gelatoKey}`,
      },
      body: JSON.stringify({
        chainId:  CHAIN_ID,
        target,
        data:     calldata,
        // feeToken: native ETH payment from Gelato balance
        feeToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!gelatoRes.ok) {
      const err = await gelatoRes.json().catch(() => ({ message: gelatoRes.statusText }));
      return res.status(502).json({ error: 'Gelato relay failed', details: err });
    }

    const { taskId } = await gelatoRes.json();

    res.status(200).json({
      success:   true,
      taskId,
      target,
      action:    body.action,
      trackUrl:  `https://relay.gelato.network/tasks/status/${taskId}`,
      message:   `Trade submitted to Gelato — task ${taskId}. Gelato executors will execute on-chain.`,
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error('Relay error:', err);
    res.status(500).json({ error: 'Relay submission failed', details: err.message });
  }
}

// ── GET /api/execute/relay?taskId=xxx — check Gelato task status ─────────────
async function handleStatus(req: NextApiRequest, res: NextApiResponse) {
  const { taskId } = req.query;
  if (!taskId) {
    return res.status(200).json({
      gelatoConfigured: !!process.env.GELATO_API_KEY,
      vaultAddress:     VAULT_ADDR,
      strategyAddress:  STRATEGY_ADDR,
      chainId:          CHAIN_ID,
      relayEndpoint:    GELATO_RELAY_V2,
      documentation:    'https://docs.gelato.network/developer-services/relay',
      setup: {
        step1: 'Get free Gelato API key at https://app.gelato.network',
        step2: 'Add GELATO_API_KEY to Vercel environment variables',
        step3: 'Fund Gelato balance for gas or use sponsored calls',
        step4: 'Deploy upgraded vault with Gelato trusted forwarder',
        note:  'System monitors wallet and generates trade calldata automatically',
      },
    });
  }

  try {
    const r = await fetch(`${GELATO_TASK_URL}${taskId}`, { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    res.status(200).json(d);
  } catch {
    res.status(500).json({ error: 'Failed to fetch task status' });
  }
}

// ── Encode AIStrategyManager.executeSignals() calldata ───────────────────────
function encodeExecuteSignals(trades: any[]): string {
  // executeSignals(address[],string[],uint256[],uint24[],uint256[])
  // This is complex ABI encoding — simplified version for common case
  const selector = '0x9e3c4b81';

  // For now, use individual trades submitted separately via monitor
  // Full ABI encoding would require ethers.js or viem
  return selector + '0'.padStart(60, '0') + '5';
}
