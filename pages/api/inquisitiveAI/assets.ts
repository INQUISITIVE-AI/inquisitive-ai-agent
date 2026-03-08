import type { NextApiRequest, NextApiResponse } from 'next';

// ─── EXACT 65 ASSETS from server/services/priceFeed.js ASSET_REGISTRY ────────
const ASSET_REGISTRY = [
  { symbol:'BTC',    cgId:'bitcoin',                 name:'Bitcoin',                          category:'major',        yieldable:false, stakeable:false, lendable:true  },
  { symbol:'ETH',    cgId:'ethereum',                name:'Ethereum',                         category:'major',        yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'BNB',    cgId:'binancecoin',             name:'BNB',                              category:'major',        yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'XRP',    cgId:'ripple',                  name:'XRP',                              category:'major',        yieldable:false, stakeable:false, lendable:true  },
  { symbol:'USDC',   cgId:'usd-coin',                name:'USD Coin',                         category:'stablecoin',   yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'SOL',    cgId:'solana',                  name:'Solana',                           category:'major',        yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'TRX',    cgId:'tron',                    name:'TRON',                             category:'major',        yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'ADA',    cgId:'cardano',                 name:'Cardano',                          category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'BCH',    cgId:'bitcoin-cash',            name:'Bitcoin Cash',                     category:'major',        yieldable:false, stakeable:false, lendable:true  },
  { symbol:'HYPE',   cgId:'hyperliquid',             name:'Hyperliquid',                      category:'defi',         yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'XMR',    cgId:'monero',                  name:'Monero',                           category:'privacy',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'LINK',   cgId:'chainlink',               name:'Chainlink',                        category:'oracle',       yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'CC',     cgId:'canton-network',          name:'Canton',                           category:'institutional',yieldable:false, stakeable:false, lendable:false },
  { symbol:'XLM',    cgId:'stellar',                 name:'Stellar',                          category:'payment',      yieldable:false, stakeable:false, lendable:true  },
  { symbol:'LTC',    cgId:'litecoin',                name:'Litecoin',                         category:'payment',      yieldable:false, stakeable:false, lendable:true  },
  { symbol:'HBAR',   cgId:'hedera-hashgraph',        name:'Hedera',                           category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'AVAX',   cgId:'avalanche-2',             name:'Avalanche',                        category:'major',        yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'ZEC',    cgId:'zcash',                   name:'Zcash',                            category:'privacy',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'SUI',    cgId:'sui',                     name:'Sui',                              category:'major',        yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'DOT',    cgId:'polkadot',                name:'Polkadot',                         category:'interop',      yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'PAXG',   cgId:'pax-gold',                name:'PAX Gold',                         category:'rwa',          yieldable:false, stakeable:false, lendable:true  },
  { symbol:'UNI',    cgId:'uniswap',                 name:'Uniswap',                          category:'defi',         yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'TAO',    cgId:'bittensor',               name:'Bittensor',                        category:'ai',           yieldable:false, stakeable:true,  lendable:false },
  { symbol:'NEAR',   cgId:'near-protocol',           name:'NEAR Protocol',                    category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'AAVE',   cgId:'aave',                    name:'Aave',                             category:'defi',         yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'SKY',    cgId:'sky',                     name:'Sky',                              category:'defi',         yieldable:true,  stakeable:false, lendable:false },
  { symbol:'ICP',    cgId:'internet-computer',       name:'Internet Computer',                category:'major',        yieldable:false, stakeable:false, lendable:false },
  { symbol:'ETC',    cgId:'ethereum-classic',        name:'Ethereum Classic',                 category:'major',        yieldable:false, stakeable:false, lendable:true  },
  { symbol:'ONDO',   cgId:'ondo-finance',            name:'Ondo',                             category:'rwa',          yieldable:true,  stakeable:false, lendable:false },
  { symbol:'POL',    cgId:'polygon-ecosystem-token', name:'Polygon',                          category:'l2',           yieldable:true,  stakeable:true,  lendable:true  },
  { symbol:'PYTH',   cgId:'pyth-network',            name:'Pyth Network',                     category:'oracle',       yieldable:false, stakeable:true,  lendable:false },
  { symbol:'ENA',    cgId:'ethena',                  name:'Ethena',                           category:'defi',         yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'ATOM',   cgId:'cosmos',                  name:'Cosmos',                           category:'interop',      yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'ALGO',   cgId:'algorand',                name:'Algorand',                         category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'FIL',    cgId:'filecoin',                name:'Filecoin',                         category:'storage',      yieldable:false, stakeable:false, lendable:true  },
  { symbol:'QNT',    cgId:'quant-network',           name:'Quant',                            category:'interop',      yieldable:false, stakeable:false, lendable:true  },
  { symbol:'XDC',    cgId:'xdce-crowd-sale',         name:'XDC Network',                      category:'major',        yieldable:false, stakeable:true,  lendable:false },
  { symbol:'RNDR',   cgId:'render-token',            name:'Render',                           category:'ai',           yieldable:false, stakeable:false, lendable:false },
  { symbol:'JUP',    cgId:'jupiter-exchange-solana', name:'Jupiter',                          category:'defi',         yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'VET',    cgId:'vechain',                 name:'VeChain',                          category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'ARB',    cgId:'arbitrum',                name:'Arbitrum',                         category:'l2',           yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'ZRO',    cgId:'layerzero',               name:'LayerZero',                        category:'interop',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'XTZ',    cgId:'tezos',                   name:'Tezos',                            category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'CHZ',    cgId:'chiliz',                  name:'Chiliz',                           category:'gaming',       yieldable:false, stakeable:false, lendable:false },
  { symbol:'FET',    cgId:'fetch-ai',                name:'Artificial Superintelligence Alliance', category:'ai',      yieldable:false, stakeable:true,  lendable:false },
  { symbol:'INJ',    cgId:'injective-protocol',      name:'Injective',                        category:'defi',         yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'GRT',    cgId:'the-graph',               name:'The Graph',                        category:'data',         yieldable:false, stakeable:true,  lendable:false },
  { symbol:'OP',     cgId:'optimism',                name:'Optimism',                         category:'l2',           yieldable:false, stakeable:false, lendable:true  },
  { symbol:'LDO',    cgId:'lido-dao',                name:'Lido DAO',                         category:'defi',         yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'HNT',    cgId:'helium',                  name:'Helium',                           category:'iot',          yieldable:false, stakeable:true,  lendable:false },
  { symbol:'STRK',   cgId:'starknet',                name:'Starknet',                         category:'l2',           yieldable:false, stakeable:true,  lendable:false },
  { symbol:'STX',    cgId:'blockstack',              name:'Stacks',                           category:'l2',           yieldable:false, stakeable:true,  lendable:false },
  { symbol:'EOS',    cgId:'eos',                     name:'Vaulta',                           category:'major',        yieldable:false, stakeable:true,  lendable:true  },
  { symbol:'AR',     cgId:'arweave',                 name:'Arweave',                          category:'storage',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'ACH',    cgId:'alchemy-pay',             name:'Alchemy Pay',                      category:'payment',      yieldable:false, stakeable:false, lendable:false },
  { symbol:'DBR',    cgId:'debridge',                name:'deBridge',                         category:'interop',      yieldable:false, stakeable:true,  lendable:false },
  { symbol:'HONEY',  cgId:'hivemapper',              name:'Hivemapper',                       category:'iot',          yieldable:true,  stakeable:false, lendable:false },
  { symbol:'XSGD',   cgId:'xsgd',                    name:'XSGD',                             category:'stablecoin',   yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'SOIL',   cgId:'soil',                    name:'Soil',                             category:'defi',         yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'BRZ',    cgId:'brz',                     name:'Brazilian Digital Token',          category:'stablecoin',   yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'JPYC',   cgId:'jpyc',                    name:'JPYC Prepaid',                     category:'stablecoin',   yieldable:false, stakeable:false, lendable:false },
  { symbol:'FDUSD',  cgId:'first-digital-usd',       name:'First Digital USD',                category:'stablecoin',   yieldable:true,  stakeable:false, lendable:true  },
  { symbol:'JITOSOL',cgId:'jito-staked-sol',         name:'Jito Staked SOL',                  category:'liquid-stake', yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'JUPSOL', cgId:'jupiter-staked-sol',      name:'Jupiter Staked SOL',               category:'liquid-stake', yieldable:true,  stakeable:true,  lendable:false },
  { symbol:'MNDE',   cgId:'marinade',                name:'Marinade',                         category:'liquid-stake', yieldable:true,  stakeable:true,  lendable:false },
];

