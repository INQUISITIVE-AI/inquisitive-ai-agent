import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

// ── INQAI Referral API ─────────────────────────────────────────────────────────
// Returns referral stats and tracking data

const REFERRAL_CONTRACT = process.env.REFERRAL_CONTRACT || '0x0000000000000000000000000000000000000000';

const REFERRAL_ABI = [
  'function referredBy(address referee) view returns (address)',
  'function getReferrerStats(address referrer) view returns (uint256 count, uint256 volume, uint256 bonus, bool exists)',
  'function getTotalReferrers() view returns (uint256)',
  'function refereeBonusClaimed(address referee) view returns (uint256)',
  'function bonusPool() view returns (uint256)',
  'function estimateBonus(uint256 ethAmount) pure returns (uint256 referrerBonus, uint256 refereeBonus)'
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo'
    );

    const referral = new ethers.Contract(REFERRAL_CONTRACT, REFERRAL_ABI, provider);

    // Fetch global stats
    const [totalReferrers, bonusPool] = await Promise.all([
      referral.getTotalReferrers().catch(() => 0n),
      referral.bonusPool().catch(() => 0n)
    ]);

    // If user address provided, fetch individual stats
    let userStats = null;
    const { address } = req.query;
    
    if (address && typeof address === 'string' && ethers.isAddress(address)) {
      const [referrerStats, referredBy, bonusClaimed] = await Promise.all([
        referral.getReferrerStats(address).catch(() => [0n, 0n, 0n, false]),
        referral.referredBy(address).catch(() => '0x0000000000000000000000000000000000000000'),
        referral.refereeBonusClaimed(address).catch(() => 0n)
      ]);

      const hasReferrer = referredBy !== '0x0000000000000000000000000000000000000000';
      const isReferrer = referrerStats[3]; // exists flag

      userStats = {
        isReferrer,
        hasReferrer,
        referrer: hasReferrer ? referredBy : null,
        referralCount: Number(referrerStats[0]),
        totalVolumeEth: ethers.formatEther(referrerStats[1]),
        totalBonusEarned: ethers.formatUnits(referrerStats[2], 18),
        bonusClaimed: ethers.formatUnits(bonusClaimed, 18),
        referralCode: address // Users share their address as referral code
      };
    }

    // Estimate bonus for 1 ETH purchase
    const bonusEstimate = await referral.estimateBonus(ethers.parseEther('1')).catch(() => [0n, 0n]);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json({
      global: {
        totalReferrers: Number(totalReferrers),
        bonusPool: ethers.formatUnits(bonusPool, 18),
        bonusPercent: {
          referrer: 5,
          referee: 5
        },
        estimatedBonusPerEth: {
          referrer: ethers.formatUnits(bonusEstimate[0], 18),
          referee: ethers.formatUnits(bonusEstimate[1], 18)
        }
      },
      user: userStats,
      contracts: {
        referral: REFERRAL_CONTRACT
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[referral] error:', err.message);
    res.status(500).json({ 
      error: 'Failed to fetch referral data',
      details: err.message 
    });
  }
}
