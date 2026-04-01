import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

// ── INQAI Staking API ─────────────────────────────────────────────────────────
// Returns real-time staking data from on-chain

const STAKING_CONTRACT = process.env.STAKING_CONTRACT || '0x0000000000000000000000000000000000000000';
const INQAI_TOKEN = '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5';

const STAKING_ABI = [
  'function totalStaked() view returns (uint256)',
  'function totalRewardsDistributed() view returns (uint256)',
  'function accRewardPerShare() view returns (uint256)',
  'function getStakeInfo(address user) view returns (uint256 amount, uint256 startTime, uint256 lockEndTime, uint256 pendingReward, bool canUnstake)',
  'function pendingRewards(address user) view returns (uint256)',
  'function getTotalStakers() view returns (uint256)',
  'function getAPY() view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)'
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo'
    );

    const staking = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, provider);
    const inqai = new ethers.Contract(INQAI_TOKEN, ERC20_ABI, provider);

    // Fetch global staking stats
    const [
      totalStaked,
      totalRewards,
      totalStakers,
      apy,
      stakingContractBalance
    ] = await Promise.all([
      staking.totalStaked().catch(() => 0n),
      staking.totalRewardsDistributed().catch(() => 0n),
      staking.getTotalStakers().catch(() => 0n),
      staking.getAPY().catch(() => 0n),
      inqai.balanceOf(STAKING_CONTRACT).catch(() => 0n)
    ]);

    // Calculate staking metrics
    const totalSupply = await inqai.totalSupply().catch(() => 100000000n * 10n**18n);
    const stakingRatio = totalSupply > 0n 
      ? Number((totalStaked * 10000n) / totalSupply) / 100 
      : 0;

    // If user address provided, fetch individual stats
    let userStats = null;
    const { address } = req.query;
    
    if (address && typeof address === 'string' && ethers.isAddress(address)) {
      const [stakeInfo, pendingReward] = await Promise.all([
        staking.getStakeInfo(address).catch(() => [0n, 0n, 0n, 0n, false]),
        staking.pendingRewards(address).catch(() => 0n)
      ]);

      userStats = {
        stakedAmount: ethers.formatUnits(stakeInfo[0], 18),
        startTime: Number(stakeInfo[1]) * 1000,
        lockEndTime: Number(stakeInfo[2]) * 1000,
        pendingReward: ethers.formatUnits(pendingReward, 18),
        canUnstake: stakeInfo[4]
      };
    }

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json({
      global: {
        totalStaked: ethers.formatUnits(totalStaked, 18),
        totalRewardsDistributed: ethers.formatUnits(totalRewards, 18),
        totalStakers: Number(totalStakers),
        apy: Number(apy) / 100, // Convert basis points to percentage
        stakingRatio,
        contractBalance: ethers.formatUnits(stakingContractBalance, 18)
      },
      user: userStats,
      contracts: {
        staking: STAKING_CONTRACT,
        inqai: INQAI_TOKEN
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[staking] error:', err.message);
    res.status(500).json({ 
      error: 'Failed to fetch staking data',
      details: err.message 
    });
  }
}
