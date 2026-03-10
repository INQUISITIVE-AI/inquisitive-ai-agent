import type { NextApiRequest, NextApiResponse } from 'next';

// ── On-Chain Treasury Reader ─────────────────────────────────────────────────
// Reads real Ethereum mainnet state via Infura RPC.
// No private key required — read-only public calls only.

const RPC_URLS = [
  process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
];

const VAULT_ADDRESS    = process.env.INQUISITIVE_VAULT_ADDRESS    || '0x506F72eABc90793ae8aC788E650bC9407ED853Fa';
const INQAI_ADDRESS    = process.env.INQAI_TOKEN_ADDRESS           || '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5';
const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS              || '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';
const USDC_ADDRESS     = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// ERC-20 function selectors
const SEL_TOTAL_SUPPLY = '0x18160ddd';
const SEL_BALANCE_OF   = '0x70a08231';

export const config = { maxDuration: 30 };

// ── RPC helper with fallback ──────────────────────────────────────────────────
async function rpc(method: string, params: any[]): Promise<any> {
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const d = await res.json();
      if (d.result !== undefined && d.result !== null) return d.result;
    } catch {}
  }
  return null;
}

// ── eth_call helper ───────────────────────────────────────────────────────────
async function call(to: string, data: string): Promise<string | null> {
  return rpc('eth_call', [{ to, data }, 'latest']);
}

// ── Encode balanceOf(address) ─────────────────────────────────────────────────
function encodeBalanceOf(addr: string): string {
  return SEL_BALANCE_OF + addr.toLowerCase().replace('0x', '').padStart(64, '0');
}

// ── Parse uint256 hex result ──────────────────────────────────────────────────
function parseUint(hex: string | null, decimals = 18): number {
  if (!hex || hex === '0x') return 0;
  try {
    const bn = BigInt(hex);
    return Number(bn) / Math.pow(10, decimals);
  } catch { return 0; }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ── Parallel on-chain reads ─────────────────────────────────────────────
    const [
      vaultEthHex,
      deployerEthHex,
      totalSupplyHex,
      deployerInqaiHex,
      vaultInqaiHex,
      deployerUsdcHex,
      vaultUsdcHex,
      ethPriceRes,
    ] = await Promise.all([
      rpc('eth_getBalance', [VAULT_ADDRESS,    'latest']),
      rpc('eth_getBalance', [DEPLOYER_ADDRESS, 'latest']),
      call(INQAI_ADDRESS, SEL_TOTAL_SUPPLY),
      call(INQAI_ADDRESS, encodeBalanceOf(DEPLOYER_ADDRESS)),
      call(INQAI_ADDRESS, encodeBalanceOf(VAULT_ADDRESS)),
      call(USDC_ADDRESS,  encodeBalanceOf(DEPLOYER_ADDRESS)),
      call(USDC_ADDRESS,  encodeBalanceOf(VAULT_ADDRESS)),
      // ETH price from CoinGecko
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', { signal: AbortSignal.timeout(5000) })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    const ethPrice        = (ethPriceRes as any)?.ethereum?.usd ?? 3200;

    // ── Parse values ────────────────────────────────────────────────────────
    const vaultEth        = parseUint(vaultEthHex,    18);
    const deployerEth     = parseUint(deployerEthHex, 18);
    const totalEth        = vaultEth + deployerEth;

    const totalSupply     = parseUint(totalSupplyHex, 18);     // 100M
    const deployerInqai   = parseUint(deployerInqaiHex, 18);   // unsold / undistributed
    const vaultInqai      = parseUint(vaultInqaiHex,   18);    // held in vault

    const deployerUsdc    = parseUint(deployerUsdcHex, 6);
    const vaultUsdc       = parseUint(vaultUsdcHex,   6);
    const totalUsdc       = deployerUsdc + vaultUsdc;

    // Tokens sold / distributed to buyers = totalSupply - deployer holdings
    const tokensSold      = Math.max(0, totalSupply - deployerInqai);
    const circulatingSupply = tokensSold;  // tokens that have left the deployer

    // ── AUM calculation ──────────────────────────────────────────────────────
    // AUM = all ETH controlled by the team (vault + deployer) × ETH price + USDC
    const aumETH          = totalEth * ethPrice;
    const aumUSD          = aumETH + totalUsdc;

    // ── NAV per token ────────────────────────────────────────────────────────
    // If tokens have been sold: NAV = AUM / tokens_sold
    // If no tokens sold yet: NAV = presale price ($8)
    const PRESALE_PRICE   = 8;
    const navPerToken     = circulatingSupply > 0
      ? aumUSD / circulatingSupply
      : PRESALE_PRICE;

    // ── Deployment info ──────────────────────────────────────────────────────
    const deploymentBlock = parseInt(process.env.DEPLOYMENT_BLOCK || '21993900');

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json({
      onChain: true,
      network: 'mainnet',
      contracts: {
        inqai:    INQAI_ADDRESS,
        vault:    VAULT_ADDRESS,
        deployer: DEPLOYER_ADDRESS,
        deploymentBlock,
      },
      balances: {
        vaultEth,
        deployerEth,
        totalEth,
        vaultUsdc,
        deployerUsdc,
        totalUsdc,
        ethPrice,
      },
      tokens: {
        totalSupply,
        deployerBalance:    deployerInqai,
        vaultBalance:       vaultInqai,
        circulatingSupply,
        tokensSold,
      },
      aum: {
        ethUSD:     parseFloat(aumETH.toFixed(2)),
        usdcUSD:    parseFloat(totalUsdc.toFixed(2)),
        totalUSD:   parseFloat(aumUSD.toFixed(2)),
      },
      nav: {
        perToken:      parseFloat(navPerToken.toFixed(6)),
        presalePrice:  PRESALE_PRICE,
        targetPrice:   15,
        premiumPct:    parseFloat(((navPerToken / PRESALE_PRICE - 1) * 100).toFixed(4)),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Treasury error:', err);
    res.status(500).json({ error: 'Failed to read on-chain treasury' });
  }
}
