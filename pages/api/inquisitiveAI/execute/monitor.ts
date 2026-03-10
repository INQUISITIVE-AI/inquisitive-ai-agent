import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from '../_brain';
import type { AssetInput, FGIndex } from '../_brain';

// ── Deposit Monitor + Allocation Engine ──────────────────────────────────────
// Watches team wallet for ETH deposits and generates the exact trade plan.
// NO PRIVATE KEY needed — read-only RPC calls only.
// When funds arrive, this drives the Gelato relay execution at /execute/relay.

const TEAM_WALLET  = process.env.DEPLOYER_ADDRESS     || '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';
const VAULT_ADDR   = process.env.INQUISITIVE_VAULT_ADDRESS || '0x506F72eABc90793ae8aC788E650bC9407ED853Fa';
const INQAI_ADDR   = process.env.INQAI_TOKEN_ADDRESS  || '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5';
const USDC_ADDR    = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const MIN_DEPLOY   = 0.005;  // Minimum ETH to trigger deployment ($16 at $3200)
const MAX_TRADE_PCT = 0.02;  // 2% max portfolio risk per trade

const RPC = [
  process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
];

export const config = { maxDuration: 30 };

async function rpc(method: string, params: any[]): Promise<any> {
  for (const url of RPC) {
    try {
      const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(7000),
      });
      const d = await r.json();
      if (d.result !== undefined) return d.result;
    } catch {}
  }
  return null;
}

function hex(addr: string): string {
  return '0x70a08231' + addr.toLowerCase().replace('0x', '').padStart(64, '0');
}
function parse(h: string | null, dec = 18): number {
  if (!h || h === '0x') return 0;
  try { return Number(BigInt(h)) / Math.pow(10, dec); } catch { return 0; }
}

// Known ERC-20 token addresses on Ethereum mainnet for the 65-asset portfolio
const TOKEN_MAP: Record<string, string> = {
  USDC:    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  WETH:    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  WBTC:    '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  UNI:     '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  AAVE:    '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  LINK:    '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  LDO:     '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
  ARB:     '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
  OP:      '0x4200000000000000000000000000000000000042',
  ONDO:    '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3',
  PAXG:    '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
  GRT:     '0xc944E90C64B2c07662A292be6244BDf05Cda44a7',
  FET:     '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85',
  RNDR:    '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24',
  INJ:     '0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30',
  HYPE:    '0x0000000000000000000000000000000000000001', // L2-native, skip
  ENA:     '0x57e114B691Db790C35207b2e685D4A43181e6061',
  TAO:     '0x77E06c9eCCf2E797fd462A92B6D7642EF85b0A44',
  CHZ:     '0x3506424F91fD33084Ec6D1a41A02DaEaA2E4e4E3', // Not exact, skip
  STRK:    '0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766',
  POL:     '0x455e53CBB86018AC2B8092FdCd39d8444aFFC3F6',
};

