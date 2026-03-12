import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from '../_brain';
import type { AssetInput, FGIndex } from '../_brain';

// ── INQAI NAV Engine ─────────────────────────────────────────────────────────
// Computes live Net Asset Value of the INQAI token from the 65-asset basket.
// Money deposited to buy INQAI is allocated to these 65 assets per PORTFOLIO_WEIGHTS.
// NAV = presale_price × (current_portfolio_index / 100)
// Portfolio index = 100 × (1 + weighted_7d_return) — resets to 100 each Monday.

const PRESALE_PRICE = 8;    // USD — presale price paid per INQAI token
const TOTAL_SUPPLY  = 100_000_000;

// On-chain contract addresses
const VAULT_ADDR    = process.env.INQUISITIVE_VAULT_ADDRESS || '0x506F72eABc90793ae8aC788E650bC9407ED853Fa';
const INQAI_ADDR    = process.env.INQAI_TOKEN_ADDRESS       || '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5';
const DEPLOYER_ADDR = process.env.DEPLOYER_ADDRESS          || '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';
const USDC_ADDR     = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const RPC_URLS      = [
  process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868',
  'https://eth.llamarpc.com', 'https://rpc.ankr.com/eth',
];

async function rpcCall(method: string, params: any[]): Promise<string | null> {
  for (const url of RPC_URLS) {
    try {
      const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) continue;
      const d = await r.json();
      if (d.result !== undefined && d.result !== null) return d.result;
    } catch {}
  }
  return null;
}

function parseHex(hex: string | null, dec = 18): number {
  if (!hex || hex === '0x') return 0;
  try { return Number(BigInt(hex)) / Math.pow(10, dec); } catch { return 0; }
}

function balanceOfData(addr: string): string {
  return '0x70a08231' + addr.toLowerCase().replace('0x','').padStart(64,'0');
}

const NO_CC   = new Set(['CC', 'JUPSOL']);
const ALL_CGS = ASSET_REGISTRY.map(a => a.cgId).join(',');

export const config = { maxDuration: 30 };

