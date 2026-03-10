import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from '../_brain';
import type { AssetInput, FGIndex } from '../_brain';

// ── 65-Asset Execution Monitor ────────────────────────────────────────────────
// ALL 65 assets are scored with live NATIVE prices every cycle.
// NO proxy mapping — SOL is priced as SOL, BNB as BNB, etc.
// Execution modes:
//   ETH-DIRECT : Buy on Ethereum mainnet via Uniswap V3 + Aave V3 + Lido (22 assets)
//   BRIDGE     : Bridge ETH to native chain via deBridge DLN then buy native (43 assets)
// deBridge DLN on-chain address: 0xeF4fB24aD0916217251F553c0596F8Edc630EB66
// Chainlink Automation triggers performUpkeep() — zero private keys.

const TEAM_WALLET   = process.env.DEPLOYER_ADDRESS         || '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';
const VAULT_ADDR    = process.env.INQUISITIVE_VAULT_ADDRESS || '0x506F72eABc90793ae8aC788E650bC9407ED853Fa';
const MIN_DEPLOY    = 0.005;
const MAX_TRADE_PCT = 0.02;

const RPC_URLS = [
  process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
];

export const config = { maxDuration: 30 };

// ── 22 verified ETH mainnet ERC-20s — direct Uniswap V3 execution ──────────
export const ETH_NATIVE_TOKENS: Record<string, { address: string; fee: number }> = {
  BTC:  { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', fee: 3000 }, // WBTC
  ETH:  { address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', fee: 500  }, // wstETH
  USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', fee: 500  },
  AAVE: { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', fee: 3000 },
  UNI:  { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', fee: 3000 },
  LINK: { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', fee: 3000 },
  LDO:  { address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', fee: 3000 },
  ARB:  { address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1', fee: 3000 },
  GRT:  { address: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7', fee: 3000 },
  ENA:  { address: '0x57e114B691Db790C35207b2e685D4A43181e6061', fee: 3000 },
  POL:  { address: '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6', fee: 3000 },
  SKY:  { address: '0x56072C95FAA701256059aa122697B133aDEd9279', fee: 3000 },
  FET:  { address: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85', fee: 3000 }, // ASI Alliance
  RNDR: { address: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24', fee: 3000 },
  INJ:  { address: '0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30', fee: 3000 },
  PAXG: { address: '0x45804880De22913dAFE09f4980848ECE6EcbAf78', fee: 3000 },
  ONDO: { address: '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3', fee: 3000 },
  QNT:  { address: '0x4a220E6096B25EADb88358cb44068A3248254675', fee: 3000 },
  ZRO:  { address: '0x6985884C4392D348587B19cb9eAAf157F13271cD', fee: 3000 },
  CHZ:  { address: '0x3506424F91fD33084466F402d5D97f05F8e3b4AF', fee: 3000 },
  ACH:  { address: '0x4e15361FD6b4BB609Fa63C81A2be19d873717870', fee: 3000 },
  STRK: { address: '0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766', fee: 3000 },
};

// ── Native chain registry for all 65 assets — NO PROXY ─────────────────────
// Each asset executes on its OWN native chain at its OWN native price.
// ETH-DIRECT: Ethereum vault → Uniswap V3 swap (instant, Chainlink-triggered)
// BRIDGE    : Ethereum vault → deBridge DLN on-chain contract → native chain DEX
//             deBridge DLN: 0xeF4fB24aD0916217251F553c0596F8Edc630EB66 (no key needed)
export const ASSET_CHAIN: Record<string, { chain: string; chainId: number; protocol: string; mode: 'ETH-DIRECT' | 'BRIDGE' }> = {
  // ── 22 ETH Mainnet — Uniswap V3 direct swap ─────────────────────────────
  BTC:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3 (WBTC)',   mode:'ETH-DIRECT' },
  ETH:    { chain:'Ethereum',    chainId:1,        protocol:'Lido + Aave V3',      mode:'ETH-DIRECT' },
  USDC:   { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  AAVE:   { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  UNI:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  LINK:   { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  LDO:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  ARB:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  GRT:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  ENA:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  POL:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  SKY:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  FET:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3 (ASI)',    mode:'ETH-DIRECT' },
  RNDR:   { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  INJ:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  PAXG:   { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3 (Gold)',   mode:'ETH-DIRECT' },
  ONDO:   { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3 (RWA)',    mode:'ETH-DIRECT' },
  QNT:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  ZRO:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  CHZ:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  ACH:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  STRK:   { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  // ── 43 Cross-chain — deBridge DLN bridge + native DEX ───────────────────
  SOL:    { chain:'Solana',      chainId:7565164,  protocol:'deBridge → Jupiter',  mode:'BRIDGE' },
  JITOSOL:{ chain:'Solana',      chainId:7565164,  protocol:'deBridge → Jito',     mode:'BRIDGE' },
  JUPSOL: { chain:'Solana',      chainId:7565164,  protocol:'deBridge → Jupiter',  mode:'BRIDGE' },
  INF:    { chain:'Solana',      chainId:7565164,  protocol:'deBridge → Sanctum',  mode:'BRIDGE' },
  JUP:    { chain:'Solana',      chainId:7565164,  protocol:'deBridge → Jupiter',  mode:'BRIDGE' },
  BNB:    { chain:'BNB Chain',   chainId:56,       protocol:'deBridge → PancakeSwap',mode:'BRIDGE' },
  XRP:    { chain:'XRP Ledger',  chainId:0,        protocol:'deBridge → XRPL DEX', mode:'BRIDGE' },
  ADA:    { chain:'Cardano',     chainId:0,        protocol:'deBridge → Minswap',  mode:'BRIDGE' },
  TRX:    { chain:'TRON',        chainId:728126428,protocol:'deBridge → SunSwap',  mode:'BRIDGE' },
  AVAX:   { chain:'Avalanche',   chainId:43114,    protocol:'deBridge → Trader Joe',mode:'BRIDGE' },
  SUI:    { chain:'Sui',         chainId:101,      protocol:'deBridge → Cetus',    mode:'BRIDGE' },
  DOT:    { chain:'Polkadot',    chainId:0,        protocol:'deBridge → HydraDX',  mode:'BRIDGE' },
  NEAR:   { chain:'NEAR',        chainId:0,        protocol:'deBridge → Ref Finance',mode:'BRIDGE' },
  ICP:    { chain:'ICP',         chainId:0,        protocol:'deBridge → ICPSwap',  mode:'BRIDGE' },
  ATOM:   { chain:'Cosmos',      chainId:0,        protocol:'deBridge → Osmosis',  mode:'BRIDGE' },
  XDC:    { chain:'XDC Network', chainId:50,       protocol:'deBridge → XSwap',    mode:'BRIDGE' },
  OP:     { chain:'Optimism',    chainId:10,       protocol:'deBridge → Velodrome', mode:'BRIDGE' },
  HYPE:   { chain:'HyperEVM',    chainId:999,      protocol:'deBridge → HLP DEX',  mode:'BRIDGE' },
  LTC:    { chain:'Litecoin',    chainId:0,        protocol:'deBridge → DEX',      mode:'BRIDGE' },
  BCH:    { chain:'Bitcoin Cash',chainId:0,        protocol:'deBridge → DEX',      mode:'BRIDGE' },
  XMR:    { chain:'Monero',      chainId:0,        protocol:'deBridge → DEX',      mode:'BRIDGE' },
  ZEC:    { chain:'Zcash',       chainId:0,        protocol:'deBridge → DEX',      mode:'BRIDGE' },
  NIGHT:  { chain:'Midnight',    chainId:0,        protocol:'deBridge → DEX',      mode:'BRIDGE' },
  HBAR:   { chain:'Hedera',      chainId:295,      protocol:'deBridge → HeliSwap', mode:'BRIDGE' },
  VET:    { chain:'VeChain',     chainId:74,       protocol:'deBridge → VeSwap',   mode:'BRIDGE' },
  XTZ:    { chain:'Tezos',       chainId:0,        protocol:'deBridge → Plenty',   mode:'BRIDGE' },
  ETC:    { chain:'Eth Classic', chainId:61,       protocol:'deBridge → Uniswap',  mode:'BRIDGE' },
  FIL:    { chain:'Filecoin',    chainId:314,      protocol:'deBridge → DEX',      mode:'BRIDGE' },
  AR:     { chain:'Arweave',     chainId:0,        protocol:'deBridge → Permaswap',mode:'BRIDGE' },
  HNT:    { chain:'Helium',      chainId:0,        protocol:'deBridge → DEX',      mode:'BRIDGE' },
  ALGO:   { chain:'Algorand',    chainId:0,        protocol:'deBridge → Tinyman',  mode:'BRIDGE' },
  XLM:    { chain:'Stellar',     chainId:0,        protocol:'deBridge → StellarDEX',mode:'BRIDGE' },
  CC:     { chain:'Canton',      chainId:0,        protocol:'deBridge → DEX',      mode:'BRIDGE' },
  XCN:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  DBR:    { chain:'Multi-chain', chainId:0,        protocol:'deBridge native',     mode:'BRIDGE' },
  SOIL:   { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  BRZ:    { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  JPYC:   { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  CNGN:   { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  XSGD:   { chain:'Ethereum',    chainId:1,        protocol:'Uniswap V3',          mode:'ETH-DIRECT' },
  TAO:    { chain:'Bittensor',   chainId:0,        protocol:'deBridge → DEX',      mode:'BRIDGE' },
  EOS:    { chain:'Antelope',    chainId:0,        protocol:'deBridge → DEX',      mode:'BRIDGE' },
  HONEY:  { chain:'Solana',      chainId:7565164,  protocol:'deBridge → Orca',     mode:'BRIDGE' },
};

async function rpc(method: string, params: any[]): Promise<any> {
  for (const url of RPC_URLS) {
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

function parse(h: string | null, dec = 18): number {
  if (!h || h === '0x') return 0;
  try { return Number(BigInt(h)) / Math.pow(10, dec); } catch { return 0; }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ── 1. On-chain balances + market data (parallel) ─────────────────────
    const cgIds = ASSET_REGISTRY.map(a => a.cgId).join(',');
    const [teamEthHex, vaultEthHex, ethPriceRes, cgRes, fgRes] = await Promise.all([
      rpc('eth_getBalance', [TEAM_WALLET, 'latest']),
      rpc('eth_getBalance', [VAULT_ADDR,  'latest']),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', { signal: AbortSignal.timeout(5000) })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${cgIds}&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=1h,24h,7d`,
        { signal: AbortSignal.timeout(12000) }
      ).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('https://api.alternative.me/fng/', { signal: AbortSignal.timeout(5000) })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    const ethPrice = (ethPriceRes as any)?.ethereum?.usd ?? 3200;
    const teamEth  = parse(teamEthHex,  18);
    const vaultEth = parse(vaultEthHex, 18);
    const totalEth = teamEth + vaultEth;
    const aumUSD   = totalEth * ethPrice;

    // ── 2. Fear & Greed ───────────────────────────────────────────────────
    let fg: FGIndex | null = null;
    try {
      if ((fgRes as any)?.data?.[0]) {
        fg = { value: parseInt((fgRes as any).data[0].value), valueClassification: (fgRes as any).data[0].value_classification };
      }
    } catch {}

    // ── 3. Build asset inputs (all 65) ────────────────────────────────────
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

    // ── 4. Score ALL 65 assets ────────────────────────────────────────────
    const signals = allInputs.map(inp => scoreAsset(inp, regime, fg, allInputs));

    // ── 5. Build full 65-asset allocation plan ────────────────────────────
    const weightSum  = Object.values(PORTFOLIO_WEIGHTS).reduce((s, w) => s + w, 0) || 1;
    const deployable = Math.max(0, vaultEth - MIN_DEPLOY);
    const hasNewFunds= vaultEth > MIN_DEPLOY;

    const allocationPlan = ASSET_REGISTRY
      .filter(meta => (PORTFOLIO_WEIGHTS[meta.symbol] ?? 0) > 0)
      .map(meta => {
        const sig        = signals.find(s => s.symbol === meta.symbol)!;
        const weight     = PORTFOLIO_WEIGHTS[meta.symbol] ?? 0;
        const chainInfo  = ASSET_CHAIN[meta.symbol] ?? { chain:'Unknown', chainId:0, protocol:'Unknown', mode:'BRIDGE' as const };
        const isEthDirect = chainInfo.mode === 'ETH-DIRECT';
        const tokenInfo  = isEthDirect ? ETH_NATIVE_TOKENS[meta.symbol] : null;
        const allocPct   = weight / weightSum;
        const targetUSD  = aumUSD * allocPct;
        const ethToSpend = deployable * allocPct;
        const actualEth  = Math.min(ethToSpend, deployable * MAX_TRADE_PCT);
        const canExecute = hasNewFunds && actualEth >= 0.001 && isEthDirect && !!tokenInfo;
        return {
          symbol:         meta.symbol,
          name:           meta.name,
          category:       meta.category,
          weight,
          allocPct:       parseFloat((allocPct * 100).toFixed(3)),
          targetUSD:      parseFloat(targetUSD.toFixed(2)),
          usdValue:       parseFloat((actualEth * ethPrice).toFixed(2)),
          ethToSpend:     parseFloat(actualEth.toFixed(6)),
          ethPrice,
          executionMode:  chainInfo.mode,
          nativeChain:    chainInfo.chain,
          chainId:        chainInfo.chainId,
          bridgeProtocol: chainInfo.protocol,
          execTokenAddr:  tokenInfo?.address ?? null,
          feeTier:        tokenInfo?.fee ?? 3000,
          canExecute,
          aiAction:       sig.action,
          confidence:     sig.finalScore,
          priority:       sig.finalScore * (weight / weightSum),
          calldata: canExecute && tokenInfo
            ? encodeBuyAsset(tokenInfo.address, actualEth, tokenInfo.fee, `${sig.action} ${meta.symbol} ${(sig.finalScore*100).toFixed(0)}%`)
            : null,
        };
      })
      .sort((a, b) => b.priority - a.priority);

    // ── 6. Execution summary ──────────────────────────────────────────────
    const ethDirectAssets = allocationPlan.filter(t => t.executionMode === 'ETH-DIRECT');
    const bridgeAssets    = allocationPlan.filter(t => t.executionMode === 'BRIDGE');
    const readyTrades     = allocationPlan.filter(t => t.canExecute);
    const totalDeployETH  = readyTrades.reduce((s, t) => s + t.ethToSpend, 0);
    const buySignals      = signals.filter(s => s.action === 'BUY' || s.action === 'ACCUMULATE').length;
    const sellSignals     = signals.filter(s => s.action === 'SELL' || s.action === 'REDUCE').length;

    // ETH-native on-chain weights for vault.setPortfolio() — re-normalized to 10000 bps
    const ethNativeRawSum = ethDirectAssets.reduce((s, t) => s + t.weight, 0) || 1;
    let bpsRunning = 0;
    const onChainWeights = ethDirectAssets
      .sort((a, b) => b.weight - a.weight)
      .map((t, i, arr) => {
        const bps = i < arr.length - 1
          ? Math.floor((t.weight / ethNativeRawSum) * 10000)
          : 10000 - bpsRunning;
        bpsRunning += bps;
        return { symbol: t.symbol, address: ETH_NATIVE_TOKENS[t.symbol]?.address ?? '', fee: ETH_NATIVE_TOKENS[t.symbol]?.fee ?? 3000, weightBps: bps, weightPct: parseFloat((t.weight / ethNativeRawSum * 100).toFixed(2)) };
      });

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    res.status(200).json({
      status: hasNewFunds ? 'READY_TO_DEPLOY' : 'MONITORING',
      architecture: {
        totalAssets:   allocationPlan.length,
        ethDirect:     ethDirectAssets.length,
        bridge:        bridgeAssets.length,
        description:   `${ethDirectAssets.length} assets execute on Ethereum via Uniswap V3 + Aave V3 + Lido. ${bridgeAssets.length} assets execute on their native chains via deBridge DLN. All 65 priced natively — zero proxy.`,
      },
      wallet: {
        teamAddress:   TEAM_WALLET,
        vaultAddress:  VAULT_ADDR,
        teamEth:       parseFloat(teamEth.toFixed(6)),
        vaultEth:      parseFloat(vaultEth.toFixed(6)),
        totalEth:      parseFloat(totalEth.toFixed(6)),
        aumUSD:        parseFloat(aumUSD.toFixed(2)),
        ethPrice,
        hasNewFunds,
        deployableETH: parseFloat(deployable.toFixed(6)),
      },
      market: { regime, fearGreed: fg, buySignals, sellSignals, assetsLive: allInputs.filter(a => a.priceUsd > 0).length },
      allocation: {
        totalTrades:    allocationPlan.length,
        readyTrades:    readyTrades.length,
        totalDeployETH: parseFloat(totalDeployETH.toFixed(6)),
        totalDeployUSD: parseFloat((totalDeployETH * ethPrice).toFixed(2)),
        plan:           allocationPlan,
        onChainWeights,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Monitor error:', err);
    res.status(500).json({ error: 'Monitor failed', details: err.message });
  }
}


// ── ABI encode buyAsset(address,uint256,uint256,uint24,string) ────────────────
function encodeBuyAsset(tokenOut: string, ethAmount: number, fee: number, label: string): string {
  const selector    = '0x6c3c36f3';
  const paddedToken = tokenOut.toLowerCase().replace('0x','').padStart(64,'0');
  const weiAmount   = BigInt(Math.floor(ethAmount * 1e18)).toString(16).padStart(64,'0');
  const minOut      = '0'.padStart(64,'0');
  const feePadded   = fee.toString(16).padStart(64,'0');
  const labelOffset = '00000000000000000000000000000000000000000000000000000000000000a0';
  const labelBytes  = Buffer.from(label, 'utf8');
  const labelLen    = labelBytes.length.toString(16).padStart(64,'0');
  const labelHex    = labelBytes.toString('hex').padEnd(Math.ceil(labelBytes.length/32)*64, '0');
  return selector + paddedToken + weiAmount + minOut + feePadded + labelOffset + labelLen + labelHex;
}
