import type { NextApiRequest, NextApiResponse } from 'next';

// ─── Asset metadata (mirrors ASSET_REGISTRY from priceFeed.js) ───────────────
const REGISTRY: Record<string, { cgId: string; category: string; weight: number }> = {
  BTC:{cgId:'bitcoin',                 category:'major',        weight:18},
  ETH:{cgId:'ethereum',                category:'major',        weight:12},
  BNB:{cgId:'binancecoin',             category:'major',        weight:5},
  XRP:{cgId:'ripple',                  category:'major',        weight:4},
  USDC:{cgId:'usd-coin',               category:'stablecoin',   weight:3},
  SOL:{cgId:'solana',                  category:'major',        weight:8},
  TRX:{cgId:'tron',                    category:'major',        weight:1},
  ADA:{cgId:'cardano',                 category:'major',        weight:3},
  BCH:{cgId:'bitcoin-cash',            category:'major',        weight:0.5},
  HYPE:{cgId:'hyperliquid',            category:'defi',         weight:1},
  XMR:{cgId:'monero',                  category:'privacy',      weight:0.25},
  LINK:{cgId:'chainlink',              category:'oracle',       weight:1},
  CC:{cgId:'canton-network',           category:'institutional',weight:0.1},
  XLM:{cgId:'stellar',                 category:'payment',      weight:0.5},
  LTC:{cgId:'litecoin',                category:'payment',      weight:0.5},
  HBAR:{cgId:'hedera-hashgraph',       category:'major',        weight:0.5},
  AVAX:{cgId:'avalanche-2',            category:'major',        weight:3},
  ZEC:{cgId:'zcash',                   category:'privacy',      weight:0.25},
  SUI:{cgId:'sui',                     category:'major',        weight:2},
  DOT:{cgId:'polkadot',                category:'interop',      weight:2},
  PAXG:{cgId:'pax-gold',               category:'rwa',          weight:1.5},
  UNI:{cgId:'uniswap',                 category:'defi',         weight:2},
  TAO:{cgId:'bittensor',               category:'ai',           weight:1},
  NEAR:{cgId:'near-protocol',          category:'major',        weight:1},
  AAVE:{cgId:'aave',                   category:'defi',         weight:2},
  SKY:{cgId:'sky',                     category:'defi',         weight:0.5},
  ICP:{cgId:'internet-computer',       category:'major',        weight:1},
  ETC:{cgId:'ethereum-classic',        category:'major',        weight:0.5},
  ONDO:{cgId:'ondo-finance',           category:'rwa',          weight:1},
  POL:{cgId:'polygon-ecosystem-token', category:'l2',           weight:1},
  PYTH:{cgId:'pyth-network',           category:'oracle',       weight:0.1},
  ENA:{cgId:'ethena',                  category:'defi',         weight:1},
  ATOM:{cgId:'cosmos',                 category:'interop',      weight:0.25},
  ALGO:{cgId:'algorand',               category:'major',        weight:0.25},
  FIL:{cgId:'filecoin',                category:'storage',      weight:0.25},
  QNT:{cgId:'quant-network',           category:'interop',      weight:0.25},
  XDC:{cgId:'xdce-crowd-sale',         category:'major',        weight:0.1},
  RNDR:{cgId:'render-token',           category:'ai',           weight:1},
  JUP:{cgId:'jupiter-exchange-solana', category:'defi',         weight:1},
  VET:{cgId:'vechain',                 category:'major',        weight:0.25},
  ARB:{cgId:'arbitrum',                category:'l2',           weight:1.5},
  ZRO:{cgId:'layerzero',               category:'interop',      weight:0.25},
  XTZ:{cgId:'tezos',                   category:'major',        weight:0.25},
  CHZ:{cgId:'chiliz',                  category:'gaming',       weight:0.25},
  FET:{cgId:'fetch-ai',                category:'ai',           weight:1},
  INJ:{cgId:'injective-protocol',      category:'defi',         weight:1},
  GRT:{cgId:'the-graph',               category:'data',         weight:0.5},
  OP:{cgId:'optimism',                 category:'l2',           weight:1},
  LDO:{cgId:'lido-dao',                category:'defi',         weight:1.5},
  HNT:{cgId:'helium',                  category:'iot',          weight:0.25},
  STRK:{cgId:'starknet',               category:'l2',           weight:0.5},
  STX:{cgId:'blockstack',              category:'l2',           weight:0.1},
  EOS:{cgId:'eos',                     category:'major',        weight:0.1},
  AR:{cgId:'arweave',                  category:'storage',      weight:0.25},
  ACH:{cgId:'alchemy-pay',             category:'payment',      weight:0.1},
  DBR:{cgId:'debridge',                category:'interop',      weight:0.1},
  HONEY:{cgId:'hivemapper',            category:'iot',          weight:0.1},
  XSGD:{cgId:'xsgd',                   category:'stablecoin',   weight:0.1},
  SOIL:{cgId:'soil',                   category:'defi',         weight:0.1},
  BRZ:{cgId:'brz',                     category:'stablecoin',   weight:0.1},
  JPYC:{cgId:'jpyc',                   category:'stablecoin',   weight:0.1},
  FDUSD:{cgId:'first-digital-usd',     category:'stablecoin',   weight:0.1},
  JITOSOL:{cgId:'jito-staked-sol',     category:'liquid-stake', weight:0.5},
  JUPSOL:{cgId:'jupiter-staked-sol',   category:'liquid-stake', weight:0.5},
  MNDE:{cgId:'marinade',               category:'liquid-stake', weight:0.5},
};

