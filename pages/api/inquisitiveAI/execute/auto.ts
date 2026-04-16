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
// Keeper: Chainlink Automation — registered at automation.chain.link, must fund with LINK tokens for execution.

const VAULT_ADDR = process.env.NEXT_PUBLIC_VAULT_V2_ADDRESS || process.env.INQUISITIVE_VAULT_ADDRESS || '0xb99dc519c4373e5017222bbd46f42a4e12a0ec25';
const RPC_URLS   = [
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
  // Chainlink Automation-only: this endpoint only monitors vault status
  // No auth needed - Chainlink calls performUpkeep() directly on-chain

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

  // Chainlink Automation handles all execution - no executor keys needed

  // Portfolio not configured yet
  if (p1Assets === 0) {
    return res.status(200).json({
      status:        'PORTFOLIO_NOT_SET',
      autonomous:    false,
      blockingReason:'Portfolio not configured on-chain. Setup endpoint will fix this automatically.',
      message:       'setPortfolio() + setPhase2Registry() + setAutomationEnabled() have not been called yet.',
      action:        'POST /api/inquisitiveAI/execute/setup  — or visit https://etherscan.io/address/' + VAULT_ADDR + '#writeContract',
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
      blockingReason: vaultETH === 0 ? 'Vault has 0 ETH — send ETH to the vault address to trigger execution.' : 'Vault ETH below 0.005 minimum — accepting deposits.',
      reason:         'Vault ETH below minimum — accepting deposits',
      vaultETH, p1Assets, cycleCount,
      keeper:         'Chainlink Automation — automated upkeep execution when conditions are met',
      vaultAddress:   VAULT_ADDR,
      timestamp:      new Date().toISOString(),
    });
  }

  // checkUpkeep passes at >=0.005 ETH, but performUpkeep requires >0.010 ETH
  if (upkeepNeeded && vaultETH <= 0.010) {
    return res.status(200).json({
      status:        'UNDERFUNDED',
      autonomous:    false,
      blockingReason:`Vault has ${vaultETH.toFixed(6)} ETH. Minimum required for execution: 0.010 ETH.`,
      reason:        `Vault has ${vaultETH.toFixed(6)} ETH — performUpkeep needs >0.010 ETH (0.005 gas reserve + 0.005 minimum deploy).`,
      action:        `Send ETH to vault: ${VAULT_ADDR}  (recommend 0.1+ ETH for meaningful swaps across 26 assets)`,
      vaultETH, p1Assets, cycleCount,
      timestamp: new Date().toISOString(),
    });
  }

  // Chainlink Automation-only: just return status, no manual execution
  return res.status(200).json({
    status:       upkeepNeeded ? 'UPKEEP_READY' : 'IDLE',
    autonomous:   autoEnabled,
    upkeepNeeded,
    message:      upkeepNeeded
      ? 'Chainlink Automation will execute when funded with LINK tokens.'
      : 'Vault is idle. Awaiting ETH deposit above 0.005 threshold.',
    execution: {
      method:     'Chainlink Automation — automated upkeep execution when conditions are met',
      required:   'Fund with LINK tokens at automation.chain.link',
      community:  `https://etherscan.io/address/${VAULT_ADDR}#writeContract`,
    },
    vault: {
      address:     VAULT_ADDR,
      ethBalance:  vaultETH,
      assets:      p1Assets,
      cycleCount,
      automationEnabled: autoEnabled,
    },
    timestamp: new Date().toISOString(),
  });
}
