import type { NextApiRequest, NextApiResponse } from 'next';

// ── INQAI Vesting Status ──────────────────────────────────────────────────────
// Reads on-chain vesting state.
// TeamVesting uses OZ VestingWallet: 3-month cliff, 36-month linear vesting.
// If vesting contract not yet deployed, returns accurate "not started" status.

const RPC_URLS = [
  ...(process.env.MAINNET_RPC_URL ? [process.env.MAINNET_RPC_URL] : []),
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
];

const INQAI_ADDR    = process.env.INQAI_TOKEN_ADDRESS  || '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5';
const DEPLOYER_ADDR = process.env.DEPLOYER_ADDRESS     || '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';

// Vesting contract address — set after deployment
const VESTING_ADDR  = process.env.TEAM_VESTING_ADDRESS || '';

// Team allocation: 20M INQAI (20% of supply)
const TEAM_ALLOCATION = 20_000_000;
const TOTAL_SUPPLY    = parseInt(process.env.NEXT_PUBLIC_TOTAL_SUPPLY || '100000000');

// Vesting schedule: 3-month cliff, then 33 months linear
const CLIFF_MONTHS   = 3;
const TOTAL_MONTHS   = 36;
const PRESALE_PRICE  = parseFloat(process.env.NEXT_PUBLIC_PRESALE_PRICE || '8');

// ERC-20 balanceOf selector
function encodeBalanceOf(addr: string): string {
  return '0x70a08231' + addr.toLowerCase().replace('0x', '').padStart(64, '0');
}

function parseHex(hex: string | null, decimals = 18): number {
  if (!hex || hex === '0x' || hex === '0x0') return 0;
  try { return Number(BigInt(hex)) / Math.pow(10, decimals); } catch { return 0; }
}

async function rpcCall(method: string, params: any[]): Promise<string | null> {
  for (const url of RPC_URLS) {
    try {
      const r = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal:  AbortSignal.timeout(6000),
      });
      if (!r.ok) continue;
      const d = await r.json();
      if (d.result !== undefined && d.result !== null) return d.result as string;
    } catch {}
  }
  return null;
}

