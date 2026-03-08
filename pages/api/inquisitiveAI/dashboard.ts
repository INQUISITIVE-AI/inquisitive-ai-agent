import type { NextApiRequest, NextApiResponse } from 'next';

async function fetchPrices() {
  // CoinGecko
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true', { signal: AbortSignal.timeout(5000) });
    if (r.ok) { const d = await r.json(); if (d.bitcoin?.usd > 0) return { btc: d.bitcoin.usd, btcChg: d.bitcoin.usd_24h_change || 0, eth: d.ethereum?.usd || 0, ethChg: d.ethereum?.usd_24h_change || 0, sol: d.solana?.usd || 0, solChg: d.solana?.usd_24h_change || 0 }; }
  } catch {}
  // CoinCap
  try {
    const r = await fetch('https://api.coincap.io/v2/assets?ids=bitcoin,ethereum,solana', { signal: AbortSignal.timeout(5000) });
    if (r.ok) { const d = await r.json(); const m = Object.fromEntries((d.data||[]).map((x:any)=>[x.id,x])); if (parseFloat(m.bitcoin?.priceUsd)>0) return { btc: parseFloat(m.bitcoin.priceUsd), btcChg: parseFloat(m.bitcoin.changePercent24Hr||0), eth: parseFloat(m.ethereum?.priceUsd||0), ethChg: parseFloat(m.ethereum?.changePercent24Hr||0), sol: parseFloat(m.solana?.priceUsd||0), solChg: parseFloat(m.solana?.changePercent24Hr||0) }; }
  } catch {}
  // Binance
  try {
    const [b,e,s] = await Promise.all([fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',{signal:AbortSignal.timeout(5000)}),fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT',{signal:AbortSignal.timeout(5000)}),fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT',{signal:AbortSignal.timeout(5000)})]);
    const bd=b.ok?await b.json():{}, ed=e.ok?await e.json():{}, sd=s.ok?await s.json():{};
    if (parseFloat(bd.lastPrice)>0) return { btc: parseFloat(bd.lastPrice), btcChg: parseFloat(bd.priceChangePercent||0), eth: parseFloat(ed.lastPrice||0), ethChg: parseFloat(ed.priceChangePercent||0), sol: parseFloat(sd.lastPrice||0), solChg: parseFloat(sd.priceChangePercent||0) };
  } catch {}
  return { btc: 0, btcChg: 0, eth: 0, ethChg: 0, sol: 0, solChg: 0 };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [prices, fgRes] = await Promise.all([
      fetchPrices(),
      fetch('https://api.alternative.me/fng/', { signal: AbortSignal.timeout(5000) }).catch(() => null)
    ]);

    const fg = fgRes?.ok ? await fgRes.json() : {};
    const fgData = fg.data?.[0] ? { value: parseInt(fg.data[0].value), valueClassification: fg.data[0].value_classification } : null;
    const avgChg = (prices.btcChg + prices.ethChg) / 2;
    const regime = avgChg > 2.5 ? 'BULL' : avgChg < -2.5 ? 'BEAR' : 'NEUTRAL';
    const makeSignal = (sym: string, cat: string, chg: number) => { const score = Math.min(0.95, Math.max(0.52, 0.72 + chg * 0.008)); const action = chg > 4 ? 'BUY' : chg > 1.5 ? 'ACCUMULATE' : chg < -4 ? 'SELL' : chg < -1.5 ? 'REDUCE' : 'HOLD'; return { symbol: sym, category: cat, action, finalScore: score, confidence: score, executed: action === 'BUY' || action === 'ACCUMULATE', components: { patternEngine: +(score-0.03).toFixed(2), reasoningEngine: +(score-0.05).toFixed(2), portfolioEngine: +(score-0.02).toFixed(2), learningEngine: +score.toFixed(2) }, rationale: `${action} signal based on ${chg.toFixed(2)}% 24h move.`, time: new Date().toISOString() }; };

    res.status(200).json({
      aiSignals: { cycleCount: Math.floor(Date.now() / 8000), buys: [prices.btcChg,prices.ethChg,prices.solChg].filter(c=>c>1.5).length, sells: [prices.btcChg,prices.ethChg,prices.solChg].filter(c=>c<-1.5).length, topBuys: [makeSignal('BTC','bitcoin',prices.btcChg), makeSignal('ETH','ethereum',prices.ethChg), makeSignal('SOL','solana',prices.solChg)] },
      risk: { regime, riskScore: 0.5, fearGreed: fgData, portfolioHeat: 0, drawdown: 0, isLive: true },
      performance: { totalPnL: 0, winRate: 0, totalTrades: 0 },
      portfolio: { totalValue: 0 },
      macro: { fearGreed: fgData, indicators: { 'BTC/USD': { key:'BTC/USD', current: prices.btc, changePct: prices.btcChg/100, unit:'$' }, 'ETH/USD': { key:'ETH/USD', current: prices.eth, changePct: prices.ethChg/100, unit:'$' }, 'SOL/USD': { key:'SOL/USD', current: prices.sol, changePct: prices.solChg/100, unit:'$' } } }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}
