import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

// ── FeeDistributor API — Buyback & Burn Tracker ─────────────────────────────
// Tracks protocol fee distribution and buyback activity

const DISTRIBUTOR_CONTRACT = process.env.DISTRIBUTOR_CONTRACT || '0x0000000000000000000000000000000000000000';
const INQAI_TOKEN = '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5';
const TEAM_WALLET = '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';

const DISTRIBUTOR_ABI = [
  'function totalFeesCollected() view returns (uint256)',
  'function totalBuybacks() view returns (uint256)',
  'function totalBurned() view returns (uint256)',
  'function totalToTreasury() view returns (uint256)',
  'function distributionCount() view returns (uint256)',
  'function pendingDistribution() view returns (uint256)',
  'function getStats() view returns (uint256 feesCollected, uint256 buybacks, uint256 burned, uint256 toTreasury, uint256 distributions, uint256 currentBalance)'
];

const ERC20_ABI = [
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)'
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo'
    );

    const distributor = new ethers.Contract(DISTRIBUTOR_CONTRACT, DISTRIBUTOR_ABI, provider);
    const inqai = new ethers.Contract(INQAI_TOKEN, ERC20_ABI, provider);

    // Fetch stats
    const stats = await distributor.getStats().catch(() => [0n, 0n, 0n, 0n, 0n, 0n]);
    const [feesCollected, buybacks, burned, toTreasury, distributions, currentBalance] = stats;

    // Calculate current INQAI supply
    const totalSupply = await inqai.totalSupply().catch(() => 100000000n * 10n**18n);
    const burnedInqai = await inqai.balanceOf('0x000000000000000000000000000000000000dEaD').catch(() => 0n);
    const circulatingSupply = totalSupply - burnedInqai;

    // Calculate percentages
    const totalDistributed = buybacks + burned + toTreasury;
    const buybackPct = totalDistributed > 0n ? Number((buybacks * 10000n) / totalDistributed) / 100 : 0;
    const burnPct = totalDistributed > 0n ? Number((burned * 10000n) / totalDistributed) / 100 : 0;
    const treasuryPct = totalDistributed > 0n ? Number((toTreasury * 10000n) / totalDistributed) / 100 : 0;

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json({
      fees: {
        totalCollected: ethers.formatEther(feesCollected),
        pendingDistribution: ethers.formatEther(currentBalance),
        distributionCount: Number(distributions)
      },
      distribution: {
        buybacks: {
          eth: ethers.formatEther(buybacks),
          percentage: buybackPct,
          destination: 'Staking Rewards'
        },
        burns: {
          eth: ethers.formatEther(burned),
          percentage: burnPct,
          destination: 'Permanently Burned'
        },
        treasury: {
          eth: ethers.formatEther(toTreasury),
          percentage: treasuryPct,
          destination: TEAM_WALLET
        }
      },
      token: {
        totalSupply: ethers.formatUnits(totalSupply, 18),
        burned: ethers.formatUnits(burnedInqai, 18),
        circulating: ethers.formatUnits(circulatingSupply, 18),
        burnPercentage: Number((burnedInqai * 10000n) / totalSupply) / 100
      },
      contracts: {
        distributor: DISTRIBUTOR_CONTRACT,
        inqai: INQAI_TOKEN
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[fees] error:', err.message);
    res.status(500).json({ 
      error: 'Failed to fetch fee data',
      details: err.message 
    });
  }
}