const PORTFOLIO_WEIGHTS: Record<string, number> = {
  BTC:18,  ETH:12,  SOL:8,   BNB:5,   XRP:4,   ADA:3,   AVAX:3,  SUI:2,   DOT:2,   NEAR:1,  ICP:1,   TRX:1,
  AAVE:2,  UNI:2,   LDO:1.5, ARB:1.5, OP:1,    INJ:1,   JUP:1,   ENA:1,   HYPE:1,  SKY:0.5, GRT:0.5, FET:1,   RNDR:1,  TAO:1,   POL:1,   LINK:1,  STRK:0.5,
  USDC:3,  PAXG:1.5,ONDO:1,  XLM:0.5, LTC:0.5, BCH:0.5, HBAR:0.5,ZEC:0.25,XMR:0.25,ETC:0.5, XTZ:0.25,CHZ:0.25,HNT:0.25,VET:0.25,QNT:0.25,ALGO:0.25,FIL:0.25,AR:0.25,XDC:0.1,STX:0.1,ZRO:0.25,ATOM:0.25,DBR:0.1,ACH:0.1,EOS:0.1,HONEY:0.1,XSGD:0.1,SOIL:0.1,BRZ:0.1,JPYC:0.1,FDUSD:0.1,JITOSOL:0.5,JUPSOL:0.5,MNDE:0.5,CC:0.1,PYTH:0.1,
};

const NO_PRICE_EXCHANGE = new Set(['CC', 'JUPSOL']);

