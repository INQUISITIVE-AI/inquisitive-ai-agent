// ── INQUISITIVE — Shared On-Chain Cache ──────────────────────────────────────
// Batches all vault + treasury RPC reads into a single Promise.all per cycle.
// Module-level cache persists across warm Vercel invocations of the same route.
// On RPC failure, stale cache is served rather than returning zeros.
// Used by: treasury.ts, nav.ts, positions.ts

const RPC_URLS = [
  ...(process.env.MAINNET_RPC_URL ? [process.env.MAINNET_RPC_URL] : []),
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
];

const VAULT_ADDR    = process.env.INQUISITIVE_VAULT_ADDRESS || '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb';
const INQAI_ADDR    = process.env.INQAI_TOKEN_ADDRESS       || '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5';
const DEPLOYER_ADDR = process.env.DEPLOYER_ADDRESS          || '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';
const USDC_ADDR     = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const SEL_TOTAL_SUPPLY   = '0x18160ddd'; // keccak256("totalSupply()")
const SEL_PORTFOLIO_LEN  = '0xe6f713d5'; // keccak256("getPortfolioLength()")
const SEL_CYCLE_COUNT    = '0x316fda0f'; // keccak256("cycleCount()")
const SEL_AUTO_ENABLED   = '0xd966a594'; // keccak256("automationEnabled()")
const SEL_LAST_DEPLOY    = '0x579578e3'; // keccak256("lastDeployTime()")
const SEL_OWNER          = '0x8da5cb5b'; // keccak256("owner()")

function encodeBalanceOf(addr: string): string {
  return '0x70a08231' + addr.toLowerCase().replace('0x', '').padStart(64, '0');
}

export interface OnchainSnapshot {
  vaultEth:           number;
  deployerEth:        number;
  totalEth:           number;
  vaultUsdc:          number;
  deployerUsdc:       number;
  totalUsdc:          number;
  totalSupply:        number;
  deployerInqai:      number;
  vaultInqai:         number;
  circulatingSupply:  number;
  tokensSold:         number;
  portfolioLength:    number;
  portfolioConfigured:boolean;
  cycleCount:         number;
  automationEnabled:  boolean;
  lastDeployTime:     number;
  ownerAddr:          string;
  ts:                 number;
  stale:              boolean;
}

const CACHE_TTL = 2 * 60_000; // 2 minutes — balances only change after a tx

let _cache: OnchainSnapshot | null = null;

function parseHex(hex: string | null, decimals = 18): number {
  if (!hex || hex === '0x' || hex === '0x0') return 0;
  try { return Number(BigInt(hex)) / Math.pow(10, decimals); } catch { return 0; }
}

async function rpcOne(method: string, params: any[], timeout = 6000): Promise<string | null> {
  for (const url of RPC_URLS) {
    try {
      const r = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal:  AbortSignal.timeout(timeout),
      });
      if (!r.ok) continue;
      const d = await r.json();
      if (d.result !== undefined && d.result !== null) return d.result as string;
    } catch {}
  }
  return null;
}

