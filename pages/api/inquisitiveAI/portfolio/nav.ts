import type { NextApiRequest, NextApiResponse } from 'next';
import { getAddress } from 'viem';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from '../_brain';
import type { AssetInput, FGIndex } from '../_brain';
import { getPrices } from '../_priceCache';
import { getOnchain, VAULT_ADDR, INQAI_ADDR, DEPLOYER_ADDR } from '../_onchainCache';

// ── INQAI NAV Engine ─────────────────────────────────────────────────────────
// Computes live Net Asset Value of the INQAI token from the 65-asset basket.
// Money deposited to buy INQAI is allocated to these 65 assets per PORTFOLIO_WEIGHTS.
// NAV = presale_price × (current_portfolio_index / 100)
// Portfolio index = 100 × (1 + weighted_7d_return) — resets to 100 each Monday.

const PRESALE_PRICE = 8;    // USD — presale price paid per INQAI token
const TOTAL_SUPPLY  = 100_000_000;

export const config = { maxDuration: 30 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Fetch prices, on-chain snapshot, and Fear & Greed in parallel
    const [priceResult, snap, fgRaw] = await Promise.all([
      getPrices(),
      getOnchain(),
      fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(8000) })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    const inputs = new Map<string, AssetInput>();
    for (const meta of ASSET_REGISTRY) {
      const p = priceResult.map.get(meta.symbol);
      if (!p) continue;
      inputs.set(meta.symbol, {
        symbol: meta.symbol, category: meta.category, weight: PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
        stakeable: meta.stakeable, lendable: meta.lendable, yieldable: meta.yieldable,
        priceUsd:  p.priceUsd,
        change24h: p.change24h,
        change7d:  p.change7d,
        volume24h: p.volume24h,
        marketCap: p.marketCap,
        athChange: p.athChange,
      });
    }

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

    let fgLive: FGIndex | null = null;
    try {
      if ((fgRaw as any)?.data?.[0]) fgLive = { value: parseInt((fgRaw as any).data[0].value), valueClassification: (fgRaw as any).data[0].value_classification };
    } catch {}

    // Run 5-engine brain on all 65 assets
    const signals = allInputs.map(inp => scoreAsset(inp, regime, fgLive, allInputs));

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

    // ── Real on-chain AUM (from shared cache — never zeros on RPC hiccup) ──────
    const ethPrice       = inputs.get('ETH')?.priceUsd ?? 3200;
    const { vaultEth, deployerEth, totalEth,
            deployerUsdc, vaultUsdc,
            totalSupply: totalSupplyOnChain,
            deployerInqai: deployerBalance,
            circulatingSupply } = snap;
    const onChainAUM     = vaultEth * ethPrice + vaultUsdc;

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

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
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
        vaultAddress:     (() => { try { return getAddress(VAULT_ADDR.toLowerCase()); } catch { return VAULT_ADDR; } })(),
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
        fearGreed:  fgLive,
        cycleCount: snap.cycleCount,
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
