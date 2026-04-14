import { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from '../_brain';
import type { AssetInput, FGIndex } from '../_brain';
import { getPrices } from '../_priceCache';

export const config = { maxDuration: 30 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch live prices + Fear & Greed in parallel
    const [priceResult, fgRaw] = await Promise.all([
      getPrices(),
      fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(6000) })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    let fg: FGIndex | null = null;
    if (fgRaw?.data?.[0]) {
      fg = { value: parseInt(fgRaw.data[0].value), valueClassification: fgRaw.data[0].value_classification };
    }

    // Build full input map from live price data
    const allInputs: AssetInput[] = ASSET_REGISTRY.map(meta => {
      const p = priceResult.map.get(meta.symbol);
      return {
        symbol:    meta.symbol,
        category:  meta.category,
        weight:    PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
        stakeable: meta.stakeable,
        lendable:  meta.lendable,
        yieldable: meta.yieldable,
        priceUsd:  p?.priceUsd  ?? 0,
        change24h: p?.change24h ?? 0,
        change7d:  p?.change7d  ?? 0,
        volume24h: p?.volume24h ?? 0,
        marketCap: p?.marketCap ?? 0,
        athChange: p?.athChange ?? 0,
      };
    });

    // Determine market regime from BTC + ETH
    const btcIn = allInputs.find(a => a.symbol === 'BTC');
    const ethIn = allInputs.find(a => a.symbol === 'ETH');
    const regime = getRegime(
      (btcIn?.change24h ?? 0) * 100,
      (ethIn?.change24h ?? 0) * 100,
      (btcIn?.change7d  ?? 0) * 100,
      (ethIn?.change7d  ?? 0) * 100,
    );

    // Score every asset with the real 5-engine brain
    const scored = allInputs.map(inp => scoreAsset(inp, regime, fg, allInputs));

    // Map to signal response
    const signals = scored.map(s => ({
      symbol:     s.symbol,
      address:    getAssetAddress(s.symbol),
      signal:     s.action,
      signalCode: s.action === 'BUY' ? 1 : s.action === 'SELL' || s.action === 'REDUCE' ? 2 : 0,
      score:      parseFloat(s.finalScore.toFixed(4)),
      action:     s.action,
      confidence: parseFloat(s.finalScore.toFixed(4)),
      reasons:    s.reasons ?? [],
      priceUsd:   allInputs.find(a => a.symbol === s.symbol)?.priceUsd ?? 0,
      change24h:  allInputs.find(a => a.symbol === s.symbol)?.change24h ?? 0,
      change7d:   allInputs.find(a => a.symbol === s.symbol)?.change7d ?? 0,
    }));

    const activeSignals = signals.filter(s => s.signal !== 'HOLD' && s.signal !== 'SKIP');
    const buys  = signals.filter(s => s.signal === 'BUY').length;
    const sells = signals.filter(s => s.signal === 'SELL' || s.signal === 'REDUCE').length;

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({
      timestamp:     new Date().toISOString(),
      regime,
      fearGreed:     fg,
      totalAssets:   signals.length,
      activeSignals: activeSignals.length,
      buys,
      sells,
      signals:       activeSignals,
      allSignals:    signals,
    });
  } catch (error: any) {
    console.error('Signals API error:', error);
    res.status(500).json({ error: 'Failed to generate signals', details: error.message });
  }
}

// Map symbols to their primary Ethereum mainnet ERC-20 addresses
function getAssetAddress(symbol: string): string {
  const addresses: Record<string, string> = {
    BTC:    '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
    ETH:    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    BNB:    '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
    USDC:   '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    LINK:   '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    UNI:    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    AAVE:   '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    LDO:    '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
    MATIC:  '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
    POL:    '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6',
    ENA:    '0x57e114B691Db790C35207b2e685D4A43181e6061',
    PAXG:   '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
    FET:    '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85',
    RNDR:   '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24',
    GRT:    '0xc944E90C64B2c07662A292be6244BDf05Cda44a7',
    FIL:    '0x0D8775F648430679A709E98d2b0Cb6250d2887EF',
    TAO:    '',
    NEAR:   '',
    SOL:    '',
    ADA:    '',
    XRP:    '',
    TRX:    '',
    DOT:    '',
    ATOM:   '',
    AVAX:   '',
    SUI:    '',
    ICP:    '',
    HBAR:   '',
    XLM:    '',
    LTC:    '',
    BCH:    '',
    ETC:    '',
    XMR:    '',
    ZEC:    '',
    ALGO:   '',
  };
  return addresses[symbol] ?? '';
}