async function fetchOnchain(): Promise<OnchainSnapshot> {
  const [
    vaultEthHex,
    deployerEthHex,
    totalSupplyHex,
    deployerInqaiHex,
    vaultInqaiHex,
    deployerUsdcHex,
    vaultUsdcHex,
    portfolioLenHex,
    cycleCountHex,
    autoEnabledHex,
    lastDeployHex,
    ownerHex,
  ] = await Promise.all([
    rpcOne('eth_getBalance', [VAULT_ADDR,    'latest']),
    rpcOne('eth_getBalance', [DEPLOYER_ADDR, 'latest']),
    rpcOne('eth_call', [{ to: INQAI_ADDR, data: SEL_TOTAL_SUPPLY },              'latest']),
    rpcOne('eth_call', [{ to: INQAI_ADDR, data: encodeBalanceOf(DEPLOYER_ADDR) },'latest']),
    rpcOne('eth_call', [{ to: INQAI_ADDR, data: encodeBalanceOf(VAULT_ADDR) },   'latest']),
    rpcOne('eth_call', [{ to: USDC_ADDR,  data: encodeBalanceOf(DEPLOYER_ADDR) },'latest']),
    rpcOne('eth_call', [{ to: USDC_ADDR,  data: encodeBalanceOf(VAULT_ADDR) },   'latest']),
    rpcOne('eth_call', [{ to: VAULT_ADDR, data: SEL_PORTFOLIO_LEN },             'latest']),
    rpcOne('eth_call', [{ to: VAULT_ADDR, data: SEL_CYCLE_COUNT },               'latest']),
    rpcOne('eth_call', [{ to: VAULT_ADDR, data: SEL_AUTO_ENABLED },              'latest']),
    rpcOne('eth_call', [{ to: VAULT_ADDR, data: SEL_LAST_DEPLOY },               'latest']),
    rpcOne('eth_call', [{ to: VAULT_ADDR, data: SEL_OWNER },                     'latest']),
  ]);

  const vaultEth      = parseHex(vaultEthHex,      18);
  const deployerEth   = parseHex(deployerEthHex,   18);
  const totalSupply   = parseHex(totalSupplyHex,   18) || 100_000_000;
  const deployerInqai = parseHex(deployerInqaiHex, 18);
  const vaultInqai    = parseHex(vaultInqaiHex,    18);
  const deployerUsdc  = parseHex(deployerUsdcHex,   6);
  const vaultUsdc     = parseHex(vaultUsdcHex,      6);
  const portfolioLength    = portfolioLenHex && portfolioLenHex !== '0x' ? parseInt(portfolioLenHex, 16) : 0;
  const cycleCount          = cycleCountHex   && cycleCountHex   !== '0x' ? parseInt(cycleCountHex, 16) : 0;
  const automationEnabled   = !!(autoEnabledHex && autoEnabledHex !== '0x' && BigInt(autoEnabledHex) !== 0n);
  const lastDeployTime      = lastDeployHex   && lastDeployHex   !== '0x' ? parseInt(lastDeployHex, 16) : 0;
  const ownerAddr           = ownerHex && ownerHex.length >= 42 ? '0x' + ownerHex.slice(-40) : '';
  const circulatingSupply   = Math.max(0, totalSupply - deployerInqai);

  return {
    vaultEth,
    deployerEth,
    totalEth:           vaultEth + deployerEth,
    vaultUsdc,
    deployerUsdc,
    totalUsdc:          vaultUsdc + deployerUsdc,
    totalSupply,
    deployerInqai,
    vaultInqai,
    circulatingSupply,
    tokensSold:         circulatingSupply,
    portfolioLength,
    portfolioConfigured: portfolioLength > 0,
    cycleCount,
    automationEnabled,
    lastDeployTime,
    ownerAddr,
    ts:                 Date.now(),
    stale:              false,
  };
}

export async function getOnchain(): Promise<OnchainSnapshot> {
  // Serve from fresh cache
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return _cache;
  }

  try {
    const snap = await fetchOnchain();

    // Only cache if we got at least one meaningful value (vaultEth or deployerInqai)
    // Guards against a full-RPC-outage replacing good cache with all-zeros
    if (snap.vaultEth > 0 || snap.deployerEth > 0 || snap.totalSupply > 0) {
      _cache = snap;
      return snap;
    }

    // RPC returned all zeros — serve stale cache if available
    if (_cache) {
      console.warn('[onchainCache] All-zero RPC response — serving stale cache');
      return { ..._cache, stale: true };
    }

    return snap; // first-ever request, nothing to fall back to
  } catch (e: any) {
    console.warn('[onchainCache] RPC fetch failed:', e.message);
    if (_cache) return { ..._cache, stale: true };
    // Absolute fallback — zeroed snapshot so callers never crash
    return {
      vaultEth: 0, deployerEth: 0, totalEth: 0,
      vaultUsdc: 0, deployerUsdc: 0, totalUsdc: 0,
      totalSupply: 100_000_000, deployerInqai: 0, vaultInqai: 0,
      circulatingSupply: 0, tokensSold: 0,
      portfolioLength: 0, portfolioConfigured: false,
      cycleCount: 0, automationEnabled: false, lastDeployTime: 0, ownerAddr: '',
      ts: Date.now(), stale: true,
    };
  }
}

// Convenience — same constants re-exported so callers don't need their own copies
export { VAULT_ADDR, INQAI_ADDR, DEPLOYER_ADDR, USDC_ADDR };