// Uniswap V3 fee tiers by category
const FEE_TIERS: Record<string, number> = {
  major: 3000, defi: 3000, ai: 3000, l2: 3000,
  rwa: 10000, 'liquid-stake': 500, stablecoin: 500,
  oracle: 3000, interop: 3000, storage: 10000,
  payment: 10000, privacy: 10000, iot: 10000, gaming: 10000,
  data: 3000, institutional: 10000,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ── 1. Read current wallet/vault state ────────────────────────────────
    const [teamEthHex, vaultEthHex, ethPriceRes, cgRes, fgRes] = await Promise.all([
      rpc('eth_getBalance', [TEAM_WALLET, 'latest']),
      rpc('eth_getBalance', [VAULT_ADDR,  'latest']),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', { signal: AbortSignal.timeout(5000) })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=' + ASSET_REGISTRY.map(a => a.cgId).join(',') + '&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=1h,24h,7d',
        { signal: AbortSignal.timeout(12000) }
      ).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('https://api.alternative.me/fng/', { signal: AbortSignal.timeout(5000) })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    const ethPrice   = (ethPriceRes as any)?.ethereum?.usd ?? 3200;
    const teamEth    = parse(teamEthHex,  18);
    const vaultEth   = parse(vaultEthHex, 18);
    const totalEth   = teamEth + vaultEth;
    const aumUSD     = totalEth * ethPrice;

    // ── 2. Parse Fear & Greed ─────────────────────────────────────────────
    let fg: FGIndex | null = null;
    try {
      if ((fgRes as any)?.data?.[0]) {
        fg = { value: parseInt((fgRes as any).data[0].value), valueClassification: (fgRes as any).data[0].value_classification };
      }
    } catch {}

    // ── 3. Build asset inputs map from CoinGecko ──────────────────────────
    const inputMap = new Map<string, AssetInput>();
    for (const coin of (cgRes as any[])) {
      const meta = ASSET_REGISTRY.find(a => a.cgId === coin.id);
      if (!meta) continue;
      inputMap.set(meta.symbol, {
        symbol: meta.symbol, category: meta.category, weight: PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
        stakeable: meta.stakeable, lendable: meta.lendable, yieldable: meta.yieldable,
        priceUsd:  coin.current_price ?? 0,
        change24h: (coin.price_change_percentage_24h ?? 0) / 100,
        change7d:  (coin.price_change_percentage_7d_in_currency ?? 0) / 100,
        volume24h: coin.total_volume ?? 0, marketCap: coin.market_cap ?? 0,
        athChange: (coin.ath_change_percentage ?? 0) / 100,
      });
    }

    const allInputs = ASSET_REGISTRY.map(m => inputMap.get(m.symbol) ?? {
      symbol: m.symbol, category: m.category, weight: PORTFOLIO_WEIGHTS[m.symbol] ?? 0,
      stakeable: m.stakeable, lendable: m.lendable, yieldable: m.yieldable,
      priceUsd: 0, change24h: 0, change7d: 0, volume24h: 0, marketCap: 0, athChange: 0,
    });

    const btcIn  = inputMap.get('BTC');
    const ethIn  = inputMap.get('ETH');
    const regime = getRegime((btcIn?.change24h ?? 0) * 100, (ethIn?.change24h ?? 0) * 100);
    const signals = allInputs.map(inp => scoreAsset(inp, regime, fg, allInputs));

    // ── 4. Build allocation plan ──────────────────────────────────────────
    const weightSum   = Object.values(PORTFOLIO_WEIGHTS).reduce((s, w) => s + w, 0) || 1;
    const deployable  = Math.max(0, teamEth - MIN_DEPLOY); // leave MIN_DEPLOY for gas
    const hasNewFunds = teamEth > MIN_DEPLOY;

    const allocationPlan = ASSET_REGISTRY
      .filter(meta => (PORTFOLIO_WEIGHTS[meta.symbol] ?? 0) > 0)
      .map(meta => {
        const sig       = signals.find(s => s.symbol === meta.symbol)!;
        const weight    = PORTFOLIO_WEIGHTS[meta.symbol] ?? 0;
        const allocPct  = weight / weightSum;
        const targetUSD = aumUSD * allocPct;
        const ethToSpend= deployable * allocPct; // ETH to buy this asset
        const maxEth    = deployable * MAX_TRADE_PCT;
        const actualEth = Math.min(ethToSpend, maxEth); // 2% cap per trade
        const tokenAddr = TOKEN_MAP[meta.symbol];
        const feeTier   = FEE_TIERS[meta.category] ?? 3000;
        const canExecute= hasNewFunds && actualEth >= 0.001 && !!tokenAddr && tokenAddr !== '0x0000000000000000000000000000000000000001';
        return {
          symbol:      meta.symbol,
          name:        meta.name,
          category:    meta.category,
          weight,
          allocPct:    parseFloat((allocPct * 100).toFixed(3)),
          targetUSD:   parseFloat(targetUSD.toFixed(2)),
          ethToSpend:  parseFloat(actualEth.toFixed(6)),
          ethPrice,
          usdValue:    parseFloat((actualEth * ethPrice).toFixed(2)),
          feeTier,
          tokenAddress:tokenAddr || null,
          aiAction:    sig.action,
          confidence:  sig.finalScore,
          priority:    sig.finalScore * (weight / weightSum),
          canExecute,
          // For Gelato relay — pre-computed calldata for buyAsset()
          calldata:    canExecute && tokenAddr
            ? encodeBuyAsset(tokenAddr, actualEth, feeTier, `${sig.action} ${meta.symbol} ${(sig.finalScore*100).toFixed(0)}%`)
            : null,
        };
      })
      .sort((a, b) => b.priority - a.priority);

    // ── 5. Execution readiness ────────────────────────────────────────────
    const readyTrades    = allocationPlan.filter(t => t.canExecute);
    const totalDeployETH = readyTrades.reduce((s, t) => s + t.ethToSpend, 0);
    const buySignals     = signals.filter(s => s.action === 'BUY' || s.action === 'ACCUMULATE').length;
    const sellSignals    = signals.filter(s => s.action === 'SELL' || s.action === 'REDUCE').length;

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    res.status(200).json({
      status: hasNewFunds ? 'READY_TO_DEPLOY' : 'MONITORING',
      wallet: {
        teamAddress:  TEAM_WALLET,
        vaultAddress: VAULT_ADDR,
        teamEth:      parseFloat(teamEth.toFixed(6)),
        vaultEth:     parseFloat(vaultEth.toFixed(6)),
        totalEth:     parseFloat(totalEth.toFixed(6)),
        aumUSD:       parseFloat(aumUSD.toFixed(2)),
        ethPrice,
        hasNewFunds,
        deployableETH: parseFloat(deployable.toFixed(6)),
      },
      market: {
        regime,
        fearGreed:   fg,
        buySignals,
        sellSignals,
        assetsLive:  allInputs.filter(a => a.priceUsd > 0).length,
      },
      allocation: {
        totalTrades:    allocationPlan.length,
        readyTrades:    readyTrades.length,
        totalDeployETH: parseFloat(totalDeployETH.toFixed(6)),
        totalDeployUSD: parseFloat((totalDeployETH * ethPrice).toFixed(2)),
        plan:           allocationPlan,
      },
      gelatoReady: !!process.env.GELATO_API_KEY,
      timestamp:   new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Monitor error:', err);
    res.status(500).json({ error: 'Monitor failed', details: err.message });
  }
}

// ── ABI encode buyAsset(address,uint256,uint256,uint24,string) ────────────────
function encodeBuyAsset(tokenOut: string, ethAmount: number, fee: number, label: string): string {
  // Function selector: keccak256("buyAsset(address,uint256,uint256,uint24,string)")[:4]
  const selector = '0x6c3c36f3';
  const paddedToken   = tokenOut.toLowerCase().replace('0x','').padStart(64,'0');
  const weiAmount     = BigInt(Math.floor(ethAmount * 1e18)).toString(16).padStart(64,'0');
  const minOut        = '0'.padStart(64,'0');
  const feePadded     = fee.toString(16).padStart(64,'0');
  const labelOffset   = '00000000000000000000000000000000000000000000000000000000000000a0';
  const labelBytes    = Buffer.from(label, 'utf8');
  const labelLen      = labelBytes.length.toString(16).padStart(64,'0');
  const labelHex      = labelBytes.toString('hex').padEnd(Math.ceil(labelBytes.length/32)*64, '0');
  return selector + paddedToken + weiAmount + minOut + feePadded + labelOffset + labelLen + labelHex;
}
