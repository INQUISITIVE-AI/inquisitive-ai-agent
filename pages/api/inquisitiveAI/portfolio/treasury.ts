import type { NextApiRequest, NextApiResponse } from 'next';
import { getPrices } from '../_priceCache';
import { getOnchain, VAULT_ADDR, INQAI_ADDR, DEPLOYER_ADDR } from '../_onchainCache';

// ── On-Chain Treasury Reader ─────────────────────────────────────────────────
// Reads real Ethereum mainnet state via Infura RPC.
// On-chain data is served from _onchainCache (2-min TTL) so a single Infura
// hiccup never resets all values to zero.

export const config = { maxDuration: 30 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ── Parallel: cached on-chain snapshot + cached price ───────────────────
    const [snap, priceResult] = await Promise.all([getOnchain(), getPrices()]);

    const ethPrice          = priceResult.map.get('ETH')?.priceUsd ?? 3200;
    const { vaultEth, deployerEth, totalEth,
            vaultUsdc, deployerUsdc, totalUsdc,
            totalSupply, deployerInqai, vaultInqai,
            circulatingSupply, tokensSold } = snap;

    // ── AUM calculation ──────────────────────────────────────────────────────
    // AUM = vault ETH × ETH price + vault USDC (deployer wallet excluded)
    const aumETH          = vaultEth * ethPrice;
    const aumUSD          = aumETH + vaultUsdc;

    // ── NAV per token ────────────────────────────────────────────────────────
    // If tokens have been sold: NAV = AUM / tokens_sold
    // If no tokens sold yet: NAV = presale price from env
    const PRESALE_PRICE   = parseFloat(process.env.NEXT_PUBLIC_PRESALE_PRICE || '0');
    const TARGET_PRICE    = parseFloat(process.env.NEXT_PUBLIC_TARGET_PRICE || '0');
    const navPerToken     = circulatingSupply > 0
      ? aumUSD / circulatingSupply
      : PRESALE_PRICE;

    // ── Deployment info ──────────────────────────────────────────────────────
    const deploymentBlock = parseInt(process.env.DEPLOYMENT_BLOCK || '21993900');

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({
      onChain: true,
      network: 'mainnet',
      contracts: {
        inqai:    INQAI_ADDR,
        vault:    VAULT_ADDR,
        deployer: DEPLOYER_ADDR,
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
        targetPrice:   TARGET_PRICE,
        premiumPct:    PRESALE_PRICE > 0 ? parseFloat(((navPerToken / PRESALE_PRICE - 1) * 100).toFixed(4)) : 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Treasury error:', err);
    res.status(500).json({ error: 'Failed to read on-chain treasury' });
  }
}
