import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS } from '../_brain';

// ── Live Vault Positions ───────────────────────────────────────────────────────
// Reads actual vault ETH balance on-chain, maps it across portfolio weights
// to show target allocations. These are the positions the vault holds / will
// hold after the next performUpkeep() call by the hybrid keeper.

const VAULT_ADDRESS = process.env.INQUISITIVE_VAULT_ADDRESS || '0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52';

const RPC_URLS = [
  process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
];

// Vault function selector — getPortfolioLength()
const SEL_PORTFOLIO_LEN = '0xf880b0ff';

export const config = { maxDuration: 20 };

async function rpcPost(url: string, body: object): Promise<any> {
  const r = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(5000),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d.result ?? null;
}

async function getVaultState(): Promise<{ ethBalance: number; portfolioConfigured: boolean }> {
  for (const url of RPC_URLS) {
    try {
      const [balHex, lenHex] = await Promise.all([
        rpcPost(url, { jsonrpc:'2.0', id:1, method:'eth_getBalance',  params:[VAULT_ADDRESS,'latest'] }),
        rpcPost(url, { jsonrpc:'2.0', id:2, method:'eth_call', params:[{ to: VAULT_ADDRESS, data: SEL_PORTFOLIO_LEN }, 'latest'] }),
      ]);
      const ethBalance        = balHex && balHex !== '0x0' ? Number(BigInt(balHex)) / 1e18 : 0;
      const portfolioLength   = lenHex && lenHex !== '0x' ? parseInt(lenHex, 16) : 0;
      const portfolioConfigured = portfolioLength > 0;
      return { ethBalance, portfolioConfigured };
    } catch {}
  }
  return { ethBalance: 0, portfolioConfigured: false };
}

// ETH-DIRECT assets: ERC-20 swaps via Uniswap V3 on Ethereum mainnet
const ETH_DIRECT_SYMBOLS = new Set([
  'AAVE','UNI','LINK','LDO','ARB','GRT','ENA','POL','SKY','FET','RNDR',
  'INJ','PAXG','ONDO','QNT','ZRO','CHZ','ACH','STRK','HYPE','OP',
]);

// Execution mode per asset
function execMode(symbol: string, category: string): string {
  if (category === 'liquid-stake') return 'stETH-YIELD';
  if (symbol === 'ETH' || symbol === 'BTC' || symbol === 'USDC') return 'ETH-DIRECT';
  if (ETH_DIRECT_SYMBOLS.has(symbol)) return 'ETH-DIRECT';
  return 'BRIDGE';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [vaultState, ethPriceRes] = await Promise.all([
      getVaultState(),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', { signal: AbortSignal.timeout(5000) })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    const { ethBalance, portfolioConfigured } = vaultState;
    const ethPrice      = (ethPriceRes as any)?.ethereum?.usd ?? 2000;
    const vaultValueUSD = ethBalance * ethPrice;

    // Only show positions when vault is funded and portfolio is configured
    const showPositions = ethBalance >= 0.005 && portfolioConfigured;

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

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json({
      vaultAddress:       VAULT_ADDRESS,
      vaultEth:           parseFloat(ethBalance.toFixed(6)),
      vaultValueUSD:      parseFloat(vaultValueUSD.toFixed(2)),
      ethPrice,
      portfolioConfigured,
      positionCount:      positions.length,
      positions,
      status: !portfolioConfigured
        ? 'PENDING_SETUP — run scripts/activate.js to call setPortfolio() on the vault'
        : ethBalance < 0.005
          ? 'PENDING_FUNDING — deposit ETH to vault to activate deployment'
          : 'ACTIVE — vault funded and portfolio configured',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Positions error:', err);
    res.status(500).json({ error: 'Failed to fetch vault positions' });
  }
}
