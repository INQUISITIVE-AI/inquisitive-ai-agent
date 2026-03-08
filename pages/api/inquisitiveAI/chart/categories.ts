import type { NextApiRequest, NextApiResponse } from 'next';

// Portfolio weights from ASSET_REGISTRY (mirrors priceFeed.js PORTFOLIO_WEIGHTS)
const WEIGHTS: Record<string, { cat: string; w: number }> = {
  BTC:{cat:'major',w:18},  ETH:{cat:'major',w:12},  SOL:{cat:'major',w:8},   BNB:{cat:'major',w:5},
  XRP:{cat:'major',w:4},   ADA:{cat:'major',w:3},   AVAX:{cat:'major',w:3},  SUI:{cat:'major',w:2},
  DOT:{cat:'interop',w:2}, NEAR:{cat:'major',w:1},  ICP:{cat:'major',w:1},   TRX:{cat:'major',w:1},
  HBAR:{cat:'major',w:0.5},BCH:{cat:'major',w:0.5}, ETC:{cat:'major',w:0.5}, VET:{cat:'major',w:0.25},
  EOS:{cat:'major',w:0.1}, XTZ:{cat:'major',w:0.25},XDC:{cat:'major',w:0.1}, ALGO:{cat:'major',w:0.25},
  AAVE:{cat:'defi',w:2},   UNI:{cat:'defi',w:2},    LDO:{cat:'defi',w:1.5},  ENA:{cat:'defi',w:1},
  INJ:{cat:'defi',w:1},    JUP:{cat:'defi',w:1},    HYPE:{cat:'defi',w:1},   SKY:{cat:'defi',w:0.5},
  GRT:{cat:'data',w:0.5},  RUNE:{cat:'defi',w:0},   CRV:{cat:'defi',w:0},    SOIL:{cat:'defi',w:0.1},
  ARB:{cat:'l2',w:1.5},    OP:{cat:'l2',w:1},       POL:{cat:'l2',w:1},      STRK:{cat:'l2',w:0.5},
  STX:{cat:'l2',w:0.1},    FET:{cat:'ai',w:1},      RNDR:{cat:'ai',w:1},     TAO:{cat:'ai',w:1},
  LINK:{cat:'oracle',w:1}, PYTH:{cat:'oracle',w:0.1},ATOM:{cat:'interop',w:0.25},QNT:{cat:'interop',w:0.25},
  ZRO:{cat:'interop',w:0.25},DBR:{cat:'interop',w:0.1},USDC:{cat:'stablecoin',w:3},XSGD:{cat:'stablecoin',w:0.1},
  BRZ:{cat:'stablecoin',w:0.1},JPYC:{cat:'stablecoin',w:0.1},FDUSD:{cat:'stablecoin',w:0.1},
  PAXG:{cat:'rwa',w:1.5},  ONDO:{cat:'rwa',w:1},    JITOSOL:{cat:'liquid-stake',w:0.5},
  JUPSOL:{cat:'liquid-stake',w:0.5},MNDE:{cat:'liquid-stake',w:0.5},
  FIL:{cat:'storage',w:0.25},AR:{cat:'storage',w:0.25},
  XLM:{cat:'payment',w:0.5},LTC:{cat:'payment',w:0.5},ACH:{cat:'payment',w:0.1},
  XMR:{cat:'privacy',w:0.25},ZEC:{cat:'privacy',w:0.25},
  HNT:{cat:'iot',w:0.25},  HONEY:{cat:'iot',w:0.1}, CHZ:{cat:'gaming',w:0.25},
  CC:{cat:'institutional',w:0.1},
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const totals: Record<string, number> = {};
    for (const { cat, w } of Object.values(WEIGHTS)) {
      totals[cat] = (totals[cat] || 0) + w;
    }
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    const categories = Object.entries(totals)
      .map(([category, w]) => ({ category, mktCap: w, pct: +((w / total) * 100).toFixed(2) }))
      .sort((a, b) => b.mktCap - a.mktCap);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.status(200).json({ categories });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute categories' });
  }
}
