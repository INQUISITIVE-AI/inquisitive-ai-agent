import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from '../_brain';
import type { AssetInput, FGIndex } from '../_brain';

// ── 65-Asset Allocation + Execution Engine ───────────────────────────────────
// ALL 65 portfolio assets are scored and allocated.
// 22 execute DIRECTLY on Ethereum mainnet via Uniswap V3.
// 43 cross-chain assets are PROXIED to their most correlated ETH-native token.
// Zero private keys — read-only on-chain calls only.

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

// ── 22 verified ETH mainnet ERC-20s with Uniswap V3 liquidity ────────────────
export const DIRECT_TOKENS: Record<string, { address: string; fee: number }> = {
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

// ── Proxy map: each cross-chain / off-mainnet asset → correlated ETH-native token
// Rationale: SOL/JITOSOL/JUPSOL/INF → wstETH (both liquid-staked high-perf L1)
//            LTC/BCH/ETC           → WBTC  (BTC-family PoW chains)
//            ZEC/XMR/NIGHT         → PAXG  (store of value / privacy)
//            OP/SUI/AVAX           → ARB   (L1/L2 high-throughput chains)
//            DOT/XDC/ATOM/DBR      → ZRO   (interoperability hubs)
//            BNB/JUP/EOS           → UNI   (DEX / chain ecosystem)
//            ADA/XTZ/HYPE/SOIL     → AAVE  (smart-contract / lending proxy)
//            HBAR                  → LINK  (oracle / enterprise DLT)
//            NEAR/ICP/HNT/VET/FIL/AR/GRT/XCN/HONEY → GRT (data/infra)
//            XRP/XLM/TRX/ALGO/BRZ/JPYC/CNGN/XSGD  → USDC (payment stablecoins)
//            TAO                   → FET   (AI ecosystem proxy)
//            CC                    → QNT   (institutional blockchain proxy)
export const PROXY_MAP: Record<string, string> = {
  // ── Direct (self-maps) ──────────────────────────────────────────────────
  BTC: 'BTC', ETH: 'ETH', USDC: 'USDC', AAVE: 'AAVE', UNI: 'UNI', LINK: 'LINK',
  LDO: 'LDO', ARB: 'ARB', GRT: 'GRT',  ENA: 'ENA',   POL: 'POL',  SKY: 'SKY',
  FET: 'FET', RNDR:'RNDR',INJ: 'INJ',  PAXG:'PAXG',  ONDO:'ONDO', QNT: 'QNT',
  ZRO: 'ZRO', CHZ: 'CHZ', ACH: 'ACH',  STRK:'STRK',
  // ── Cross-chain → ETH-native proxy ─────────────────────────────────────
  SOL:    'ETH',  // Solana → wstETH (high-perf L1 smart contract platform)
  BNB:    'UNI',  // BNB → UNI (DEX/chain ecosystem proxy)
  XRP:    'USDC', // XRP → USDC (payment/settlement layer)
  ADA:    'AAVE', // Cardano → AAVE (DeFi smart contract proxy)
  AVAX:   'ARB',  // Avalanche → ARB (L1/L2 high-performance)
  SUI:    'ARB',  // Sui → ARB (next-gen high-perf chain)
  DOT:    'ZRO',  // Polkadot → ZRO (interoperability hub)
  NEAR:   'GRT',  // NEAR → GRT (infrastructure/data proxy)
  ICP:    'GRT',  // ICP → GRT (decentralised compute/data)
  TRX:    'USDC', // TRON → USDC (DeFi payment network)
  OP:     'ARB',  // Optimism → ARB (L2 ecosystem proxy)
  JUP:    'UNI',  // Jupiter DEX → UNI (DEX aggregator proxy)
  HYPE:   'AAVE', // Hyperliquid → AAVE (DeFi perps protocol)
  XLM:    'USDC', // Stellar → USDC (payment network)
  LTC:    'BTC',  // Litecoin → WBTC (BTC-family)
  BCH:    'BTC',  // Bitcoin Cash → WBTC (BTC fork)
  HBAR:   'LINK', // Hedera → LINK (oracle/enterprise DLT)
  ZEC:    'PAXG', // Zcash → PAXG (store of value / privacy)
  XMR:    'PAXG', // Monero → PAXG (store of value / privacy)
  ETC:    'BTC',  // Ethereum Classic → WBTC (PoW chain)
  XTZ:    'AAVE', // Tezos → AAVE (governance/smart contract)
  HNT:    'GRT',  // Helium → GRT (IoT/data network)
  VET:    'GRT',  // VeChain → GRT (supply chain/data)
  ALGO:   'USDC', // Algorand → USDC (fintech/payment)
  FIL:    'GRT',  // Filecoin → GRT (storage/data)
  AR:     'GRT',  // Arweave → GRT (permanent storage/data)
  XDC:    'ZRO',  // XDC → ZRO (interoperability)
  ATOM:   'ZRO',  // Cosmos → ZRO (IBC interoperability)
  EOS:    'UNI',  // EOS/Vaulta → UNI (smart contract DEX)
  HONEY:  'GRT',  // Hivemapper → GRT (data mapping)
  JITOSOL:'ETH',  // Jito Staked SOL → wstETH (liquid stake)
  JUPSOL: 'ETH',  // Jupiter Staked SOL → wstETH (liquid stake)
  INF:    'ETH',  // Sanctum Infinity → wstETH (staking)
  CC:     'QNT',  // Canton → QNT (institutional blockchain)
  NIGHT:  'PAXG', // Midnight → PAXG (privacy chain proxy)
  XCN:    'GRT',  // Onyxcoin → GRT (data/chain)
  DBR:    'ZRO',  // deBridge → ZRO (cross-chain bridge)
  SOIL:   'AAVE', // Soil → AAVE (lending/yield)
  BRZ:    'USDC', // Brazilian Real → USDC (stablecoin)
  JPYC:   'USDC', // JPYC → USDC (stablecoin)
  CNGN:   'USDC', // Compliant Naira → USDC (stablecoin)
  XSGD:   'USDC', // XSGD → USDC (stablecoin)
  TAO:    'FET',  // Bittensor → FET (AI ecosystem)
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

    // Compute accumulated direct weights (direct weight + all proxy weights absorbed)
    const accumulatedWeight: Record<string, number> = {};
    for (const [sym, w] of Object.entries(PORTFOLIO_WEIGHTS)) {
      const target = PROXY_MAP[sym] ?? sym;
      accumulatedWeight[target] = (accumulatedWeight[target] ?? 0) + w;
    }

    const allocationPlan = ASSET_REGISTRY
      .filter(meta => (PORTFOLIO_WEIGHTS[meta.symbol] ?? 0) > 0)
      .map(meta => {
        const sig         = signals.find(s => s.symbol === meta.symbol)!;
        const weight      = PORTFOLIO_WEIGHTS[meta.symbol] ?? 0;
        const proxyTarget = PROXY_MAP[meta.symbol] ?? meta.symbol;
        const isDirect    = proxyTarget === meta.symbol;
        const tokenInfo   = isDirect ? DIRECT_TOKENS[meta.symbol] : null;
        const execSymbol  = isDirect ? meta.symbol : proxyTarget;
        const execToken   = DIRECT_TOKENS[execSymbol];

        const allocPct    = weight / weightSum;
        const targetUSD   = aumUSD * allocPct;
        const ethToSpend  = deployable * allocPct;
        const maxEth      = deployable * MAX_TRADE_PCT;
        const actualEth   = Math.min(ethToSpend, maxEth);
        const canExecute  = hasNewFunds && actualEth >= 0.001 && !!execToken;

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
          // Execution fields
          executionMode:  isDirect ? 'DIRECT' : 'PROXY',
          proxyTarget:    isDirect ? null : proxyTarget,
          proxyRationale: isDirect ? null : PROXY_RATIONALE[meta.symbol],
          execTokenAddr:  execToken?.address ?? null,
          feeTier:        execToken?.fee ?? 3000,
          canExecute,
          // AI signals
          aiAction:       sig.action,
          confidence:     sig.finalScore,
          priority:       sig.finalScore * (weight / weightSum),
          calldata: canExecute && execToken
            ? encodeBuyAsset(execToken.address, actualEth, execToken.fee, `${sig.action} ${meta.symbol}→${execSymbol} ${(sig.finalScore*100).toFixed(0)}%`)
            : null,
        };
      })
      .sort((a, b) => b.priority - a.priority);

    // ── 6. Execution summary ──────────────────────────────────────────────
    const directAssets  = allocationPlan.filter(t => t.executionMode === 'DIRECT');
    const proxiedAssets = allocationPlan.filter(t => t.executionMode === 'PROXY');
    const readyTrades   = allocationPlan.filter(t => t.canExecute);
    const totalDeployETH= readyTrades.reduce((s, t) => s + t.ethToSpend, 0);
    const buySignals    = signals.filter(s => s.action === 'BUY' || s.action === 'ACCUMULATE').length;
    const sellSignals   = signals.filter(s => s.action === 'SELL' || s.action === 'REDUCE').length;

    // Compute combined on-chain weights for setPortfolio()
    const onChainWeights = Object.entries(accumulatedWeight)
      .filter(([sym]) => DIRECT_TOKENS[sym])
      .sort((a, b) => b[1] - a[1])
      .map(([sym, w]) => ({
        symbol: sym,
        address: DIRECT_TOKENS[sym].address,
        fee: DIRECT_TOKENS[sym].fee,
        combinedWeight: parseFloat(w.toFixed(3)),
        combinedPct: parseFloat((w / weightSum * 100).toFixed(2)),
        represents: Object.entries(PROXY_MAP).filter(([, t]) => t === sym).map(([s]) => s),
      }));

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    res.status(200).json({
      status: hasNewFunds ? 'READY_TO_DEPLOY' : 'MONITORING',
      architecture: {
        totalAssets:    allocationPlan.length,
        directOnChain:  directAssets.length,
        proxied:        proxiedAssets.length,
        description:    `${directAssets.length} assets execute directly on Ethereum mainnet via Uniswap V3. ${proxiedAssets.length} cross-chain assets are proxied to their most correlated ETH-native token. All 65 are scored and allocated by the AI.`,
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

// ── Proxy rationale strings ───────────────────────────────────────────────────
const PROXY_RATIONALE: Record<string, string> = {
  SOL:'L1 smart contract platform → wstETH', BNB:'DEX/chain ecosystem → UNI',
  XRP:'Payment/settlement → USDC', ADA:'Smart contract L1 → AAVE',
  AVAX:'High-perf L1/L2 → ARB', SUI:'Next-gen chain → ARB',
  DOT:'Interoperability hub → ZRO', NEAR:'Infrastructure/data → GRT',
  ICP:'Decentralised compute → GRT', TRX:'DeFi payment → USDC',
  OP:'L2 ecosystem → ARB', JUP:'DEX aggregator → UNI',
  HYPE:'DeFi perps protocol → AAVE', XLM:'Payment network → USDC',
  LTC:'BTC-family PoW → WBTC', BCH:'BTC fork → WBTC',
  HBAR:'Oracle/enterprise DLT → LINK', ZEC:'Store of value/privacy → PAXG',
  XMR:'Monero privacy → PAXG', ETC:'PoW chain → WBTC',
  XTZ:'Governance/smart contract → AAVE', HNT:'IoT/data network → GRT',
  VET:'Supply chain/data → GRT', ALGO:'Fintech/payment → USDC',
  FIL:'Storage/data → GRT', AR:'Permanent storage → GRT',
  XDC:'Interoperability → ZRO', ATOM:'IBC interop hub → ZRO',
  EOS:'Smart contract DEX → UNI', HONEY:'Data mapping → GRT',
  JITOSOL:'Liquid staked SOL → wstETH', JUPSOL:'Liquid staked SOL → wstETH',
  INF:'Staking protocol → wstETH', CC:'Institutional blockchain → QNT',
  NIGHT:'Privacy chain → PAXG', XCN:'Data/chain → GRT',
  DBR:'Cross-chain bridge → ZRO', SOIL:'Lending/yield → AAVE',
  BRZ:'BRL stablecoin → USDC', JPYC:'JPY stablecoin → USDC',
  CNGN:'NGN stablecoin → USDC', XSGD:'SGD stablecoin → USDC',
  TAO:'AI ecosystem token → FET',
};

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