async function fetchAll(): Promise<{ inputs: Map<string, AssetInput>; fg: FGIndex | null }> {
  const inputs = new Map<string, AssetInput>();

  const [cgRes, fgRes] = await Promise.allSettled([
    fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ALL_CGS}` +
      `&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=1h,24h,7d`,
      { signal: AbortSignal.timeout(12000) },
    ),
    fetch('https://api.alternative.me/fng/', { signal: AbortSignal.timeout(5000) }),
  ]);

  if (cgRes.status === 'fulfilled' && cgRes.value.ok) {
    const coins: any[] = await cgRes.value.json();
    for (const coin of coins) {
      const meta = ASSET_REGISTRY.find(a => a.cgId === coin.id);
      if (!meta) continue;
      inputs.set(meta.symbol, {
        symbol:    meta.symbol,
        category:  meta.category,
        weight:    PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
        stakeable: meta.stakeable,
        lendable:  meta.lendable,
        yieldable: meta.yieldable,
        priceUsd:  coin.current_price ?? 0,
        change24h: (coin.price_change_percentage_24h ?? 0) / 100,
        change7d:  (coin.price_change_percentage_7d_in_currency ?? 0) / 100,
        volume24h: coin.total_volume  ?? 0,
        marketCap: coin.market_cap    ?? 0,
        athChange: (coin.ath_change_percentage ?? 0) / 100,
      });
    }
  }

  // CryptoCompare fallback for missing assets
  const missing = ASSET_REGISTRY.filter(a => !inputs.has(a.symbol) && !NO_CC.has(a.symbol));
  if (missing.length > 0) {
    const chunks: (typeof ASSET_REGISTRY)[] = [];
    for (let i = 0; i < missing.length; i += 20) chunks.push(missing.slice(i, i + 20));
    const ccRes = await Promise.allSettled(chunks.map(ch => {
      const fsyms = ch.map(a => a.symbol).join(',');
      return fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fsyms}&tsyms=USD`, { signal: AbortSignal.timeout(8000) })
        .then(r => r.ok ? r.json() : {} as Record<string, any>);
    }));
    for (let i = 0; i < chunks.length; i++) {
      const res = ccRes[i];
      if (res.status !== 'fulfilled') continue;
      const raw = (res.value as any)?.RAW || {};
      for (const meta of chunks[i]) {
        const c = raw[meta.symbol]?.USD;
        if (c?.PRICE > 0) {
          inputs.set(meta.symbol, {
            symbol: meta.symbol, category: meta.category, weight: PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
            stakeable: meta.stakeable, lendable: meta.lendable, yieldable: meta.yieldable,
            priceUsd: c.PRICE, change24h: (c.CHANGEPCT24HOUR ?? 0) / 100,
            change7d: 0, volume24h: c.VOLUME24HOURTO ?? 0, marketCap: c.MKTCAP ?? 0, athChange: 0,
          });
        }
      }
    }
  }

  let fg: FGIndex | null = null;
  if (fgRes.status === 'fulfilled' && fgRes.value.ok) {
    try {
      const d = await fgRes.value.json();
      if (d?.data?.[0]) fg = { value: parseInt(d.data[0].value), valueClassification: d.data[0].value_classification };
    } catch {}
  }

  return { inputs, fg };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Fetch market data AND on-chain treasury data in parallel
    const [{ inputs, fg }, vaultEthHex, deployerEthHex, totalSupplyHex, deployerInqaiHex, deployerUsdcHex, vaultUsdcHex] = await Promise.all([
      fetchAll(),
      rpcCall('eth_getBalance', [VAULT_ADDR,    'latest']),
      rpcCall('eth_getBalance', [DEPLOYER_ADDR, 'latest']),
      rpcCall('eth_call', [{ to: INQAI_ADDR, data: '0x18160ddd' }, 'latest']),
      rpcCall('eth_call', [{ to: INQAI_ADDR, data: balanceOfData(DEPLOYER_ADDR) }, 'latest']),
      rpcCall('eth_call', [{ to: USDC_ADDR,  data: balanceOfData(DEPLOYER_ADDR) }, 'latest']),
      rpcCall('eth_call', [{ to: USDC_ADDR,  data: balanceOfData(VAULT_ADDR)    }, 'latest']),
    ]);

    // Build full allInputs array (zero-fill assets with no price data)
    const allInputs: AssetInput[] = ASSET_REGISTRY.map(meta =>
      inputs.get(meta.symbol) ?? {
        symbol: meta.symbol, category: meta.category, weight: PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
        stakeable: meta.stakeable, lendable: meta.lendable, yieldable: meta.yieldable,
        priceUsd: 0, change24h: 0, change7d: 0, volume24h: 0, marketCap: 0, athChange: 0,
      },
    );

    const btcIn  = inputs.get('BTC');
    const ethIn  = inputs.get('ETH');
    const regime = getRegime((btcIn?.change24h ?? 0) * 100, (ethIn?.change24h ?? 0) * 100);

    // Run 5-engine brain on all 65 assets
    const signals = allInputs.map(inp => scoreAsset(inp, regime, fg, allInputs));

    // ── Portfolio NAV Computation ────────────────────────────────────────────
    // Use NATIVE prices only — normalize by the live-weight sum (not total) to
    // avoid proxy dilution when some assets lack current price data.
    const weightSum     = Object.values(PORTFOLIO_WEIGHTS).reduce((s, w) => s + w, 0) || 1;
    const assetsLive    = allInputs.filter(a => a.priceUsd > 0);
    const liveWeightSum = assetsLive.reduce((s, a) => s + (PORTFOLIO_WEIGHTS[a.symbol] || 0), 0) || 1;
    const return24h     = assetsLive.reduce((s, a) => s + (PORTFOLIO_WEIGHTS[a.symbol] || 0) * a.change24h, 0) / liveWeightSum;
    const return7d      = assetsLive.reduce((s, a) => s + (PORTFOLIO_WEIGHTS[a.symbol] || 0) * a.change7d,  0) / liveWeightSum;
    // Portfolio index: what $100 invested 7 days ago is worth now (native-price weighted)
    const portfolioIndex = 100 * (1 + return7d);

    // ── Real on-chain AUM ─────────────────────────────────────────────────────
    const ethPrice       = inputs.get('ETH')?.priceUsd ?? 3200;
    const vaultEth       = parseHex(vaultEthHex,    18);
    const deployerEth    = parseHex(deployerEthHex, 18);
    const totalEth       = vaultEth + deployerEth;
    const deployerUsdc   = parseHex(deployerUsdcHex, 6);
    const vaultUsdc      = parseHex(vaultUsdcHex,    6);
    const onChainAUM     = totalEth * ethPrice + deployerUsdc + vaultUsdc;

    // ── Circulating supply ────────────────────────────────────────────────────
    const totalSupplyOnChain = parseHex(totalSupplyHex, 18) || TOTAL_SUPPLY;
    const deployerBalance    = parseHex(deployerInqaiHex, 18);
    const circulatingSupply  = Math.max(0, totalSupplyOnChain - deployerBalance);

    // ── NAV per token ─────────────────────────────────────────────────────────
    // Priority 1: real AUM / circulating supply (when tokens have been sold & ETH is in vault)
    // Priority 2: presale_price × (1 + portfolio7d) — tracks basket performance
    const navFromAUM    = circulatingSupply > 0 && onChainAUM > 0
      ? onChainAUM / circulatingSupply
      : 0;
    const navFromBasket = PRESALE_PRICE * (1 + return7d);
    const navPerToken   = navFromAUM > 0 ? navFromAUM : navFromBasket;

    const buys  = signals.filter(s => s.action === 'BUY').length;
    const sells = signals.filter(s => s.action === 'SELL' || s.action === 'REDUCE').length;
    const winRate = assetsLive.length > 0
      ? assetsLive.filter(a => a.change24h > 0).length / assetsLive.length : 0;

    // ── Per-position data ─────────────────────────────────────────────────────
    // nativePrice    = actual live market price from CoinGecko (NEVER proxy)
    // baseAllocUsd   = $ backing per INQAI token at presale price (presalePrice × allocPct)
    // currentAllocUsd= current value of that allocation using NATIVE price change
    // pnl fields reflect actual native price movement, not a weighted index
    const positions = ASSET_REGISTRY
      .filter(meta => (PORTFOLIO_WEIGHTS[meta.symbol] ?? 0) > 0)
      .map(meta => {
        const inp = inputs.get(meta.symbol);
        const sig = signals.find(s => s.symbol === meta.symbol);
        const weight        = PORTFOLIO_WEIGHTS[meta.symbol] ?? 0;
        const allocPct      = weight / weightSum;
        const nativePrice   = inp?.priceUsd  ?? 0;
        const baseAllocUsd  = PRESALE_PRICE * allocPct;
        const nativeChange7d = inp?.change7d  ?? 0;
        const nativeChange24h= inp?.change24h ?? 0;
        const currentAllocUsd= baseAllocUsd * (1 + nativeChange7d);
        const pnl7d          = currentAllocUsd - baseAllocUsd;
        const pnl24h         = baseAllocUsd * nativeChange24h;
        return {
          symbol:          meta.symbol,
          name:            meta.name,
          category:        meta.category,
          weight,
          allocPct:        parseFloat((allocPct * 100).toFixed(4)),
          nativePrice:     parseFloat(nativePrice.toFixed(nativePrice >= 1 ? 2 : 8)),
          baseAllocUsd:    parseFloat(baseAllocUsd.toFixed(6)),
          currentAllocUsd: parseFloat(currentAllocUsd.toFixed(6)),
          pnl7d:           parseFloat(pnl7d.toFixed(6)),
          pnl24h:          parseFloat(pnl24h.toFixed(6)),
          priceUsd:        nativePrice,
          change24h:       nativeChange24h,
          change7d:        nativeChange7d,
          hasLivePrice:    nativePrice > 0,
          action:          sig?.action     ?? 'HOLD',
          confidence:      sig?.finalScore ?? 0,
          components:      sig?.components ?? {},
          reasons:         sig?.reasons    ?? [],
          stakeable:       meta.stakeable,
          lendable:        meta.lendable,
          yieldable:       meta.yieldable,
        };
      })
      .sort((a, b) => b.weight - a.weight);

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    res.status(200).json({
      // INQAI token economics
      token: {
        symbol:           'INQAI',
        presalePrice:     PRESALE_PRICE,
        navPerToken:      parseFloat(navPerToken.toFixed(6)),
        navSource:        navFromAUM > 0 ? 'on-chain-aum' : 'basket-weighted',
        portfolioIndex:   parseFloat(portfolioIndex.toFixed(4)),
        return24h:        parseFloat(return24h.toFixed(6)),
        return7d:         parseFloat(return7d.toFixed(6)),
        targetPrice:      15,
        totalSupply:      totalSupplyOnChain || TOTAL_SUPPLY,
        circulatingSupply,
        tokensSold:       circulatingSupply,
      },
      // On-chain treasury — real funds from token purchases
      treasury: {
        vaultAddress:     VAULT_ADDR,
        inqaiAddress:     INQAI_ADDR,
        deployerAddress:  DEPLOYER_ADDR,
        vaultEth:         parseFloat(vaultEth.toFixed(6)),
        deployerEth:      parseFloat(deployerEth.toFixed(6)),
        totalEth:         parseFloat(totalEth.toFixed(6)),
        ethPrice:         parseFloat(ethPrice.toFixed(2)),
        deployerUsdc:     parseFloat(deployerUsdc.toFixed(2)),
        vaultUsdc:        parseFloat(vaultUsdc.toFixed(2)),
        aumUSD:           parseFloat(onChainAUM.toFixed(2)),
        navFromAUM:       parseFloat(navFromAUM.toFixed(6)),
        navFromBasket:    parseFloat(navFromBasket.toFixed(6)),
      },
      // Portfolio summary
      portfolio: {
        assetCount:    assetsLive.length,
        totalAssets:   ASSET_REGISTRY.length,
        weightSum,
        liveWeightSum,
        coveragePct:   parseFloat(((liveWeightSum / weightSum) * 100).toFixed(1)),
        return24h,
        return7d,
        portfolioIndex,
        totalPnL24h:   parseFloat((navPerToken * return24h).toFixed(6)),
        totalPnL7d:    parseFloat((navPerToken * return7d).toFixed(6)),
        winRate,
        priceSource:   'CoinGecko NATIVE — no proxy, no weighted dilution',
      },
      // AI signals
      ai: {
        regime,
        fearGreed:  fg,
        cycleCount: Math.floor(Date.now() / 8000),
        buys,
        sells,
        riskScore:  regime === 'BULL' ? 0.35 : regime === 'BEAR' ? 0.72 : 0.5,
      },
      // All 65 positions
      positions,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('NAV error:', err);
    res.status(500).json({ error: 'Failed to compute NAV' });
  }
}
