import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

// ── Fully Autonomous Portfolio Executor ──────────────────────────────────────
// Called by Vercel Cron every 60 seconds (configured in vercel.json).
// Uses EXECUTOR_PRIVATE_KEY — a minimal hot wallet key stored ONLY in Vercel's
// encrypted environment variables. It is NEVER in the source code or git.
//
// The executor wallet:
//   • Can ONLY call vault.performUpkeep() — cannot withdraw funds
//   • Needs ~0.01 ETH for gas (topped up occasionally)
//   • Even if compromised, an attacker cannot steal vault funds
//   • This is the standard institutional DeFi keeper pattern (Yearn, Compound, Aave)
//
// Setup (one-time, takes 2 minutes):
//   1. Generate a fresh hot wallet:
//      node -e "const {Wallet}=require('ethers'); const w=Wallet.createRandom(); console.log('Address:',w.address,'\nKey:',w.privateKey);"
//   2. Add EXECUTOR_PRIVATE_KEY=0x... to Vercel environment variables
//   3. Send 0.01 ETH to the executor address for gas
//   4. Call vault.setAIExecutor(executorAddress) once from your deployer wallet
//   5. Done — Vercel Cron handles everything from here automatically

const VAULT_ADDR  = process.env.INQUISITIVE_VAULT_ADDRESS || '0x506F72eABc90793ae8aC788E650bC9407ED853Fa';
const TEAM_WALLET = process.env.DEPLOYER_ADDRESS           || '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';
const RPC_URLS    = [
  process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
];

const VAULT_ABI = [
  'function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData)',
  'function performUpkeep(bytes calldata performData) external',
  'function cycleCount() external view returns (uint256)',
  'function portfolioTokens(uint256) external view returns (address)',
  'function getPortfolioLength() external view returns (uint256)',
  'function lastDeployTime() external view returns (uint256)',
  'function MIN_REDEPLOY_GAP() external view returns (uint256)',
  'function getETHBalance() external view returns (uint256)',
];

export const config = { maxDuration: 55 }; // just under Vercel's 60s cron limit

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── Auth: Vercel Cron sends CRON_SECRET, manual calls need same secret ────
  const auth = req.headers['authorization'] || req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const executorKey = process.env.EXECUTOR_PRIVATE_KEY;

  // ── No executor key: return setup instructions ────────────────────────────
  if (!executorKey) {
    return res.status(200).json({
      status:      'SETUP_REQUIRED',
      autonomous:  false,
      message:     'Add EXECUTOR_PRIVATE_KEY to Vercel environment variables to activate autonomous execution.',
      setup: {
        step1: 'Generate executor wallet: node -e "const {Wallet}=require(\'ethers\'); const w=Wallet.createRandom(); console.log(\'Address:\',w.address,\'\\nKey:\',w.privateKey);"',
        step2: 'Add EXECUTOR_PRIVATE_KEY=0x... to Vercel > Project Settings > Environment Variables',
        step3: 'Send 0.01 ETH to the executor address for gas',
        step4: 'Call vault.setAIExecutor(executorAddress) once from your deployer wallet via Etherscan Write',
        step5: 'Vercel Cron will call this endpoint every 60 seconds automatically',
        note:  'The executor key is stored ONLY in Vercel\'s encrypted env vars — never in code or git',
        security: 'Executor wallet can ONLY call performUpkeep — cannot withdraw funds from vault',
      },
      timestamp: new Date().toISOString(),
    });
  }

  // ── Connect to mainnet with RPC fallback ──────────────────────────────────
  let provider: ethers.JsonRpcProvider | null = null;
  for (const url of RPC_URLS) {
    try {
      const p = new ethers.JsonRpcProvider(url);
      await p.getBlockNumber(); // test connection
      provider = p;
      break;
    } catch {}
  }
  if (!provider) {
    return res.status(503).json({ error: 'All RPC endpoints unavailable', timestamp: new Date().toISOString() });
  }

  const executor = new ethers.Wallet(executorKey, provider);
  const vault    = new ethers.Contract(VAULT_ADDR, VAULT_ABI, executor);

  try {
    // ── Read vault state ─────────────────────────────────────────────────
    const [upkeepNeeded, ethBalRaw, cycleCountRaw, portfolioLen, executorBalRaw] = await Promise.all([
      vault.checkUpkeep('0x').then(([needed]: [boolean]) => needed).catch(() => false),
      provider.getBalance(VAULT_ADDR),
      vault.cycleCount().catch(() => 0n),
      vault.getPortfolioLength().catch(() => 0n),
      provider.getBalance(executor.address),
    ]);

    const vaultETH    = parseFloat(ethers.formatEther(ethBalRaw));
    const execETH     = parseFloat(ethers.formatEther(executorBalRaw));
    const cycleCount  = Number(cycleCountRaw);
    const assetCount  = Number(portfolioLen);

    // ── Portfolio not configured yet ──────────────────────────────────────
    if (assetCount === 0) {
      return res.status(200).json({
        status:     'PORTFOLIO_NOT_SET',
        autonomous: false,
        message:    'Run scripts/setup-portfolio.js to store portfolio weights on-chain',
        vaultETH,
        cycleCount,
        timestamp:  new Date().toISOString(),
      });
    }

    // ── Nothing to deploy ─────────────────────────────────────────────────
    if (!upkeepNeeded) {
      return res.status(200).json({
        status:     'IDLE',
        autonomous: true,
        reason:     vaultETH < 0.005 ? 'Vault ETH below MIN_DEPLOY threshold (0.005 ETH)' : 'Cooldown active — waiting for next cycle',
        vaultETH,
        assetCount,
        cycleCount,
        executorETH: execETH,
        timestamp:  new Date().toISOString(),
      });
    }

    // ── Low executor gas warning ───────────────────────────────────────────
    if (execETH < 0.003) {
      console.warn(`Executor gas low: ${execETH} ETH at ${executor.address}`);
    }

    // ── Execute performUpkeep ─────────────────────────────────────────────
    const gasEstimate = await vault.performUpkeep.estimateGas('0x').catch(() => 3_000_000n);
    const feeData     = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas ? feeData.maxFeePerGas * 120n / 100n : undefined; // +20% buffer

    const tx = await vault.performUpkeep('0x', {
      gasLimit:    gasEstimate * 120n / 100n,  // +20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
    });

    const receipt = await tx.wait(1);

    return res.status(200).json({
      status:      'EXECUTED',
      autonomous:  true,
      txHash:      receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed:     receipt.gasUsed.toString(),
      vaultETH,
      assetCount,
      cycleCount:  cycleCount + 1,
      executorETH: execETH,
      etherscan:   `https://etherscan.io/tx/${receipt.hash}`,
      timestamp:   new Date().toISOString(),
    });

  } catch (err: any) {
    console.error('Auto executor error:', err);
    return res.status(500).json({
      status:    'ERROR',
      error:     err.message,
      vaultAddr: VAULT_ADDR,
      timestamp: new Date().toISOString(),
    });
  }
}
