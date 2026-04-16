import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────
// VAULT REAL HOLDINGS API
//
// Returns the ACTUAL token holdings in the vault contract.
// This is what Portfolio Backing should display when vault has real assets.
// ─────────────────────────────────────────────────────────────────────────────

const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_V2_ADDRESS || process.env.INQUISITIVE_VAULT_ADDRESS || '0xb99dc519c4373e5017222bbd46f42a4e12a0ec25';

// ERC20 minimal ABI
const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

// The 27 Phase 1 assets configured in the vault
const VAULT_ASSETS = [
  { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000', decimals: 18, coingeckoId: 'ethereum' },
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, coingeckoId: 'ethereum' },
  { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, coingeckoId: 'bitcoin' },
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, coingeckoId: 'usd-coin' },
  { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, coingeckoId: 'dai' },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, coingeckoId: 'tether' },
  { symbol: 'stETH', address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', decimals: 18, coingeckoId: 'staked-ether' },
  { symbol: 'AAVE', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, coingeckoId: 'aave' },
  { symbol: 'UNI', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, coingeckoId: 'uniswap' },
  { symbol: 'LDO', address: '0x5A98FcBEA516c065bA9837734CdB0683C4b82481', decimals: 18, coingeckoId: 'lido-dao' },
  { symbol: 'LINK', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, coingeckoId: 'chainlink' },
  { symbol: 'CRV', address: '0xD533a949740bb3306d119CC777fa900bA034cd52', decimals: 18, coingeckoId: 'curve-dao-token' },
  { symbol: 'COMP', address: '0xc00e94Cb662C3520282E6f5717214004A7f26888', decimals: 18, coingeckoId: 'compound-governance-token' },
  { symbol: 'MKR', address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', decimals: 18, coingeckoId: 'maker' },
  { symbol: 'BAL', address: '0xba100000625a3754423978a60c9317c58a424e3D', decimals: 18, coingeckoId: 'balancer' },
  { symbol: 'OP', address: '0x4200000000000000000000000000000000000042', decimals: 18, coingeckoId: 'optimism' },
  { symbol: 'RNDR', address: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24', decimals: 18, coingeckoId: 'render-token' },
  { symbol: 'GRT', address: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7', decimals: 18, coingeckoId: 'the-graph' },
  { symbol: 'SNX', address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', decimals: 18, coingeckoId: 'havven' },
  { symbol: 'YFI', address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e', decimals: 18, coingeckoId: 'yearn-finance' },
];

// Fetch prices from CoinGecko
async function fetchPrices(): Promise<Map<string, number>> {
  try {
    const ids = VAULT_ASSETS.map(a => a.coingeckoId).join(',');
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    
    const priceMap = new Map<string, number>();
    for (const asset of VAULT_ASSETS) {
      const price = data[asset.coingeckoId]?.usd || 0;
      priceMap.set(asset.symbol, price);
    }
    return priceMap;
  } catch {
    return new Map();
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo'
    );

    // Fetch prices and balances in parallel
    const [prices, ethBalance] = await Promise.all([
      fetchPrices(),
      provider.getBalance(VAULT_ADDRESS)
    ]);

    // Fetch all token balances
    const holdings = await Promise.all(
      VAULT_ASSETS.map(async (asset) => {
        try {
          let balance: bigint;
          
          if (asset.symbol === 'ETH') {
            balance = ethBalance;
          } else {
            const contract = new ethers.Contract(asset.address, ERC20_ABI, provider);
            balance = await contract.balanceOf(VAULT_ADDRESS).catch(() => 0n);
          }

          const price = prices.get(asset.symbol) || 0;
          const amount = Number(ethers.formatUnits(balance, asset.decimals));
          const usdValue = amount * price;

          return {
            symbol: asset.symbol,
            amount: amount,
            usdValue: usdValue,
            price: price,
            address: asset.address,
            decimals: asset.decimals
          };
        } catch {
          return null;
        }
      })
    );

    // Filter to only holdings with balance > 0
    const activeHoldings = holdings
      .filter((h): h is NonNullable<typeof h> => h !== null && h.amount > 0.001)
      .sort((a, b) => b.usdValue - a.usdValue);

    const totalAum = activeHoldings.reduce((sum, h) => sum + h.usdValue, 0);

    // Calculate weights
    const holdingsWithWeight = activeHoldings.map(h => ({
      ...h,
      weight: totalAum > 0 ? (h.usdValue / totalAum) * 100 : 0
    }));

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json({
      vault: {
        address: VAULT_ADDRESS,
        totalAum: totalAum,
        ethBalance: Number(ethers.formatEther(ethBalance)),
        holdings: holdingsWithWeight,
        holdingCount: activeHoldings.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[vault/holdings] error:', err.message);
    res.status(500).json({ 
      error: 'Failed to fetch holdings',
      details: err.message 
    });
  }
}
