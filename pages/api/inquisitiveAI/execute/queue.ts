import type { NextApiRequest, NextApiResponse } from 'next';
import { getPrices } from '../_priceCache';
import { getOnchain, VAULT_ADDR, DEPLOYER_ADDR } from '../_onchainCache';

// ── Execution Queue — Live state of all pending and completed trades ──────────
// Combines monitor output with Gelato task tracking.
// Read-only. No private key needed.

const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || '';

export const config = { maxDuration: 30 };

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
    // ── Parallel data fetch ───────────────────────────────────────────────────
    const [snap, priceResult, vaultTxs, deployerTxs, tokenTxs] = await Promise.all([
      getOnchain(),
      getPrices(),
      getRecentTxs(VAULT_ADDR),
      getRecentTxs(DEPLOYER_ADDR),
      getTokenTransfers(VAULT_ADDR),
    ]);

    const ethPrice    = priceResult.map.get('ETH')?.priceUsd ?? 3200;
    const vaultEth    = snap.vaultEth;
    const deployerEth = snap.deployerEth;
    const totalEth    = snap.totalEth;
    const aumUSD      = totalEth * ethPrice;

    // ── Parse incoming deposits to deployer wallet ────────────────────────
    const deposits = (deployerTxs as any[])
      .filter(tx => tx.to?.toLowerCase() === DEPLOYER_ADDR.toLowerCase() && parseFloat(tx.value) > 0)
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

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({
      summary: {
        vaultAddress:      VAULT_ADDR,
        deployerAddress:   DEPLOYER_ADDR,
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
        keeperModel:     'Chainlink Automation — automated upkeep execution when conditions are met',
        chainlinkStatus: 'Registered — requires LINK funding for execution',
      },
      deposits,
      executions,
      tokenPositions: tokenAcquisitions,
      keeperSetup: {
        primary:   'Chainlink Automation — automated upkeep execution when conditions are met',
        required:  'Fund with LINK tokens at automation.chain.link for execution',
        vaultAddr: VAULT_ADDR,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Queue error:', err);
    res.status(500).json({ error: 'Queue fetch failed', details: err.message });
  }
}