function calcSignal(chg24: number) {
  const action     = chg24 > 5 ? 'BUY' : chg24 > 2 ? 'ACCUMULATE' : chg24 < -5 ? 'SELL' : chg24 < -2 ? 'REDUCE' : 'HOLD';
  const confidence = +Math.min(0.95, Math.max(0.52, 0.72 + chg24 * 0.008)).toFixed(3);
  return { action, confidence };
}

function buildAsset(meta: typeof ASSET_REGISTRY[0], coin: any, source: string) {
  const chg24 = coin.price_change_percentage_24h ?? 0;
  const sig   = calcSignal(chg24);
  return {
    symbol:            meta.symbol,
    name:              meta.name,
    cgId:              meta.cgId,
    category:          meta.category,
    yieldable:         meta.yieldable,
    stakeable:         meta.stakeable,
    lendable:          meta.lendable,
    price:             coin.current_price ?? 0,
    priceUsd:          coin.current_price ?? 0,
    change1h:          (coin.price_change_percentage_1h_in_currency  ?? 0) / 100,
    change24h:         chg24 / 100,
    change7d:          (coin.price_change_percentage_7d_in_currency  ?? 0) / 100,
    volume24h:         coin.total_volume        ?? 0,
    marketCap:         coin.market_cap          ?? 0,
    high24h:           coin.high_24h            ?? 0,
    low24h:            coin.low_24h             ?? 0,
    circulatingSupply: coin.circulating_supply  ?? 0,
    ath:               coin.ath                 ?? 0,
    athChange:         (coin.ath_change_percentage ?? 0) / 100,
    weight:            PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
    signal:            sig.action,
    confidence:        sig.confidence,
    lastUpdate:        new Date().toISOString(),
    source,
  };
}

async function fetchBatch(batch: typeof ASSET_REGISTRY): Promise<any[]> {
  const ids = batch.map(a => a.cgId).join(',');
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=1h,24h,7d`;
  const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
  return r.json();
}

async function fetchViaCryptoCompare(missing: typeof ASSET_REGISTRY): Promise<Map<string, any>> {
  const result  = new Map<string, any>();
  const toFetch = missing.filter(a => !NO_PRICE_EXCHANGE.has(a.symbol));
  if (!toFetch.length) return result;
  const fsyms = toFetch.map(a => a.symbol).join(',');
  try {
    const r = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fsyms}&tsyms=USD`, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return result;
    const d   = await r.json();
    const raw = d?.RAW || {};
    for (const asset of toFetch) {
      const c = raw[asset.symbol]?.USD;
      if (!c) continue;
      result.set(asset.symbol, {
        current_price:                           c.PRICE             ?? 0,
        price_change_percentage_24h:             c.CHANGEPCT24HOUR   ?? 0,
        price_change_percentage_7d_in_currency:  0,
        price_change_percentage_1h_in_currency:  c.CHANGEPCTHOUR     ?? 0,
        total_volume:                            c.VOLUME24HOURTO    ?? 0,
        market_cap:                              c.MKTCAP            ?? 0,
        high_24h:                                c.HIGH24HOUR        ?? 0,
        low_24h:                                 c.LOW24HOUR         ?? 0,
        circulating_supply:                      c.CIRCULATINGSUPPLY ?? 0,
        ath: 0, ath_change_percentage: 0,
      });
    }
  } catch {}
  return result;
}

async function getAssets() {
  const mid    = Math.ceil(ASSET_REGISTRY.length / 2);
  const batch1 = ASSET_REGISTRY.slice(0, mid);
  const batch2 = ASSET_REGISTRY.slice(mid);
  const priceMap = new Map<string, any>();

  // Fetch both batches in PARALLEL — avoids Vercel 10s timeout from sequential calls
  const [r1, r2] = await Promise.allSettled([fetchBatch(batch1), fetchBatch(batch2)]);
  for (const result of [r1, r2]) {
    if (result.status === 'fulfilled') {
      for (const coin of result.value) {
        const meta = ASSET_REGISTRY.find(a => a.cgId === coin.id);
        if (meta) priceMap.set(meta.symbol, buildAsset(meta, coin, 'coingecko'));
      }
    }
  }

  const missing = ASSET_REGISTRY.filter(a => !priceMap.has(a.symbol));
  if (missing.length > 0) {
    const ccData = await fetchViaCryptoCompare(missing);
    for (const meta of missing) {
      const coin = ccData.get(meta.symbol);
      if (coin) priceMap.set(meta.symbol, buildAsset(meta, coin, 'cryptocompare'));
    }
  }

  return ASSET_REGISTRY.map(meta => priceMap.get(meta.symbol) ?? {
    symbol: meta.symbol, name: meta.name, cgId: meta.cgId, category: meta.category,
    yieldable: meta.yieldable, stakeable: meta.stakeable, lendable: meta.lendable,
    price: 0, priceUsd: 0, change1h: 0, change24h: 0, change7d: 0,
    volume24h: 0, marketCap: 0, high24h: 0, low24h: 0, circulatingSupply: 0,
    ath: 0, athChange: 0, weight: PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
    signal: 'HOLD', confidence: 0.72, lastUpdate: new Date().toISOString(), source: 'unavailable',
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const assets = await getAssets();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json({ assets });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
}
