import type { NextApiRequest, NextApiResponse } from 'next';

const BTC_ADDRESS = process.env.PAYMENT_BTC_ADDRESS || 'bc1q54tccqs2z3gp74pdatfnfucrzxuv2755fq6cfg';
const SOL_ADDRESS = process.env.PAYMENT_SOL_ADDRESS || '7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk';
const TRX_ADDRESS = process.env.PAYMENT_TRX_ADDRESS || 'TDSkgbhuMAHChDw6kGCLJmM9v7PPMJgHJA';

// Multiple Solana RPC endpoints — tried in order until one responds
const SOL_RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://rpc.ankr.com/solana',
  process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=1d8740dc-e5f4-421c-b823-e1bad1889eff',
];

// Multiple BTC explorer endpoints — tried in order
const BTC_EXPLORERS = [
  `https://blockstream.info/api/address/${BTC_ADDRESS}/txs`,
  `https://mempool.space/api/address/${BTC_ADDRESS}/txs`,
];

// ── BTC: Blockstream.info / mempool.space ─────────────────────────────────────
async function checkBtc(
  expectedAmount: string,
  since: number
): Promise<'confirmed' | 'pending' | 'not_found'> {
  const expectedSats = Math.round(parseFloat(expectedAmount) * 1e8);
  // Dust nonce is 1-99 satoshis — tolerance covers full range plus broadcast rounding
  const tolerance    = 100;

  for (const url of BTC_EXPLORERS) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) continue;
      const txs: any[] = await r.json();

      for (const tx of txs) {
        const blockTime = (tx.status?.block_time || 0) * 1000;
        if (blockTime > 0 && blockTime < since) continue;

        for (const vout of (tx.vout || [])) {
          if (vout.scriptpubkey_address !== BTC_ADDRESS) continue;
          const sats = vout.value || 0;
          if (Math.abs(sats - expectedSats) <= tolerance) {
            return tx.status?.confirmed ? 'confirmed' : 'pending';
          }
        }
      }
      return 'not_found'; // explorer responded — stop trying fallbacks
    } catch { continue; }
  }
  return 'not_found';
}

// ── SOL: Solana RPC with multi-endpoint fallback ──────────────────────────────
async function solRpc(method: string, params: any[]): Promise<any> {
  for (const url of SOL_RPCS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) continue;
      const d = await r.json();
      if (d?.result !== undefined && d?.result !== null) return d.result;
    } catch { continue; }
  }
  return null;
}

// Flatten accountKeys from both static and v0 address lookup table entries
function flattenAccountKeys(message: any): string[] {
  const static_keys: string[] = message?.accountKeys ?? [];
  // v0 transactions: loadedAddresses contains writable + readonly from lookup tables
  const loaded = message?.loadedAddresses;
  if (!loaded) return static_keys;
  return [
    ...static_keys,
    ...(loaded.writable ?? []),
    ...(loaded.readonly  ?? []),
  ];
}

async function checkSol(
  expectedAmount: string,
  since: number
): Promise<'confirmed' | 'pending' | 'not_found'> {
  try {
    const sigs: any[] = await solRpc('getSignaturesForAddress', [SOL_ADDRESS, { limit: 30 }]) || [];
    const expectedLamports = Math.round(parseFloat(expectedAmount) * 1e9);
    const tolerance        = 2000; // ±2000 lamports (~$0.0003) covers rounding

    for (const sig of sigs) {
      const blockTime = (sig.blockTime || 0) * 1000;
      if (blockTime > 0 && blockTime < since) continue;
      if (sig.err) continue;

      const tx = await solRpc('getTransaction', [
        sig.signature,
        { encoding: 'json', maxSupportedTransactionVersion: 0 },
      ]);
      if (!tx) continue;

      // Support both legacy and v0 (address lookup table) transactions
      const message  = tx.transaction?.message ?? {};
      const accounts = flattenAccountKeys(message);
      const idx      = accounts.indexOf(SOL_ADDRESS);
      if (idx < 0) continue;

      const pre      = (tx.meta?.preBalances  ?? [])[idx] ?? 0;
      const post     = (tx.meta?.postBalances ?? [])[idx] ?? 0;
      const received = post - pre;

      if (received > 0 && Math.abs(received - expectedLamports) <= tolerance) {
        return sig.confirmationStatus === 'finalized' ? 'confirmed' : 'pending';
      }
    }
    return 'not_found';
  } catch { return 'not_found'; }
}

// ── TRX: TRONGrid + Tronscan fallback ─────────────────────────────────────────
async function checkTrx(
  expectedAmount: string,
  since: number
): Promise<'confirmed' | 'pending' | 'not_found'> {
  const expectedSun = Math.round(parseFloat(expectedAmount) * 1_000_000);
  const tolerance   = 10; // 10 SUN tolerance
  try {
    const url = `https://api.trongrid.io/v1/accounts/${TRX_ADDRESS}/transactions` +
      `?limit=40&only_confirmed=false&order_by=block_timestamp,desc`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error('TRONGrid unavailable');
    const data = await r.json();
    const txs: any[] = data?.data ?? [];
    for (const tx of txs) {
      const blockTime = tx.block_timestamp || 0;
      if (blockTime > 0 && blockTime < since) continue;
      for (const c of (tx?.raw_data?.contract ?? [])) {
        if (c.type !== 'TransferContract') continue;
        const amountSun = c?.parameter?.value?.amount ?? 0;
        if (Math.abs(amountSun - expectedSun) <= tolerance) {
          const ret = tx?.ret?.[0]?.contractRet;
          return ret === 'SUCCESS' ? 'confirmed' : 'pending';
        }
      }
    }
    return 'not_found';
  } catch {
    try {
      const url2 = `https://apilist.tronscan.org/api/transaction?address=${TRX_ADDRESS}&start=0&limit=40&sort=-timestamp`;
      const r2 = await fetch(url2, { signal: AbortSignal.timeout(10000) });
      if (!r2.ok) return 'not_found';
      const d2 = await r2.json();
      for (const tx2 of (d2?.data ?? [])) {
        const blockTime = tx2.timestamp || 0;
        if (blockTime > 0 && blockTime < since) continue;
        const amountSun = tx2.contractData?.amount ?? 0;
        if (Math.abs(amountSun - expectedSun) <= tolerance) {
          return tx2.confirmed ? 'confirmed' : 'pending';
        }
      }
      return 'not_found';
    } catch { return 'not_found'; }
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, currency, amount, since } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing payment id' });

  // If caller didn't pass check params yet, return pending
  if (!currency || !amount || !since) {
    return res.status(200).json({ status: 'pending', rawStatus: 'waiting' });
  }

  const sinceMs = parseInt(since as string) || 0;
  const cur     = (currency as string).toUpperCase();

  let raw: 'confirmed' | 'pending' | 'not_found' = 'not_found';

  if (cur === 'BTC') {
    raw = await checkBtc(amount as string, sinceMs);
  } else if (cur === 'SOL') {
    raw = await checkSol(amount as string, sinceMs);
  } else if (cur === 'TRX') {
    raw = await checkTrx(amount as string, sinceMs);
  } else {
    return res.status(400).json({ error: `Unsupported currency: ${cur}` });
  }

  const status = raw === 'confirmed' ? 'confirmed' : 'pending';
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ status, rawStatus: raw });
}
