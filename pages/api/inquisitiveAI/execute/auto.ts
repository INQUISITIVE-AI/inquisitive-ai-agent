import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

// ── INQUISITIVE Vault Keeper ─────────────────────────────────────────────────
// performUpkeep() handles ALL 65 assets in ONE call:
//   BRIDGE     (deBridge DLN, 13 cross-chain)    — executed first
//   ETH-DIRECT (Uniswap V3, 26 ETH-mainnet)      — executed after
//   stETH YIELD (25 assets)                       — ETH held as Lido stETH
//
//   Cross-chain receiver addresses stored on-chain via setPhase2Registry().
//   Activation: node scripts/activate.js  → paste calldata into Etherscan Write Contract
//
// Keeper execution model:
//   Primary:   cron-job.org        — every 60s
//   Backup:    GitHub Actions      — vault-keeper.yml every 5 min
//   Tertiary:  Vercel Cron         — vercel.json every 5 min
//   Optional:  Chainlink Automation — register at automation.chain.link
//   Fallback:  EXECUTOR_PRIVATE_KEY — direct performUpkeep() call if set
//
// EXECUTOR_PRIVATE_KEY (optional):
//   CAN ONLY call performUpkeep() — cannot withdraw funds or change ownership.

const VAULT_ADDR = process.env.INQUISITIVE_VAULT_ADDRESS || '0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52';
const RPC_URLS   = [
  process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
];

