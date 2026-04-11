import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

// ── Autonomous Keeper ───────────────────────────────────────────────────────
// Vercel Cron calls this every 5 minutes to trigger performUpkeep() autonomously.
// No human intervention. No Chainlink LINK fees. Just runs.
//
// Requirements:
//   - KEEPER_PRIVATE_KEY: funded wallet with small ETH for gas (0.01 ETH lasts months)
//   - Runs on Vercel's infrastructure (free tier includes cron jobs)

const VAULT_ADDR = process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb';
const KEEPER_KEY = process.env.KEEPER_PRIVATE_KEY;

const RPC_URLS = [
  ...(process.env.MAINNET_RPC_URL ? [process.env.MAINNET_RPC_URL] : []),
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
];

const VAULT_ABI = [
  'function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData)',
  'function performUpkeep(bytes calldata performData) external',
  'function cycleCount() external view returns (uint256)',
  'function getPortfolioLength() external view returns (uint256)',
  'function automationEnabled() external view returns (bool)',
];

export const config = { maxDuration: 55 };

async function getProvider(): Promise<ethers.JsonRpcProvider> {
  for (const url of RPC_URLS) {
    try {
      const p = new ethers.JsonRpcProvider(url);
      await p.getBlockNumber();
      return p;
    } catch {}
  }
  throw new Error('All RPC endpoints unavailable');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow cron or explicit trigger
  const isCron = req.headers['x-vercel-cron'] === '1' || req.query.trigger === '1';
  if (!isCron && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!KEEPER_KEY) {
    return res.status(200).json({ 
      status: 'KEEPER_NOT_CONFIGURED',
      message: 'Set KEEPER_PRIVATE_KEY in environment to enable autonomous execution',
      autonomous: false 
    });
  }

  let provider: ethers.JsonRpcProvider;
  try {
    provider = await getProvider();
  } catch {
    return res.status(200).json({ 
      status: 'RPC_UNAVAILABLE', 
      autonomous: false,
      timestamp: new Date().toISOString() 
    });
  }

  const wallet = new ethers.Wallet(KEEPER_KEY, provider);
  const vault = new ethers.Contract(VAULT_ADDR, VAULT_ABI, wallet);

  try {
    // Check if upkeep is needed
    const [upkeepNeeded] = await vault.checkUpkeep('0x');
    
    if (!upkeepNeeded) {
      return res.status(200).json({
        status: 'UPKEEP_NOT_NEEDED',
        message: 'Conditions not met (cooldown active, no ETH, or automation disabled)',
        autonomous: true,
        action: 'SKIPPED',
        timestamp: new Date().toISOString(),
      });
    }

    // Get pre-state
    const cycleBefore = await vault.cycleCount();

    // Execute performUpkeep
    const tx = await vault.performUpkeep('0x', {
      gasLimit: 5000000, // 5M gas for 32 assets
    });

    // Wait for confirmation
    const receipt = await tx.wait(1);

    // Get post-state
    const cycleAfter = await vault.cycleCount();

    return res.status(200).json({
      status: 'EXECUTED',
      autonomous: true,
      action: 'PERFORM_UPKEEP',
      txHash: tx.hash,
      gasUsed: receipt?.gasUsed?.toString(),
      cycles: {
        before: cycleBefore.toString(),
        after: cycleAfter.toString(),
      },
      keeper: wallet.address,
      timestamp: new Date().toISOString(),
    });

  } catch (e: any) {
    // Check if already executed (cooldown)
    if (e.message?.includes('Cooldown active')) {
      return res.status(200).json({
        status: 'COOLDOWN_ACTIVE',
        autonomous: true,
        action: 'SKIPPED',
        message: 'Cooldown period still active',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if insufficient ETH
    if (e.message?.includes('Insufficient ETH')) {
      return res.status(200).json({
        status: 'INSUFFICIENT_VAULT_ETH',
        autonomous: true,
        action: 'SKIPPED',
        message: 'Vault needs more ETH to trade',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      status: 'ERROR',
      autonomous: true,
      action: 'FAILED',
      error: e.shortMessage || e.message,
      timestamp: new Date().toISOString(),
    });
  }
}
