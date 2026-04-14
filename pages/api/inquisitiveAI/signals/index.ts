import { NextApiRequest, NextApiResponse } from 'next';
import { brainScoreAll, ASSET_REGISTRY } from '../_brain';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get live price data (simplified - in production fetch from CoinGecko)
    const assetsWithPrices = await fetchLivePrices();
    
    // Generate scores using brain
    const scored = brainScoreAll(assetsWithPrices);
    
    // Convert to trading signals
    // BUY = score > 0.7, SELL = score < 0.3, HOLD = 0.3-0.7
    const signals = scored.map((asset: any) => {
      let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let signalCode = 0; // 0=HOLD, 1=BUY, 2=SELL
      
      if (asset.score > 0.7) {
        signal = 'BUY';
        signalCode = 1;
      } else if (asset.score < 0.3) {
        signal = 'SELL';
        signalCode = 2;
      }
      
      return {
        symbol: asset.symbol,
        address: asset.address,
        signal,
        signalCode,
        score: asset.score,
        reasons: asset.reasons,
        priceUsd: asset.priceUsd,
        change24h: asset.change24h,
        confidence: asset.confidence
      };
    });

    // Only return assets with non-HOLD signals
    const activeSignals = signals.filter((s: any) => s.signal !== 'HOLD');

    res.status(200).json({
      timestamp: new Date().toISOString(),
      regime: scored[0]?.regime || 'NEUTRAL',
      totalAssets: signals.length,
      activeSignals: activeSignals.length,
      signals: activeSignals
    });
  } catch (error) {
    console.error('Signals API error:', error);
    res.status(500).json({ error: 'Failed to generate signals' });
  }
}

// Helper to fetch live prices and map to addresses
async function fetchLivePrices() {
  // In production: fetch from CoinGecko API
  // For now, return registry with placeholder data
  // This would be integrated with your existing price feeds
  
  return ASSET_REGISTRY.slice(0, 32).map(asset => ({
    ...asset,
    priceUsd: 100, // Placeholder - use real price feed
    change24h: 0,
    change7d: 0,
    volume24h: 1000000,
    marketCap: 100000000,
    athChange: -0.5,
    address: getAssetAddress(asset.symbol)
  }));
}

// Map symbols to on-chain addresses
function getAssetAddress(symbol: string): string {
  const addresses: Record<string, string> = {
    'BTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    'ETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    'SOL': '', // Cross-chain only
    'BNB': '', // Cross-chain only
    'XRP': '', // Cross-chain only
    'ADA': '', // Cross-chain only
    'AVAX': '', // Cross-chain only
    'AAVE': '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    'UNI': '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    'LINK': '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    'ARB': '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
    'OP': '0x4200000000000000000000000000000000000042',
    'LDO': '0x5A98FcBEA516Cf06857215779Fd802CA3FEdeF3D7',
    'GRT': '0x1f573d6Fb3F13d689FF844B4cE37794d79a7FF1C',
    'CRV': '0xD533a949740bb3306d119CC777fa900bA034cd52',
    'SNX': '0xD417144312DbF50465b1C641d016962017Ef6240',
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  };
  return addresses[symbol] || '';
}