const VAULT_ABI = [
  'function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData)',
  'function performUpkeep(bytes calldata performData) external',
  'function cycleCount() external view returns (uint256)',
  'function getPortfolioLength() external view returns (uint256)',
  'function lastDeployTime() external view returns (uint256)',
  'function MIN_REDEPLOY_GAP() external view returns (uint256)',
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
  // Auth: Vercel built-in cron (x-vercel-cron header), cron-job.org (Authorization: Bearer <CRON_SECRET>),
  // or any unauthenticated ping when no EXECUTOR_PRIVATE_KEY is set (read-only vault state check).
  const auth         = req.headers['authorization'] || req.headers['x-cron-secret'];
  const isVercelCron = !!req.headers['x-vercel-cron'];
  if (!isVercelCron && process.env.EXECUTOR_PRIVATE_KEY && process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let provider: ethers.JsonRpcProvider;
  try {
    provider = await getProvider();
  } catch {
    return res.status(200).json({ status: 'RPC_UNAVAILABLE', autonomous: false, timestamp: new Date().toISOString() });
  }

  const readVault = new ethers.Contract(VAULT_ADDR, VAULT_ABI, provider);

  // Read vault state
  const [upkeepNeeded, ethBalRaw, cycleCountRaw, portfolioLen, autoEnabled] = await Promise.all([
    readVault.checkUpkeep('0x').then(([n]: [boolean]) => n).catch(() => false),
    provider.getBalance(VAULT_ADDR).catch(() => 0n),
    readVault.cycleCount().catch(() => 0n),
    readVault.getPortfolioLength().catch(() => 0n),
    readVault.automationEnabled().catch(() => false),
  ]);

  const vaultETH   = parseFloat(ethers.formatEther(ethBalRaw));
  const cycleCount = Number(cycleCountRaw);
  const p1Assets   = Number(portfolioLen);

  // ── Executor key detection (moved up so every response carries executor status) ──────
  const rawKey     = process.env.EXECUTOR_PRIVATE_KEY || process.env.KEEPER_PRIVATE_KEY || '';
  // Normalise: ethers.Wallet requires '0x'-prefixed 32-byte hex
  const executorKey = rawKey ? (rawKey.startsWith('0x') ? rawKey : '0x' + rawKey) : '';
  const gelatoKey   = process.env.GELATO_API_KEY || '';
  const executorReady = !!executorKey && executorKey.length >= 66; // '0x' + 64 hex chars
  // Derive executor address without RPC (pure key math — safe to do here)
  let executorAddress = '';
  try { if (executorReady) executorAddress = new ethers.Wallet(executorKey).address; } catch {}

  // Portfolio not configured yet
  if (p1Assets === 0) {
    return res.status(200).json({
      status:        'PORTFOLIO_NOT_SET',
      autonomous:    false,
      executorReady, executorAddress,
      blockingReason:'Portfolio not configured on-chain. Setup endpoint will fix this automatically.',
      message:       'setPortfolio() + setPhase2Registry() + setAutomationEnabled() have not been called yet.',
      action:        'POST /api/inquisitiveAI/execute/setup  — or visit https://etherscan.io/address/' + VAULT_ADDR + '#writeContract',
      setup:         'Vercel Cron calls /api/inquisitiveAI/execute/setup every 5 min until vault is configured.',
      setupEndpoint: '/api/inquisitiveAI/execute/setup',
      vaultETH, cycleCount,
      timestamp: new Date().toISOString(),
    });
  }

  // Vault idle — below checkUpkeep threshold
  if (!upkeepNeeded && vaultETH < 0.005) {
    return res.status(200).json({
      status:        'IDLE',
      autonomous:    true,
      executorReady,
      blockingReason: vaultETH === 0 ? 'Vault has 0 ETH — send ETH to the vault address to trigger execution.' : 'Vault ETH below 0.005 minimum — accepting deposits.',
      reason:         'Vault ETH below minimum — accepting deposits',
      vaultETH, p1Assets, cycleCount,
      keeper:         'cron-job.org primary + GitHub Actions backup + Vercel Cron tertiary',
      vaultAddress:   VAULT_ADDR,
      timestamp:      new Date().toISOString(),
    });
  }

  // checkUpkeep passes at >=0.005 ETH, but performUpkeep requires >0.010 ETH
  if (upkeepNeeded && vaultETH <= 0.010) {
    return res.status(200).json({
      status:        'UNDERFUNDED',
      autonomous:    false,
      executorReady,
      blockingReason:`Vault has ${vaultETH.toFixed(6)} ETH. Minimum required for execution: 0.010 ETH.`,
      reason:        `Vault has ${vaultETH.toFixed(6)} ETH — performUpkeep needs >0.010 ETH (0.005 gas reserve + 0.005 minimum deploy).`,
      action:        `Send ETH to vault: ${VAULT_ADDR}  (recommend 0.1+ ETH for meaningful swaps across 26 assets)`,
      vaultETH, p1Assets, cycleCount,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Gelato relay path ───────────────────────────────────────────────────────────────────────────────

  if (!executorKey && gelatoKey && upkeepNeeded) {
    // ABI-encode performUpkeep(bytes) with empty bytes argument
    // selector = keccak256("performUpkeep(bytes)")[0:4] = 0x4585e33b
    const calldata =
      '0x4585e33b' +
      '0000000000000000000000000000000000000000000000000000000000000020' +
      '0000000000000000000000000000000000000000000000000000000000000000';

    try {
      const gelatoRes = await fetch('https://relay.gelato.network/relays/v2/sponsored-call', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gelatoKey}` },
        body:    JSON.stringify({ chainId: 1, target: VAULT_ADDR, data: calldata }),
        signal:  AbortSignal.timeout(15000),
      });

      if (gelatoRes.ok) {
        const { taskId } = await gelatoRes.json();
        console.log(`performUpkeep submitted via Gelato relay — taskId: ${taskId}`);
        return res.status(200).json({
          status:      'EXECUTED_VIA_GELATO',
          autonomous:  true,
          taskId,
          trackUrl:    `https://relay.gelato.network/tasks/status/${taskId}`,
          vault:       { vaultETH, p1Assets, cycleCount, autoEnabled },
          message:     `performUpkeep() submitted via Gelato relay. Hybrid keeper (cron-job.org + GitHub Actions) also active.`,
          timestamp:   new Date().toISOString(),
        });
      }

      const errBody = await gelatoRes.json().catch(() => ({ message: gelatoRes.statusText }));
      console.warn('Gelato relay rejected:', errBody);
    } catch (gelatoErr: any) {
      console.warn('Gelato relay unreachable:', gelatoErr.message);
    }

    // Gelato failed — fall through to monitoring status
    return res.status(200).json({
      status:       'UPKEEP_READY',
      autonomous:   autoEnabled,
      upkeepNeeded: true,
      message:      'Upkeep ready. Gelato relay attempted but unavailable — cron-job.org / GitHub Actions will trigger.',
      execution: {
        primary:   'cron-job.org (1 min) + GitHub Actions (5 min) + Vercel Cron (5 min)',
        gelato:    'Gelato relay key set but relay unreachable this cycle',
        community: `https://etherscan.io/address/${VAULT_ADDR}#writeContract`,
      },
      vault:     { vaultETH, p1Assets, cycleCount, autoEnabled },
      timestamp: new Date().toISOString(),
    });
  }

  if (!executorKey && !gelatoKey) {
    return res.status(200).json({
      status:       upkeepNeeded ? 'UPKEEP_READY' : 'IDLE',
      autonomous:   autoEnabled,
      upkeepNeeded,
      message:      upkeepNeeded
        ? 'Upkeep ready. Hybrid keeper (cron-job.org + GitHub Actions) will trigger next cycle.'
        : 'Vault is idle. Awaiting ETH deposit above 0.005 threshold.',
      execution: {
        primary:   'cron-job.org (1 min) + GitHub Actions (5 min) + Vercel Cron (5 min)',
        optional:  'Chainlink Automation: https://automation.chain.link',
        community: `https://etherscan.io/address/${VAULT_ADDR}#writeContract`,
      },
      vault:     { vaultETH, p1Assets, cycleCount, autoEnabled },
      timestamp: new Date().toISOString(),
    });
  }

  // ── Executor path: EXECUTOR_PRIVATE_KEY is set ──────────────────────────────
  // performUpkeep() handles ETH-DIRECT (26 Uniswap V3) + BRIDGE (13 deBridge DLN) in one transaction.
  // Cross-chain receiver addresses are stored on-chain — no wallet env vars needed here.
  const executor = new ethers.Wallet(executorKey!, provider);
  const vault    = new ethers.Contract(VAULT_ADDR, VAULT_ABI, executor);

  try {
    const executorBalRaw = await provider.getBalance(executor.address).catch(() => 0n);
    const execETH        = parseFloat(ethers.formatEther(executorBalRaw));
    if (execETH < 0.001) {
      return res.status(200).json({
        status:        'EXECUTOR_NO_GAS',
        autonomous:    false,
        executorReady: false,
        blockingReason:`Executor wallet ${executor.address} has ${execETH.toFixed(6)} ETH — needs ≥0.05 ETH for gas (performUpkeep costs ~200k-500k gas). Send ETH to this exact address to enable automatic execution.`,
        executorAddress: executor.address,
        executorETH:   execETH,
        fundingRequired: '0.05 ETH minimum (covers ~50 automatic execution cycles)',
        vault:         { vaultETH, p1Assets, cycleCount },
        timestamp:     new Date().toISOString(),
      });
    }

    if (!upkeepNeeded) {
      return res.status(200).json({
        status: 'IDLE', autonomous: true,
        reason: 'Cooldown active or insufficient ETH',
        vault: { vaultETH, p1Assets, cycleCount },
        executor: { address: executor.address, ethBalance: execETH },
        timestamp: new Date().toISOString(),
      });
    }

    const feeData      = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas ? feeData.maxFeePerGas * 120n / 100n : undefined;
    const maxPrioFee   = feeData.maxPriorityFeePerGas ?? undefined;

    // One call handles ETH-DIRECT (26 Uniswap V3 swaps) + BRIDGE (13 deBridge DLN bridges)
    const gasEst = await vault.performUpkeep.estimateGas('0x').catch(() => 5_000_000n);
    const tx     = await vault.performUpkeep('0x', {
      gasLimit:             gasEst * 130n / 100n,
      maxFeePerGas,
      maxPriorityFeePerGas: maxPrioFee,
    });
    const receipt = await tx.wait(1);

    console.log(`performUpkeep tx: ${receipt.hash} (${p1Assets} assets deployed)`);

    return res.status(200).json({
      status:      'EXECUTED',
      autonomous:  true,
      txHash:      receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed:     receipt.gasUsed.toString(),
      etherscan:   `https://etherscan.io/tx/${receipt.hash}`,
      assets:      { deployed: p1Assets },
      vault:       { vaultETH, cycleCount: cycleCount + 1 },
      executor:    { address: executor.address, ethBalance: execETH },
      timestamp:   new Date().toISOString(),
    });

  } catch (err: any) {
    console.error('performUpkeep failed:', err.message);
    return res.status(200).json({
      status:    'FAILED',
      error:     err.message,
      vaultAddr: VAULT_ADDR,
      timestamp: new Date().toISOString(),
    });
  }
}
