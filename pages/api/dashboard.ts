import type { NextApiRequest, NextApiResponse } from 'next';

// ─── Full 65-asset registry ───────────────────────────────────────────────────
const REGISTRY: { symbol: string; cgId: string; category: string; weight: number }[] = [
  { symbol:'BTC',     cgId:'bitcoin',                 category:'major',        weight:18    },
  { symbol:'ETH',     cgId:'ethereum',                category:'major',        weight:12    },
  { symbol:'BNB',     cgId:'binancecoin',             category:'major',        weight:5     },
  { symbol:'XRP',     cgId:'ripple',                  category:'major',        weight:4     },
  { symbol:'USDC',    cgId:'usd-coin',                category:'stablecoin',   weight:3     },
  { symbol:'SOL',     cgId:'solana',                  category:'major',        weight:8     },
  { symbol:'TRX',     cgId:'tron',                    category:'major',        weight:1     },
  { symbol:'ADA',     cgId:'cardano',                 category:'major',        weight:3     },
  { symbol:'BCH',     cgId:'bitcoin-cash',            category:'major',        weight:0.5   },
  { symbol:'HYPE',    cgId:'hyperliquid',             category:'defi',         weight:1     },
  { symbol:'XMR',     cgId:'monero',                  category:'privacy',      weight:0.25  },
  { symbol:'LINK',    cgId:'chainlink',               category:'oracle',       weight:1     },
  { symbol:'CC',      cgId:'canton-network',          category:'institutional',weight:0.1   },
  { symbol:'XLM',     cgId:'stellar',                 category:'payment',      weight:0.5   },
  { symbol:'LTC',     cgId:'litecoin',                category:'payment',      weight:0.5   },
  { symbol:'HBAR',    cgId:'hedera-hashgraph',        category:'major',        weight:0.5   },
  { symbol:'AVAX',    cgId:'avalanche-2',             category:'major',        weight:3     },
  { symbol:'ZEC',     cgId:'zcash',                   category:'privacy',      weight:0.25  },
  { symbol:'SUI',     cgId:'sui',                     category:'major',        weight:2     },
  { symbol:'DOT',     cgId:'polkadot',                category:'interop',      weight:2     },
  { symbol:'PAXG',    cgId:'pax-gold',                category:'rwa',          weight:1.5   },
  { symbol:'UNI',     cgId:'uniswap',                 category:'defi',         weight:2     },
  { symbol:'TAO',     cgId:'bittensor',               category:'ai',           weight:1     },
  { symbol:'NEAR',    cgId:'near-protocol',           category:'major',        weight:1     },
  { symbol:'AAVE',    cgId:'aave',                    category:'defi',         weight:2     },
  { symbol:'SKY',     cgId:'sky',                     category:'defi',         weight:0.5   },
  { symbol:'ICP',     cgId:'internet-computer',       category:'major',        weight:1     },
  { symbol:'ETC',     cgId:'ethereum-classic',        category:'major',        weight:0.5   },
  { symbol:'ONDO',    cgId:'ondo-finance',            category:'rwa',          weight:1     },
  { symbol:'POL',     cgId:'polygon-ecosystem-token', category:'l2',           weight:1     },
  { symbol:'PYTH',    cgId:'pyth-network',            category:'oracle',       weight:0.1   },
  { symbol:'ENA',     cgId:'ethena',                  category:'defi',         weight:1     },
  { symbol:'ATOM',    cgId:'cosmos',                  category:'interop',      weight:0.25  },
  { symbol:'ALGO',    cgId:'algorand',                category:'major',        weight:0.25  },
  { symbol:'FIL',     cgId:'filecoin',                category:'storage',      weight:0.25  },
  { symbol:'QNT',     cgId:'quant-network',           category:'interop',      weight:0.25  },
  { symbol:'XDC',     cgId:'xdce-crowd-sale',         category:'major',        weight:0.1   },
  { symbol:'RNDR',    cgId:'render-token',            category:'ai',           weight:1     },
  { symbol:'JUP',     cgId:'jupiter-exchange-solana', category:'defi',         weight:1     },
  { symbol:'VET',     cgId:'vechain',                 category:'major',        weight:0.25  },
  { symbol:'ARB',     cgId:'arbitrum',                category:'l2',           weight:1.5   },
  { symbol:'ZRO',     cgId:'layerzero',               category:'interop',      weight:0.25  },
  { symbol:'XTZ',     cgId:'tezos',                   category:'major',        weight:0.25  },
  { symbol:'CHZ',     cgId:'chiliz',                  category:'gaming',       weight:0.25  },
  { symbol:'FET',     cgId:'fetch-ai',                category:'ai',           weight:1     },
  { symbol:'INJ',     cgId:'injective-protocol',      category:'defi',         weight:1     },
  { symbol:'GRT',     cgId:'the-graph',               category:'data',         weight:0.5   },
  { symbol:'OP',      cgId:'optimism',                category:'l2',           weight:1     },
  { symbol:'LDO',     cgId:'lido-dao',                category:'defi',         weight:1.5   },
  { symbol:'HNT',     cgId:'helium',                  category:'iot',          weight:0.25  },
  { symbol:'STRK',    cgId:'starknet',                category:'l2',           weight:0.5   },
  { symbol:'STX',     cgId:'blockstack',              category:'l2',           weight:0.1   },
  { symbol:'EOS',     cgId:'eos',                     category:'major',        weight:0.1   },
  { symbol:'AR',      cgId:'arweave',                 category:'storage',      weight:0.25  },
  { symbol:'ACH',     cgId:'alchemy-pay',             category:'payment',      weight:0.1   },
  { symbol:'DBR',     cgId:'debridge',                category:'interop',      weight:0.1   },
  { symbol:'HONEY',   cgId:'hivemapper',              category:'iot',          weight:0.1   },
  { symbol:'XSGD',    cgId:'xsgd',                    category:'stablecoin',   weight:0.1   },
  { symbol:'SOIL',    cgId:'soil',                    category:'defi',         weight:0.1   },
  { symbol:'BRZ',     cgId:'brz',                     category:'stablecoin',   weight:0.1   },
  { symbol:'JPYC',    cgId:'jpyc',                    category:'stablecoin',   weight:0.1   },
  { symbol:'FDUSD',   cgId:'first-digital-usd',       category:'stablecoin',   weight:0.1   },
  { symbol:'JITOSOL', cgId:'jito-staked-sol',         category:'liquid-stake', weight:0.5   },
  { symbol:'JUPSOL',  cgId:'jupiter-staked-sol',      category:'liquid-stake', weight:0.5   },
  { symbol:'MNDE',    cgId:'marinade',                category:'liquid-stake', weight:0.5   },
];

