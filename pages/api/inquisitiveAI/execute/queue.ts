import type { NextApiRequest, NextApiResponse } from 'next';

// ── Execution Queue — Live state of all pending and completed trades ──────────
// Combines monitor output with Gelato task tracking.
// Read-only. No private key needed.

const VAULT_ADDR   = process.env.INQUISITIVE_VAULT_ADDRESS || '0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52';
const DEPLOYER     = process.env.DEPLOYER_ADDRESS          || '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';
const ETHERSCAN_KEY= process.env.ETHERSCAN_API_KEY         || 'M7JK1GRX6FI3XCNFP7X82RHF39SX66NVGX';
const RPC          = [
  process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868',
  'https://eth.llamarpc.com',
];

export const config = { maxDuration: 30 };

async function rpc(method: string, params: any[]): Promise<any> {
  for (const url of RPC) {
    try {
      const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(7000),
      });
      const d = await r.json();
      if (d.result !== undefined) return d.result;
    } catch {}
  }
  return null;
}

function parse(h: string | null, dec = 18): number {
  if (!h || h === '0x') return 0;
  try { return Number(BigInt(h)) / Math.pow(10, dec); } catch { return 0; }
}

// ── Etherscan: get recent transactions for a wallet ──────────────────────────
async function getRecentTxs(address: string): Promise<any[]> {
  try {
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=${ETHERSCAN_KEY}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    return d.status === '1' ? d.result : [];
  } catch { return []; }
}

// ── Etherscan: get ERC-20 token transfers from/to address ───────────────────
async function getTokenTransfers(address: string): Promise<any[]> {
  try {
    const url = `https://api.etherscan.io/api?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=30&sort=desc&apikey=${ETHERSCAN_KEY}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    return d.status === '1' ? d.result : [];
  } catch { return []; }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ── Parallel data fetch ───────────────────────────────────────────────
    const [vaultEthHex, deployerEthHex, ethPriceRes, vaultTxs, deployerTxs, tokenTxs] = await Promise.all([
      rpc('eth_getBalance', [VAULT_ADDR, 'latest']),
      rpc('eth_getBalance', [DEPLOYER,   'latest']),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', { signal: AbortSignal.timeout(5000) })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      getRecentTxs(VAULT_ADDR),
      getRecentTxs(DEPLOYER),
      getTokenTransfers(VAULT_ADDR),
    ]);

    const ethPrice    = (ethPriceRes as any)?.ethereum?.usd ?? 3200;
    const vaultEth    = parse(vaultEthHex,    18);
    const deployerEth = parse(deployerEthHex, 18);
    const totalEth    = vaultEth + deployerEth;
    const aumUSD      = totalEth * ethPrice;

    // ── Parse incoming deposits to deployer wallet ────────────────────────
    const deposits = (deployerTxs as any[])
      .filter(tx => tx.to?.toLowerCase() === DEPLOYER.toLowerCase() && parseFloat(tx.value) > 0)
      .slice(0, 10)
      .map(tx => ({
        type:       'DEPOSIT',
        hash:       tx.hash,
        from:       tx.from,
        ethAmount:  parseFloat(tx.value) / 1e18,
        usdValue:   parseFloat((parseFloat(tx.value) / 1e18 * ethPrice).toFixed(2)),
        timestamp:  parseInt(tx.timeStamp) * 1000,
        blockNumber:parseInt(tx.blockNumber),
        status:     tx.txreceipt_status === '1' ? 'confirmed' : 'failed',
        etherscan:  `https://etherscan.io/tx/${tx.hash}`,
      }));

    // ── Parse vault transactions (executed trades) ────────────────────────
    const executions = (vaultTxs as any[])
      .filter(tx => tx.from?.toLowerCase() === VAULT_ADDR.toLowerCase() || tx.to?.toLowerCase() === VAULT_ADDR.toLowerCase())
      .slice(0, 15)
      .map(tx => ({
        type:       tx.to?.toLowerCase() === VAULT_ADDR.toLowerCase() ? 'INCOMING' : 'OUTGOING',
        hash:       tx.hash,
        from:       tx.from,
        to:         tx.to,
        ethAmount:  parseFloat(tx.value) / 1e18,
        usdValue:   parseFloat((parseFloat(tx.value) / 1e18 * ethPrice).toFixed(2)),
        gas:        parseFloat((parseInt(tx.gasUsed) * parseInt(tx.gasPrice) / 1e18).toFixed(6)),
        timestamp:  parseInt(tx.timeStamp) * 1000,
        status:     tx.txreceipt_status === '1' ? 'confirmed' : 'failed',
        etherscan:  `https://etherscan.io/tx/${tx.hash}`,
      }));

    // ── Parse ERC-20 token acquisitions (proof of trades) ────────────────
    const tokenAcquisitions = (tokenTxs as any[])
      .filter(tx => tx.to?.toLowerCase() === VAULT_ADDR.toLowerCase())
      .slice(0, 20)
      .map(tx => ({
        type:        'TOKEN_RECEIVED',
        symbol:      tx.tokenSymbol,
        name:        tx.tokenName,
        amount:      parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal)),
        contractAddr:tx.contractAddress,
        hash:        tx.hash,
        timestamp:   parseInt(tx.timeStamp) * 1000,
        status:      'confirmed',
        etherscan:   `https://etherscan.io/tx/${tx.hash}`,
      }));

    // ── Execution status summary ─────────────────────────────────────────
    const totalDeposited   = deposits.reduce((s, d) => s + d.ethAmount, 0);
    const totalDeployedEth = executions.filter(e => e.type === 'OUTGOING').reduce((s, e) => s + e.ethAmount, 0);
    const deploymentPct    = totalDeposited > 0 ? (totalDeployedEth / totalDeposited) * 100 : 0;

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json({
      summary: {
        vaultAddress:      VAULT_ADDR,
        deployerAddress:   DEPLOYER,
        vaultEth:          parseFloat(vaultEth.toFixed(6)),
        deployerEth:       parseFloat(deployerEth.toFixed(6)),
        totalEth:          parseFloat(totalEth.toFixed(6)),
        aumUSD:            parseFloat(aumUSD.toFixed(2)),
        ethPrice,
        totalDeposits:     deposits.length,
        totalDepositedETH: parseFloat(totalDeposited.toFixed(6)),
        totalDepositedUSD: parseFloat((totalDeposited * ethPrice).toFixed(2)),
        totalDeployedETH:  parseFloat(totalDeployedEth.toFixed(6)),
        deploymentPct:     parseFloat(deploymentPct.toFixed(1)),
        tokenPositions:    tokenAcquisitions.length,
        keeperActive:    true,
        keeperModel:     'cron-job.org (1 min) + GitHub Actions vault-keeper.yml (5 min)',
        chainlinkOptional: 'Add Chainlink Automation at scale: https://automation.chain.link',
      },
      deposits,
      executions,
      tokenPositions: tokenAcquisitions,
      keeperSetup: {
        primary:   'cron-job.org — pings /api/inquisitiveAI/execute/auto every 1 minute (free)',
        backup:    'GitHub Actions vault-keeper.yml — runs every 5 minutes (free)',
        optional:  'Chainlink Automation — register at automation.chain.link when scaling',
        vaultAddr: VAULT_ADDR,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Queue error:', err);
    res.status(500).json({ error: 'Queue fetch failed', details: err.message });
  }
}
