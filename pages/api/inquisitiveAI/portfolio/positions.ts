import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS } from '../_brain';
import { getPrices } from '../_priceCache';
import { getOnchain, VAULT_ADDR } from '../_onchainCache';

// ── Live Vault Positions ───────────────────────────────────────────────────────
// Reads actual vault ETH balance on-chain, maps it across portfolio weights
// to show target allocations. These are the positions the vault holds / will
// hold after the next performUpkeep() call by the hybrid keeper.

export const config = { maxDuration: 20 };

// ETH-DIRECT assets: ERC-20 swaps via Uniswap V3 on Ethereum mainnet
const ETH_DIRECT_SYMBOLS = new Set([
  'BTC','ETH','USDC','AAVE','UNI','LINK','LDO','ARB','GRT','ENA','POL',
  'SKY','FET','RNDR','INJ','PAXG','ONDO','QNT','ZRO','CHZ','ACH','STRK',
  'HYPE','OP','DBR','XSGD','BRZ','JPYC','SOIL',
]);

// deBridge BRIDGE targets: Solana liquid-stake tokens go via deBridge DLN, not stETH
const BRIDGE_SYMBOLS = new Set([
  'SOL','JUP','JITOSOL','JUPSOL','mSOL','HONEY','HNT','PYTH',
  'BNB','CNGN','AVAX','TRX',
]);

// Execution mode per asset
function execMode(symbol: string, category: string): string {
  if (BRIDGE_SYMBOLS.has(symbol)) return 'BRIDGE';
  if (ETH_DIRECT_SYMBOLS.has(symbol)) return 'ETH-DIRECT';
  return 'stETH-YIELD';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [snap, priceResult] = await Promise.all([getOnchain(), getPrices()]);

    const ethBalance        = snap.vaultEth;
    const portfolioConfigured = snap.portfolioConfigured;
    const ethPrice          = priceResult.map.get('ETH')?.priceUsd ?? 2000;
    const vaultValueUSD = ethBalance * ethPrice;

    // Show positions whenever portfolio is configured (ETH funding affects execution, not display)
    const showPositions = portfolioConfigured;

    const weightSum  = Object.values(PORTFOLIO_WEIGHTS).reduce((s, w) => s + w, 0) || 100;

    const positions = showPositions
      ? ASSET_REGISTRY
          .filter(meta => (PORTFOLIO_WEIGHTS[meta.symbol] ?? 0) > 0)
          .map(meta => {
            const weight        = PORTFOLIO_WEIGHTS[meta.symbol] ?? 0;
            const allocationPct = weight / weightSum;
            const allocationUSD = allocationPct * vaultValueUSD;
            const allocationETH = allocationPct * ethBalance;
            return {
              symbol:        meta.symbol,
              name:          meta.name,
              category:      meta.category,
              weight,
              allocationPct: parseFloat((allocationPct * 100).toFixed(2)),
              allocationUSD: parseFloat(allocationUSD.toFixed(2)),
              allocationETH: parseFloat(allocationETH.toFixed(6)),
              mode:          execMode(meta.symbol, meta.category),
            };
          })
          .sort((a, b) => b.weight - a.weight)
      : [];

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({
      vaultAddress:       VAULT_ADDR,
      vaultEth:           parseFloat(ethBalance.toFixed(6)),
      vaultValueUSD:      parseFloat(vaultValueUSD.toFixed(2)),
      ethPrice,
      portfolioConfigured,
      positionCount:      positions.length,
      positions,
      status: !portfolioConfigured
        ? 'PENDING_SETUP — run scripts/activate.js to call setPortfolio() on the vault'
        : ethBalance === 0
          ? 'EMPTY — vault accepting deposits'
          : 'ACTIVE — vault funded and portfolio configured',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Positions error:', err);
    res.status(500).json({ error: 'Failed to fetch vault positions' });
  }
}