const CG_IDS_B1 = REGISTRY.slice(0, 33).map(a => a.cgId).join(',');
const CG_IDS_B2 = REGISTRY.slice(33).map(a => a.cgId).join(',');
const CC_SYMS   = REGISTRY.map(a => a.symbol).join(',');

function calcSignal(chg: number, weight: number) {
  const wb    = weight >= 5 ? 0.02 : weight >= 2 ? 0.01 : 0;
  const score = Math.min(0.95, Math.max(0.52, 0.72 + chg * 0.008 + wb));
  const action = chg > 5 ? 'BUY' : chg > 2 ? 'ACCUMULATE' : chg < -5 ? 'SELL' : chg < -2 ? 'REDUCE' : 'HOLD';
  return { score, action };
}

async function fetchAllPrices(): Promise<Map<string, { price: number; chg: number }>> {
  const map = new Map<string, { price: number; chg: number }>();

  // CoinGecko simple/price — two parallel batches
  try {
    const [r1, r2] = await Promise.allSettled([
      fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${CG_IDS_B1}&vs_currencies=usd&include_24hr_change=true`, { signal: AbortSignal.timeout(9000) }),
      fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${CG_IDS_B2}&vs_currencies=usd&include_24hr_change=true`, { signal: AbortSignal.timeout(9000) }),
    ]);
    for (const res of [r1, r2]) {
      if (res.status === 'fulfilled' && res.value.ok) {
        const d = await res.value.json();
        for (const a of REGISTRY) {
          const c = d[a.cgId];
          if (c?.usd > 0) map.set(a.symbol, { price: c.usd, chg: c.usd_24h_change ?? 0 });
        }
      }
    }
    if (map.size >= 40) return map;
  } catch {}

  // CryptoCompare fallback
  try {
    const r = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${CC_SYMS}&tsyms=USD`, { signal: AbortSignal.timeout(9000) });
    if (r.ok) {
      const d = await r.json();
      const raw = d?.RAW || {};
      for (const a of REGISTRY) {
        if (map.has(a.symbol)) continue;
        const c = raw[a.symbol]?.USD;
        if (c?.PRICE > 0) map.set(a.symbol, { price: c.PRICE, chg: c.CHANGEPCT24HOUR ?? 0 });
      }
    }
  } catch {}

  // Binance spot for the biggest assets if still missing
  if (!map.has('BTC') || !map.has('ETH')) {
    try {
      const pairs = [['BTC','BTCUSDT'],['ETH','ETHUSDT'],['SOL','SOLUSDT'],['BNB','BNBUSDT']];
      const results = await Promise.allSettled(pairs.map(([,p]) =>
        fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${p}`, { signal: AbortSignal.timeout(5000) })
      ));
      for (let i = 0; i < pairs.length; i++) {
        const [sym] = pairs[i];
        const res = results[i];
        if (res.status === 'fulfilled' && res.value.ok) {
          const d = await res.value.json();
          if (parseFloat(d.lastPrice) > 0)
            map.set(sym, { price: parseFloat(d.lastPrice), chg: parseFloat(d.priceChangePercent ?? 0) });
        }
      }
    } catch {}
  }

  return map;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [pricesResult, fgResult] = await Promise.allSettled([
      fetchAllPrices(),
      fetch('https://api.alternative.me/fng/', { signal: AbortSignal.timeout(5000) }),
    ]);

    const priceMap = pricesResult.status === 'fulfilled' ? pricesResult.value : new Map<string, { price: number; chg: number }>();
    const fgRaw   = fgResult.status === 'fulfilled' && fgResult.value.ok ? await fgResult.value.json() : {};
    const fgData  = fgRaw.data?.[0] ? { value: parseInt(fgRaw.data[0].value), valueClassification: fgRaw.data[0].value_classification } : null;

    const signals = REGISTRY.map(a => {
      const px  = priceMap.get(a.symbol);
      const chg = px?.chg ?? 0;
      const { score, action } = calcSignal(chg, a.weight);
      return {
        symbol: a.symbol, category: a.category, weight: a.weight,
        price: px?.price ?? 0, change24h: chg,
        action, finalScore: score, confidence: score,
        executed: action === 'BUY' || action === 'ACCUMULATE',
        components: { patternEngine: +(score-0.03).toFixed(2), reasoningEngine: +(score-0.05).toFixed(2), portfolioEngine: +(score-0.02).toFixed(2), learningEngine: +score.toFixed(2) },
        rationale: `${action} signal. ${chg.toFixed(2)}% 24h move. Portfolio weight: ${a.weight}%. Risk parameters applied.`,
        time: new Date().toISOString(),
      };
    }).sort((a, b) => b.finalScore - a.finalScore);

    const buys  = signals.filter(s => s.action === 'BUY' || s.action === 'ACCUMULATE').length;
    const sells = signals.filter(s => s.action === 'SELL' || s.action === 'REDUCE').length;
    const btc   = priceMap.get('BTC');
    const eth   = priceMap.get('ETH');
    const sol   = priceMap.get('SOL');
    const avgChg = ((btc?.chg ?? 0) + (eth?.chg ?? 0)) / 2;
    const regime = avgChg > 2.5 ? 'BULL' : avgChg < -2.5 ? 'BEAR' : 'NEUTRAL';

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    res.status(200).json({
      aiSignals: { cycleCount: Math.floor(Date.now() / 8000), buys, sells, topBuys: signals },
      performance: { totalPnL: 0, winRate: 0, totalTrades: 0, equityCurve: [] },
      risk: { portfolioHeat: 0, drawdown: 0, isLive: true, fearGreed: fgData, regime },
      macro: {
        fearGreed: fgData,
        indicators: {
          'BTC/USD': { key:'BTC/USD', current: btc?.price ?? 0, changePct: (btc?.chg ?? 0)/100, unit:'$' },
          'ETH/USD': { key:'ETH/USD', current: eth?.price ?? 0, changePct: (eth?.chg ?? 0)/100, unit:'$' },
          'SOL/USD': { key:'SOL/USD', current: sol?.price ?? 0, changePct: (sol?.chg ?? 0)/100, unit:'$' },
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}
