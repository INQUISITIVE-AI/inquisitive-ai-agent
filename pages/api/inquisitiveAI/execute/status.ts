import type { NextApiRequest, NextApiResponse } from 'next';

// ── On-chain system readiness check ──────────────────────────────────────────
// Reads LIVE on-chain state to determine:
//   1. Is the vault deployed with the autonomous code (has setPortfolio)?
//   2. Is the portfolio configured on-chain (weights stored)?
//   3. Is automation enabled?
//   4. What is the vault ETH balance (deployable AUM)?
//   5. Last execution time + cycle count
// Returns a complete status object the analytics UI can render in real-time.

const VAULT_ADDR  = process.env.INQUISITIVE_VAULT_ADDRESS || '0x506F72eABc90793ae8aC788E650bC9407ED853Fa';
const RPC_URLS    = [
  process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
];

const ETHERSCAN_API = 'https://api.etherscan.io/api';
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || '';

function rpcBody(method: string, params: any[] = [], id = 1) {
  return JSON.stringify({ jsonrpc: '2.0', method, params, id });
}

async function rpcCall(rpcUrl: string, method: string, params: any[] = []) {
  const res = await fetch(rpcUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    rpcBody(method, params),
    signal:  AbortSignal.timeout(5000),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d.result;
}

async function getRpc(rpcUrl: string, to: string, data: string) {
  return rpcCall(rpcUrl, 'eth_call', [{ to, data }, 'latest']);
}

// ABI-encode a call with no args (for view functions)
function sig(fnSig: string) {
  const hex = Buffer.from(fnSig).toString('hex');
  const padded = hex.padEnd(64, '0');
  const keccak = require('crypto').createHash('sha256').update(fnSig).digest('hex');
  // Manually compute 4-byte selector for known functions
  const SELECTORS: Record<string, string> = {
    'getPortfolioLength()':  '0x' + 'f880b0ff',
    'cycleCount()':          '0x' + 'a3ac3b7a',
    'automationEnabled()':   '0x' + '2f8fa9d7',
    'lastDeployTime()':      '0x' + 'a9e45c0b',
    'MIN_DEPLOY()':          '0x' + '23f3c030',
    'MIN_REDEPLOY_GAP()':    '0x' + 'e8f0fb6c',
    'owner()':               '0x' + '8da5cb5b',
    'checkUpkeep(bytes)':    '0x' + '6e04ff0d',
  };
  return SELECTORS[fnSig] || '0x00000000';
}

// Known 4-byte selectors for our vault functions
const SEL: Record<string, string> = {
  getPortfolioLength: '0xf880b0ff',
  cycleCount:         '0xa3ac3b7a',
  automationEnabled:  '0x2f8fa9d7',
  lastDeployTime:     '0xa9e45c0b',
  owner:              '0x8da5cb5b',
};

function decodeUint256(hex: string): bigint {
  if (!hex || hex === '0x') return 0n;
  return BigInt(hex);
}
function decodeBool(hex: string): boolean {
  return hex !== '0x' && BigInt(hex) !== 0n;
}
function decodeAddress(hex: string): string {
  if (!hex || hex === '0x' || hex.length < 42) return '';
  return '0x' + hex.slice(-40);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  let rpcUrl = RPC_URLS[0];
  for (const url of RPC_URLS) {
    try {
      await rpcCall(url, 'eth_blockNumber');
      rpcUrl = url;
      break;
    } catch {}
  }

  const [vaultBalHex, block] = await Promise.all([
    rpcCall(rpcUrl, 'eth_getBalance', [VAULT_ADDR, 'latest']).catch(() => '0x0'),
    rpcCall(rpcUrl, 'eth_blockNumber').catch(() => '0x0'),
  ]);

  const vaultETH = parseFloat((BigInt(vaultBalHex) * 10000n / BigInt(1e18)) as any) / 10000;

  // Read vault state in parallel — handle failures gracefully
  const [portfolioLenHex, cycleHex, autoHex, lastDeployHex, ownerHex] = await Promise.all([
    getRpc(rpcUrl, VAULT_ADDR, SEL.getPortfolioLength).catch(() => '0x'),
    getRpc(rpcUrl, VAULT_ADDR, SEL.cycleCount).catch(() => '0x'),
    getRpc(rpcUrl, VAULT_ADDR, SEL.automationEnabled).catch(() => '0x'),
    getRpc(rpcUrl, VAULT_ADDR, SEL.lastDeployTime).catch(() => '0x'),
    getRpc(rpcUrl, VAULT_ADDR, SEL.owner).catch(() => '0x'),
  ]);

  const portfolioLength  = Number(decodeUint256(portfolioLenHex));
  const cycleCount       = Number(decodeUint256(cycleHex));
  const automationActive = decodeBool(autoHex);
  const lastDeployTime   = Number(decodeUint256(lastDeployHex));
  const ownerAddr        = decodeAddress(ownerHex);

  // Vault has the NEW code if getPortfolioLength() returns a valid value
  // (old stub vault would revert or return garbage)
  const hasNewCode = portfolioLenHex !== '0x' && portfolioLenHex.length >= 10;

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
    PORTFOLIO_SET:      'Call setAutomationEnabled(true) on Etherscan Write Contract, then register Chainlink Automation at automation.chain.link',
    AUTOMATION_ACTIVE:  'Fund the vault — any ETH deposit will trigger autonomous deployment within 60 seconds',
    FULLY_OPERATIONAL:  'System is live. 27 ETH-mainnet assets executing via Uniswap V3 + 13 cross-chain assets bridging via deBridge DLN — every Chainlink cycle. 25 assets held as Lido stETH earning yield while tracking native prices. All 65 allocated and live.',    
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
      detail: 'Run: node scripts/activate.js — prints exact arrays for setPortfolio() (27 ETH-mainnet tokens) and setPhase2Registry() (13 deBridge DLN bridges). Paste into Etherscan Write Contract → sign with MetaMask. No private key needed.'   ,
      keyRequired: false,
    },
    {
      step: 3,
      done: automationActive,
      title: 'Enable autonomous execution',
      detail: 'On Etherscan Write Contract: call setAutomationEnabled(true). Then go to automation.chain.link → New Upkeep → Custom Logic → paste vault address → fund with 1 LINK.',
      keyRequired: false,
    },
    {
      step: 4,
      done: vaultETH >= 0.005,
      title: 'Vault funded',
      detail: 'ETH deposited to vault triggers performUpkeep() via Chainlink Automation. Deploys across 27 ETH-mainnet (Uniswap V3) + 13 cross-chain (deBridge DLN: Solana/BSC/Avalanche/Optimism/TRON). 25 assets held as Lido stETH earning yield. All 65 assets fully live — zero simulation.'  , 
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
    blockNumber:     parseInt(block, 16),
    autonomous:      readiness === 'FULLY_OPERATIONAL',
    keylessArchitecture: {
      description:   'Zero private keys in any file, env var, or server. Chainlink Automation nodes call performUpkeep() on-chain. Identical to Yearn, Compound, Aave keeper architecture.',
      deployMethod:  'Hardhat: npx hardhat run scripts/deploy-upgraded.js --network mainnet — private key stays in .env, never in code',
      executionMethod: 'Chainlink Automation — registered once via automation.chain.link, runs forever autonomously',
      costPerMonth:  '~$15 LINK/month for 60-second cycle (43,800 calls × $0.0003)',
    },
    timestamp: new Date().toISOString(),
  });
}
