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
  const aiOracleAddr     = snap.aiOracleAddr;
  const DEPLOYER         = '0x4e7d700f7e1c6eeb5c9426a0297ae0765899e746';
  const oracleIsDeployer = aiOracleAddr.toLowerCase() === DEPLOYER;
  const oracleIsContract = aiOracleAddr.length === 42 && !oracleIsDeployer;

  // Vault has the new autonomous code if getPortfolioLength() returned a usable value
  const hasNewCode = portfolioLength > 0 || snap.vaultEth > 0 || ownerAddr !== '';

  // Determine system readiness level
  type Level = 'NOT_DEPLOYED' | 'DEPLOYED' | 'PORTFOLIO_SET' | 'AUTOMATION_ACTIVE' | 'FULLY_OPERATIONAL';
  let readiness: Level = 'NOT_DEPLOYED';
  let readinessPct = 0;
  if (hasNewCode)           { readiness = 'DEPLOYED';            readinessPct = 25; }
  if (portfolioLength > 0)   { readiness = 'PORTFOLIO_SET';       readinessPct = 60; }
  if (automationActive)      { readiness = 'AUTOMATION_ACTIVE';   readinessPct = 80; }
  if (portfolioLength > 0 && automationActive) {
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
    NOT_DEPLOYED:       'Vault not yet detected on-chain. Confirm the INQUISITIVE_VAULT_ADDRESS env var is correct.',
    DEPLOYED:           'Add the 17 DeFi blue-chip tracked assets via /vault-setup.html → "Add All 17 Assets".',
    PORTFOLIO_SET:      'Call setAutomationEnabled(true) via /vault-setup.html → "Enable Automation".',
    AUTOMATION_ACTIVE:  'Deploy InquisitiveOracleConsumer (Chainlink Functions) per chainlink-functions/SETUP_GUIDE.md, then setAIOracle(<consumer>) on the vault.',
    FULLY_OPERATIONAL:  'Vault configured. For trades to execute: (1) Oracle Consumer must be set as aiOracle, (2) both the Oracle Consumer and the Vault must be registered at automation.chain.link and funded with LINK, (3) Functions subscription must be funded with LINK.',
  };

  // Deployment / go-live checklist (Chainlink Functions + Automation architecture).
  // Each step is passive — it's marked done if the on-chain state shows it's done.
  const deploySteps = [
    {
      step: 1,
      done: hasNewCode,
      title: 'VaultV2 deployed',
      detail: 'InquisitiveVaultV2 (UUPS proxy) live on mainnet with the signal-based trading interface.',
      keyRequired: false,
    },
    {
      step: 2,
      done: portfolioLength >= 17,
      title: `Tracked assets registered (${portfolioLength}/17)`,
      detail: 'All 17 DeFi blue-chips (WBTC, WETH, stETH, USDC, LINK, UNI, LDO, GRT, ARB, ENA, ONDO, MKR, ENS, COMP, CRV, CVX, BAL) registered via addTrackedAsset(). Use /vault-setup.html → "Add All 17 Assets".',
      keyRequired: false,
    },
    {
      step: 3,
      done: automationActive,
      title: 'Automation flag enabled',
      detail: 'setAutomationEnabled(true) must be called on the vault so performUpkeep() can execute.',
      keyRequired: false,
    },
    {
      step: 4,
      done: oracleIsContract,
      title: oracleIsContract
        ? 'Chainlink Functions OracleConsumer wired'
        : 'Deploy & wire Chainlink Functions OracleConsumer',
      detail: oracleIsContract
        ? `aiOracle = ${aiOracleAddr} — contract is authorized to submit signals.`
        : 'Deploy with `forge script script/DeployOracleConsumer.s.sol --rpc-url $MAINNET_RPC_URL --trezor --broadcast --verify`. Then follow chainlink-functions/SETUP_GUIDE.md steps 2–7 (Functions subscription, LINK, Automation registration, setAIOracle on the vault).',
      keyRequired: false,
    },
    {
      step: 5,
      done: vaultETH > 0,
      title: 'Vault funded with ETH',
      detail: 'ETH is required for Uniswap V3 swaps. Any non-zero balance is sufficient; 1% per trade is deployed by performUpkeep().',
      keyRequired: false,
    },
    {
      step: 6,
      done: cycleCount > 0,
      title: `Autonomous trades executed (${cycleCount})`,
      detail: 'Once the OracleConsumer submits signals and both Automation upkeeps are funded, Chainlink calls performUpkeep() on the vault and swaps fire on Uniswap V3.',
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
    aiOracleAddr,
    oracleStatus:    oracleIsContract ? 'consumer'
                    : oracleIsDeployer ? 'deployer-manual'
                    : aiOracleAddr ? 'external-eoa' : 'unset',
    deploySteps,
    recentTrades,
    autonomous:      readiness === 'FULLY_OPERATIONAL' && oracleIsContract && cycleCount > 0,
    keylessArchitecture: {
      description:      'Signals are fetched by Chainlink Functions DON (no server signer). Chainlink Automation calls both the consumer (every 10 min) and the vault (when signals fire). No private keys in code, env, or GitHub Secrets.',
      deployMethod:     'InquisitiveVaultV2 + InquisitiveOracleConsumer deployed via Foundry with a hardware wallet (--trezor). Configuration via Etherscan Write Contract or vault-setup.html.',
      executionMethod:  'Chainlink Functions fetches https://getinqai.com/api/inquisitiveAI/cron/oracle, returns 30-byte signal array, consumer calls vault.submitSignalsBatch(). Chainlink Automation then triggers vault.performUpkeep() which swaps via Uniswap V3.',
    },
    timestamp: new Date().toISOString(),
  });
}