export const config = { maxDuration: 20 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const now       = Date.now();
  const nowSec    = Math.floor(now / 1000);

  // ── On-chain reads ────────────────────────────────────────────────────────
  const [deployerBalHex, vestingBalHex] = await Promise.all([
    rpcCall('eth_call', [{ to: INQAI_ADDR, data: encodeBalanceOf(DEPLOYER_ADDR) }, 'latest']),
    VESTING_ADDR
      ? rpcCall('eth_call', [{ to: INQAI_ADDR, data: encodeBalanceOf(VESTING_ADDR) }, 'latest'])
      : Promise.resolve(null),
  ]);

  const deployerBalance = parseHex(deployerBalHex, 18);
  const vestingBalance  = parseHex(vestingBalHex,  18);

  // ── Deployment info ────────────────────────────────────────────────────────
  // Vesting starts when the deployer transfers 20M INQAI to the vesting contract.
  // Until then: vesting not started (deployer still holds team tokens).
  const vestingDeployed = VESTING_ADDR.length > 10;
  const vestingFunded   = vestingBalance >= TEAM_ALLOCATION * 0.99; // allow 1% rounding

  // ── Schedule computation ──────────────────────────────────────────────────
  // Presale launch approximate: March 7, 2026 (deployment block 21993900)
  const presaleLaunchMs  = new Date('2026-03-07T02:56:43Z').getTime();
  const presaleLaunchSec = Math.floor(presaleLaunchMs / 1000);

  // Vesting start = when vesting contract is funded (or presale launch as proxy)
  const vestingStartSec  = vestingFunded
    ? presaleLaunchSec     // would need actual tx timestamp — use presale as proxy
    : 0;

  const cliffEndSec   = vestingStartSec + CLIFF_MONTHS   * 30 * 24 * 3600;
  const vestingEndSec = vestingStartSec + TOTAL_MONTHS   * 30 * 24 * 3600;

  const cliffEndMs    = cliffEndSec   * 1000;
  const vestingEndMs  = vestingEndSec * 1000;

  // ── Vested amount calculation ─────────────────────────────────────────────
  let vestedPct     = 0;
  let vestedTokens  = 0;
  let cliffReached  = false;

  if (vestingFunded && vestingStartSec > 0) {
    const elapsed      = Math.max(0, nowSec - vestingStartSec);
    const cliffSec     = CLIFF_MONTHS * 30 * 24 * 3600;
    const vestDuration = (TOTAL_MONTHS - CLIFF_MONTHS) * 30 * 24 * 3600;

    cliffReached = elapsed >= cliffSec;
    if (cliffReached) {
      const postCliff = elapsed - cliffSec;
      vestedPct       = Math.min(1, postCliff / vestDuration);
      vestedTokens    = TEAM_ALLOCATION * vestedPct;
    }
  }

  // ── Status determination ──────────────────────────────────────────────────
  let status: string;
  let statusLabel: string;
  let color: string;

  if (!vestingDeployed) {
    status      = 'NOT_DEPLOYED';
    statusLabel = 'Pending Deployment';
    color       = '#f59e0b';
  } else if (!vestingFunded) {
    status      = 'DEPLOYED_UNFUNDED';
    statusLabel = 'Deployed — Awaiting Funding';
    color       = '#f97316';
  } else if (!cliffReached) {
    status      = 'CLIFF';
    statusLabel = `Cliff Period (${CLIFF_MONTHS}-month lock)`;
    color       = '#3b82f6';
  } else if (vestedPct >= 1) {
    status      = 'FULLY_VESTED';
    statusLabel = 'Fully Vested';
    color       = '#10b981';
  } else {
    status      = 'VESTING';
    statusLabel = 'Actively Vesting';
    color       = '#a78bfa';
  }

  const timeToCliffMs = cliffEndMs > now ? cliffEndMs - now : 0;
  const cliffDays     = Math.ceil(timeToCliffMs / (24 * 3600 * 1000));

  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
  res.status(200).json({
    onChain:        true,
    status,
    statusLabel,
    color,
    contract: {
      address:      VESTING_ADDR || null,
      deployed:     vestingDeployed,
      funded:       vestingFunded,
      balance:      vestingBalance,
    },
    team: {
      beneficiary:      DEPLOYER_ADDR,
      totalAllocation:  TEAM_ALLOCATION,
      allocationPct:    parseFloat(((TEAM_ALLOCATION / TOTAL_SUPPLY) * 100).toFixed(1)),
      currentBalance:   deployerBalance,
    },
    schedule: {
      cliffMonths:    CLIFF_MONTHS,
      totalMonths:    TOTAL_MONTHS,
      startDate:      vestingStartSec > 0 ? new Date(vestingStartSec * 1000).toISOString() : null,
      cliffDate:      vestingStartSec > 0 ? new Date(cliffEndMs).toISOString()            : null,
      endDate:        vestingStartSec > 0 ? new Date(vestingEndMs).toISOString()           : null,
      cliffReached,
      daysToCliff:    cliffDays > 0 ? cliffDays : 0,
    },
    vested: {
      tokens:         parseFloat(vestedTokens.toFixed(2)),
      pct:            parseFloat((vestedPct * 100).toFixed(2)),
      usdValue:       parseFloat((vestedTokens * PRESALE_PRICE).toFixed(2)),
      locked:         parseFloat((TEAM_ALLOCATION - vestedTokens).toFixed(2)),
    },
    deploymentSteps: [
      {
        step: 1, done: true,
        title: 'INQAI Token Deployed',
        detail: `ERC-20 contract live at ${INQAI_ADDR}`,
      },
      {
        step: 2, done: vestingDeployed,
        title: 'Vesting Contract Deployed',
        detail: vestingDeployed
          ? `TeamVesting at ${VESTING_ADDR}`
          : 'Deploy SuccessOptimizedVesting.sol via Hardhat or Remix',
      },
      {
        step: 3, done: vestingFunded,
        title: 'Vesting Contract Funded',
        detail: vestingFunded
          ? `${TEAM_ALLOCATION.toLocaleString()} INQAI transferred to vesting contract`
          : `Transfer ${TEAM_ALLOCATION.toLocaleString()} INQAI from deployer to vesting contract`,
      },
      {
        step: 4, done: cliffReached,
        title: '3-Month Cliff Reached',
        detail: cliffReached
          ? 'Cliff period complete — linear vesting has begun'
          : `${cliffDays > 0 ? cliffDays + ' days remaining until cliff' : 'Deploy and fund contract to start cliff timer'}`,
      },
    ],
    timestamp: new Date().toISOString(),
  });
}
