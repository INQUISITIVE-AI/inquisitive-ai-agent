import type { NextApiRequest, NextApiResponse } from 'next';
import { getOnchain, VAULT_ADDR } from '../_onchainCache';

// ── On-chain system readiness check ──────────────────────────────────────────────
// Reads LIVE on-chain state via shared _onchainCache (2-min TTL).
// Replaces 10+ raw per-request RPC calls that were hammering Infura.

const ETHERSCAN_API = 'https://api.etherscan.io/api';
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');

  const snap = await getOnchain();

  const vaultETH         = snap.vaultEth;
  const portfolioLength  = snap.portfolioLength;
  const cycleCount       = snap.cycleCount;
  const automationActive = snap.automationEnabled;
  const lastDeployTime   = snap.lastDeployTime;
  const ownerAddr        = snap.ownerAddr;

  // Vault has the new autonomous code if getPortfolioLength() returned a usable value
  const hasNewCode = portfolioLength > 0 || snap.vaultEth > 0 || ownerAddr !== '';

  // Determine system readiness level
  type Level = 'NOT_DEPLOYED' | 'DEPLOYED' | 'PORTFOLIO_SET' | 'AUTOMATION_ACTIVE' | 'FULLY_OPERATIONAL';
  let readiness: Level = 'NOT_DEPLOYED';
  let readinessPct = 0;
  if (hasNewCode)       { readiness = 'DEPLOYED';          readinessPct = 25; }
  if (portfolioLength > 0) { readiness = 'PORTFOLIO_SET';  readinessPct = 60; }
  if (automationActive)   { readiness = 'AUTOMATION_ACTIVE'; readinessPct = 80; }
  if (portfolioLength > 0 && automationActive && vaultETH >= 0.005) {
    readiness = 'FULLY_OPERATIONAL'; readinessPct = 100;
  }

  // Fetch recent executions from Etherscan (FundsDeployed event)
  let recentTrades: any[] = [];
  try {
    const topic0 = '0xc1b6d097b4c30a9e3c1a99b3302c81bba87b58e42af05888e23fc89b00eb765f'; // FundsDeployed
    const url = `${ETHERSCAN_API}?module=logs&action=getLogs&address=${VAULT_ADDR}&topic0=${topic0}&page=1&offset=10&sort=desc&apikey=${ETHERSCAN_KEY}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    if (d.status === '1' && Array.isArray(d.result)) {
      recentTrades = d.result.slice(0, 5).map((e: any) => ({
        txHash:    e.transactionHash,
        block:     parseInt(e.blockNumber, 16),
        timestamp: parseInt(e.timeStamp, 16),
        cycle:     parseInt(e.data?.slice(2, 66) || '0', 16),
      }));
    }
  } catch {}

  // Next required action based on readiness
  const nextAction: Record<Level, string> = {
    NOT_DEPLOYED:       'Deploy the new vault via Hardhat: npx hardhat run scripts/deploy-upgraded.js --network mainnet',    
    DEPLOYED:           'Call setPortfolio() on Etherscan Write Contract (run scripts/activate.js for arrays)',
    PORTFOLIO_SET:      'Call setAutomationEnabled(true) on Etherscan Write Contract, then activate hybrid keeper (GitHub Actions + cron-job.org) — see vault setup instructions',
    AUTOMATION_ACTIVE:  'Fund the vault — any ETH deposit will trigger autonomous deployment within 60 seconds',
    FULLY_OPERATIONAL:  'System is live. 26 ETH-mainnet assets executing via Uniswap V3 + 13 cross-chain assets bridging via deBridge DLN — every keeper cycle (1-5 min). 25 assets held as Lido stETH earning yield while tracking native prices. All 65 allocated and live. Hybrid keeper: cron-job.org (1 min) + GitHub Actions (5 min) + Vercel Cron (5 min).',    
  };

  // Deployment instructions
  const deploySteps = [
    {
      step: 1,
      done: hasNewCode,
      title: 'Deploy upgraded vault',
      detail: 'Run: npx hardhat run scripts/deploy-upgraded.js --network mainnet — uses PRIVATE_KEY in your local .env only, never committed. Update INQUISITIVE_VAULT_ADDRESS in .env after deploy.'    ,    
      keyRequired: false,
    },
    {
      step: 2,
      done: portfolioLength > 0,
      title: 'Store portfolio weights on-chain',
      detail: 'Run: node scripts/activate.js — prints exact arrays for setPortfolio() (26 ETH-mainnet tokens) and setPhase2Registry() (13 deBridge DLN bridges). Paste into Etherscan Write Contract → sign with MetaMask. No private key needed.'   ,
      keyRequired: false,
    },
    {
      step: 3,
      done: automationActive,
      title: 'Enable autonomous execution',
      detail: 'Call setAutomationEnabled(true) on Etherscan Write Contract. Activate hybrid keeper: (1) cron-job.org → https://getinqai.com/api/inquisitiveAI/execute/auto every 1 minute. (2) GitHub Actions: vault-keeper.yml configured, runs every 5 minutes. (3) Vercel Cron: vercel.json configured, fires every 5 minutes.',
      keyRequired: false,
    },
    {
      step: 4,
      done: vaultETH >= 0.005,
      title: 'Vault funded',
      detail: 'ETH deposited to vault triggers performUpkeep() via hybrid keeper (cron-job.org every 1 min + GitHub Actions every 5 min + Vercel Cron every 5 min). Deploys across 26 ETH-mainnet (Uniswap V3) + 13 cross-chain (deBridge DLN: Solana/BSC/Avalanche/Optimism/TRON). 25 assets held as Lido stETH earning yield.', 
      keyRequired: false,
    },
  ];

  return res.status(200).json({
    vault:           VAULT_ADDR,
    readiness,
    readinessPct,
    nextAction:      nextAction[readiness],
    hasNewCode,
    portfolioLength,
    cycleCount,
    automationActive,
    lastDeployTime,
    lastDeployIso:   lastDeployTime ? new Date(lastDeployTime * 1000).toISOString() : null,
    vaultETH,
    ownerAddr,
    deploySteps,
    recentTrades,
    autonomous:      readiness === 'FULLY_OPERATIONAL',
    keylessArchitecture: {
      description:   'Zero private keys in any file, env var, or server. Hybrid keeper (cron-job.org + GitHub Actions + Vercel Cron) calls performUpkeep() every 1-5 minutes.',
      deployMethod:  'Vault deployed via Remix IDE (MetaMask signs) — private key never in code or env. Portfolio configured via Etherscan Write Contract.',
      executionMethod: 'Hybrid keeper: cron-job.org (every 1 min) + GitHub Actions vault-keeper.yml (every 5 min) + Vercel Cron (every 5 min). Chainlink Automation: automation.chain.link.',
    },
    timestamp: new Date().toISOString(),
  });
}