async function fetchFearGreed() {
  const r = await fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(5000) });
  if (!r.ok) return null;
  const d = await r.json();
  const item = d?.data?.[0];
  return item ? { value: parseInt(item.value), valueClassification: item.value_classification } : null;
}

async function fetchCoinData(cgId: string) {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${cgId}&order=market_cap_desc&per_page=1&sparkline=false&price_change_percentage=1h,24h,7d`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const data = await r.json();
  return data?.[0] ?? null;
}

async function fetchBtcData() {
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true', { signal: AbortSignal.timeout(6000) });
  if (!r.ok) return null;
  return r.json();
}

function getRegime(btcChg: number, ethChg: number): string {
  const avg = (btcChg + ethChg) / 2;
  if (avg > 2.5) return 'BULL';
  if (avg < -2.5) return 'BEAR';
  return 'NEUTRAL';
}

function buildSignal(coin: any, fg: any, regime: string, weight: number, category: string) {
  const chg24  = coin?.price_change_percentage_24h ?? 0;
  const chg7   = coin?.price_change_percentage_7d_in_currency ?? 0;
  const chg1h  = coin?.price_change_percentage_1h_in_currency ?? 0;
  const price  = coin?.current_price ?? 0;
  const ath    = coin?.ath ?? price;
  const athPct = ath > 0 ? ((price - ath) / ath) * 100 : 0;
  const vol    = coin?.total_volume ?? 0;
  const mcap   = coin?.market_cap ?? 0;
  const volRatio = mcap > 0 ? vol / mcap : 0;

  const fgVal = fg?.value ?? 50;
  const fgScore = fgVal / 100;

  // ── 5-engine scoring (mirrors inquisitiveBrain.js logic) ─────────────────

  // Pattern Engine: momentum + volume confirmation
  const momScore  = Math.min(1, Math.max(0, 0.5 + chg24 * 0.02 + chg7 * 0.008 + chg1h * 0.05));
  const volScore  = Math.min(1, Math.max(0, 0.4 + volRatio * 2));
  const patternEngine = +(momScore * 0.6 + volScore * 0.4).toFixed(3);

  // Reasoning Engine: fundamentals + sentiment
  const catPremium: Record<string,number> = { major:0.05, defi:0.03, ai:0.04, l2:0.02, oracle:0.03, rwa:0.04, stablecoin:0, 'liquid-stake':0.03 };
  const reasoningEngine = +Math.min(0.95, Math.max(0.4, 0.55 + fgScore * 0.2 + (catPremium[category] ?? 0) + chg24 * 0.01)).toFixed(3);

  // Portfolio Engine: weight allocation + diversification
  const weightNorm = Math.min(1, weight / 20);
  const regimePremium = regime === 'BULL' ? 0.05 : regime === 'BEAR' ? -0.08 : 0;
  const portfolioEngine = +Math.min(0.95, Math.max(0.4, 0.60 + weightNorm * 0.15 + regimePremium + chg7 * 0.005)).toFixed(3);

  // Learning Engine: 7d trend + ath distance
  const athBonus  = athPct < -50 ? 0.08 : athPct < -30 ? 0.04 : athPct < -10 ? 0.01 : 0;
  const learningEngine = +Math.min(0.95, Math.max(0.4, 0.60 + chg7 * 0.01 + athBonus + chg24 * 0.005)).toFixed(3);

  // Final composite score
  const finalScore = +(patternEngine * 0.3 + reasoningEngine * 0.25 + portfolioEngine * 0.25 + learningEngine * 0.2).toFixed(3);

  // ── Action determination ──────────────────────────────────────────────────
  const regimeThreshold = regime === 'BEAR' ? 0.75 : 0.70;
  let action: string;
  if (finalScore < regimeThreshold) {
    action = chg24 < -3 ? 'REDUCE' : 'HOLD';
  } else if (finalScore >= 0.82 && chg24 > 3) {
    action = 'BUY';
  } else if (finalScore >= 0.75 && chg24 > 1) {
    action = 'ACCUMULATE';
  } else if (finalScore < 0.55 && chg24 < -4) {
    action = 'SELL';
  } else {
    action = 'HOLD';
  }

  // ── Risk Gate ─────────────────────────────────────────────────────────────
  const atr     = price * 0.025; // ~2.5% ATR estimate
  const stopLoss  = +(price - 2 * atr).toFixed(6);
  const target    = +(price + 3 * atr).toFixed(6);
  const riskReward = atr > 0 ? +((target - price) / (price - stopLoss)).toFixed(2) : 2.0;
  const riskGatePass = riskReward >= 2 && finalScore >= regimeThreshold && regime !== 'BEAR';

  // ── Reasons ───────────────────────────────────────────────────────────────
  const reasons: string[] = [];
  if (chg24 > 3)  reasons.push(`Strong 24h momentum: +${chg24.toFixed(2)}% — bullish price action`);
  if (chg24 < -3) reasons.push(`Negative 24h drift: ${chg24.toFixed(2)}% — caution warranted`);
  if (chg7 > 5)   reasons.push(`Positive 7d trend: +${chg7.toFixed(2)}% — sustained buyer interest`);
  if (chg7 < -5)  reasons.push(`Weak 7d structure: ${chg7.toFixed(2)}% — trend under pressure`);
  if (fgVal < 25) reasons.push(`Extreme Fear (${fgVal}) — contrarian accumulation signal`);
  if (fgVal > 75) reasons.push(`Extreme Greed (${fgVal}) — elevated risk, manage position size`);
  if (regime === 'BULL') reasons.push('Market regime: BULL — AI threshold 70%, favoring longs');
  if (regime === 'BEAR') reasons.push('Market regime: BEAR — AI threshold raised to 75%, defensive');
  if (athPct < -50) reasons.push(`${(-athPct).toFixed(0)}% below ATH — deep value zone, long-term accumulate`);
  if (volRatio > 0.1) reasons.push(`Elevated volume/mcap ratio (${(volRatio*100).toFixed(1)}%) — high conviction move`);
  reasons.push(`Portfolio weight: ${weight}% — ${weight >= 5 ? 'core' : weight >= 1 ? 'strategic' : 'satellite'} position sizing`);
  if (riskGatePass) reasons.push(`Risk-reward ${riskReward}:1 exceeds 2:1 minimum — trade executable`);
  else reasons.push(`Risk gate: R:R ${riskReward}:1 — minimum 2:1 required for live execution`);

  return {
    action,
    finalScore,
    components: { patternEngine, reasoningEngine, portfolioEngine, learningEngine },
    riskGate: { pass: riskGatePass, riskReward, stopLoss, target },
    reasons: reasons.slice(0, 6),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const symbol = (req.query.symbol as string)?.toUpperCase();
  const meta   = REGISTRY[symbol];
  if (!meta) return res.status(404).json({ error: `Unknown asset: ${symbol}` });

  try {
    const [coinResult, fgResult, btcResult] = await Promise.allSettled([
      fetchCoinData(meta.cgId),
      fetchFearGreed(),
      fetchBtcData(),
    ]);

    const coin = coinResult.status === 'fulfilled' ? coinResult.value : null;
    const fg   = fgResult.status   === 'fulfilled' ? fgResult.value   : null;
    const btc  = btcResult.status  === 'fulfilled' ? btcResult.value  : null;

    const btcChg = btc?.bitcoin?.usd_24h_change ?? 0;
    const ethChg = btc?.ethereum?.usd_24h_change ?? 0;
    const regime = getRegime(btcChg, ethChg);

    const signal = buildSignal(coin, fg, regime, meta.weight, meta.category);

    const macro = {
      regime,
      riskScore: regime === 'BULL' ? 0.35 : regime === 'BEAR' ? 0.72 : 0.5,
      signals: [
        { signal: 'BTC 24h', desc: `${btcChg >= 0 ? '+' : ''}${btcChg.toFixed(2)}% — market barometer` },
        { signal: 'ETH 24h', desc: `${ethChg >= 0 ? '+' : ''}${ethChg.toFixed(2)}% — risk appetite proxy` },
        { signal: 'Fear & Greed', desc: `${fg?.value ?? '—'} (${fg?.valueClassification ?? 'Unknown'}) — sentiment gauge` },
      ],
    };

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ signal, macro, fearGreed: fg });
  } catch (err: any) {
    return res.status(500).json({ error: 'Analysis failed' });
  }
}
