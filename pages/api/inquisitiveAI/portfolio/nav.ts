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

const NO_CC   = new Set(['CC', 'JUPSOL', 'NIGHT', 'XCN', 'CNGN']);
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
    const { inputs, fg } = await fetchAll();

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
    const weightSum     = Object.values(PORTFOLIO_WEIGHTS).reduce((s, w) => s + w, 0) || 1;
    const assetsLive    = allInputs.filter(a => a.priceUsd > 0);
    const return24h     = assetsLive.reduce((s, a) => s + (PORTFOLIO_WEIGHTS[a.symbol] || 0) * a.change24h, 0) / weightSum;
    const return7d      = assetsLive.reduce((s, a) => s + (PORTFOLIO_WEIGHTS[a.symbol] || 0) * a.change7d,  0) / weightSum;
    // NAV per token = presale price × (1 + portfolio 7-day return)
    const navPerToken   = PRESALE_PRICE * (1 + return7d);
    // Portfolio index: what $100 invested 7 days ago is worth now
    const portfolioIndex = 100 * (1 + return7d);

    const buys  = signals.filter(s => s.action === 'BUY' || s.action === 'ACCUMULATE').length;
    const sells = signals.filter(s => s.action === 'SELL' || s.action === 'REDUCE').length;
    const winRate = assetsLive.length > 0
      ? assetsLive.filter(a => a.change24h > 0).length / assetsLive.length : 0;

    // ── Per-position data ─────────────────────────────────────────────────────
    // Each position shows how much of a $presalePrice token is backing each asset
    const positions = ASSET_REGISTRY
      .filter(meta => (PORTFOLIO_WEIGHTS[meta.symbol] ?? 0) > 0)
      .map(meta => {
        const inp = inputs.get(meta.symbol);
        const sig = signals.find(s => s.symbol === meta.symbol);
        const weight    = PORTFOLIO_WEIGHTS[meta.symbol] ?? 0;
        const allocPct  = weight / weightSum;                         // e.g. 0.18 for BTC
        const usdPerToken = PRESALE_PRICE * allocPct;                 // $ per INQAI token this asset backs
        const currentUsd  = usdPerToken * (1 + (inp?.change7d ?? 0)); // current value of that allocation
        const pnl7d       = currentUsd - usdPerToken;
        const pnl24h      = usdPerToken * (inp?.change24h ?? 0);
        return {
          symbol:       meta.symbol,
          name:         meta.name,
          category:     meta.category,
          weight,
          allocPct:     parseFloat((allocPct * 100).toFixed(4)),
          usdPerToken:  parseFloat(usdPerToken.toFixed(6)),
          currentUsd:   parseFloat(currentUsd.toFixed(6)),
          pnl7d:        parseFloat(pnl7d.toFixed(6)),
          pnl24h:       parseFloat(pnl24h.toFixed(6)),
          priceUsd:     inp?.priceUsd  ?? 0,
          change24h:    inp?.change24h ?? 0,
          change7d:     inp?.change7d  ?? 0,
          action:       sig?.action     ?? 'HOLD',
          confidence:   sig?.finalScore ?? 0,
          components:   sig?.components ?? {},
          reasons:      sig?.reasons    ?? [],
          stakeable:    meta.stakeable,
          lendable:     meta.lendable,
          yieldable:    meta.yieldable,
        };
      })
      .sort((a, b) => b.weight - a.weight);

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    res.status(200).json({
      // INQAI token economics
      token: {
        symbol:        'INQAI',
        presalePrice:  PRESALE_PRICE,
        navPerToken:   parseFloat(navPerToken.toFixed(6)),
        portfolioIndex: parseFloat(portfolioIndex.toFixed(4)),
        return24h:     parseFloat(return24h.toFixed(6)),
        return7d:      parseFloat(return7d.toFixed(6)),
        targetPrice:   15,
        totalSupply:   TOTAL_SUPPLY,
      },
      // Portfolio summary
      portfolio: {
        assetCount:    assetsLive.length,
        totalAssets:   ASSET_REGISTRY.length,
        weightSum,
        return24h,
        return7d,
        portfolioIndex,
        totalPnL24h:   parseFloat((PRESALE_PRICE * return24h).toFixed(6)), // $ P&L per token over 24h
        totalPnL7d:    parseFloat((PRESALE_PRICE * return7d).toFixed(6)),  // $ P&L per token over 7d
        winRate,
      },
      // AI signals
      ai: {
        regime,
        fearGreed:     fg,
        cycleCount:    Math.floor(Date.now() / 8000),
        buys,
        sells,
        riskScore:     regime === 'BULL' ? 0.35 : regime === 'BEAR' ? 0.72 : 0.5,
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
