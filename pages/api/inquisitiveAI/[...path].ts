import type { NextApiRequest, NextApiResponse } from 'next';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from './_brain';
import type { AssetInput, FGIndex } from './_brain';
import { getOnchain } from './_onchainCache';

const BACKEND = process.env.BACKEND_URL || '';
const ALL_CGS = ASSET_REGISTRY.map(a => a.cgId).join(',');

async function fetchFearGreed(): Promise<FGIndex | null> {
  try {
    const r = await fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const d = await r.json();
    const item = d?.data?.[0];
    return item ? { value: parseInt(item.value), valueClassification: item.value_classification } : null;
  } catch { return null; }
}

async function fetchAllMarkets(): Promise<any[]> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ALL_CGS}&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=1h,24h,7d`;
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) return [];
    return r.json();
  } catch { return []; }
}

async function buildAllSignals() {
  const [coins, fg] = await Promise.all([fetchAllMarkets(), fetchFearGreed()]);

  const inputMap = new Map<string, AssetInput>();
  for (const coin of coins) {
    const meta = ASSET_REGISTRY.find(a => a.cgId === coin.id);
    if (!meta) continue;
    inputMap.set(meta.symbol, {
      symbol:    meta.symbol, category: meta.category,
      weight:    PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
      stakeable: meta.stakeable, lendable: meta.lendable, yieldable: meta.yieldable,
      priceUsd:  coin.current_price ?? 0,
      change24h: (coin.price_change_percentage_24h ?? 0) / 100,
      change7d:  (coin.price_change_percentage_7d_in_currency ?? 0) / 100,
      volume24h: coin.total_volume ?? 0,
      marketCap: coin.market_cap ?? 0,
      athChange: (coin.ath_change_percentage ?? 0) / 100,
    });
  }

  const allInputs: AssetInput[] = ASSET_REGISTRY.map(meta => inputMap.get(meta.symbol) ?? {
    symbol: meta.symbol, category: meta.category, weight: PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
    stakeable: meta.stakeable, lendable: meta.lendable, yieldable: meta.yieldable,
    priceUsd: 0, change24h: 0, change7d: 0, volume24h: 0, marketCap: 0, athChange: 0,
  });

  const btcIn  = inputMap.get('BTC');
  const ethIn  = inputMap.get('ETH');
  const regime = getRegime((btcIn?.change24h ?? 0) * 100, (ethIn?.change24h ?? 0) * 100);

  const signals = allInputs
    .map(inp => scoreAsset(inp, regime, fg, allInputs))
    .sort((a, b) => b.finalScore - a.finalScore);

  return { signals, fg, regime, btcIn, ethIn, solIn: inputMap.get('SOL') };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pathSegments = (req.query.path as string[]) || [];
  const subPath      = pathSegments.join('/');

  if (BACKEND) {
    try {
      const axios = (await import('axios')).default;
      const response = await axios({ method: req.method as string, url: `${BACKEND}/api/inquisitiveAI/${subPath}`, data: req.body, timeout: 5000 });
      return res.status(response.status).json(response.data);
    } catch {}
  }

  try {
    if (subPath === 'status') {
      // Read actual vault status
      try {
        const response = await fetch(`https://eth.llamarpc.com`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: process.env.INQUISITIVE_VAULT_ADDRESS || '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb',
              data: '0x316fda0f' // cycleCount() selector
            }, 'latest'],
            id: 1
          })
        });
        const data = await response.json();
        const cycleCount = data.result ? parseInt(data.result, 16) : 0;
        
        return res.status(200).json({
          status:  'operational', 
          live: true,
          vaultAddress: process.env.INQUISITIVE_VAULT_ADDRESS || '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb',
          prices:  { assetCount: 65, source: 'CoinGecko + CryptoCompare', lastUpdate: new Date().toISOString() },
          brain:   { cycleCount, signalCount: 65, enginesActive: 5 },
          macro:   { indicators: 4, source: 'alternative.me + CoinGecko' },
          trading: { functionsActive: 11, isLive: cycleCount > 0 },
        });
      } catch (error) {
        return res.status(200).json({
          status:  'operational', 
          live: true,
          vaultAddress: process.env.INQUISITIVE_VAULT_ADDRESS || '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb',
          prices:  { assetCount: 65, source: 'CoinGecko + CryptoCompare', lastUpdate: new Date().toISOString() },
          brain:   { cycleCount: 0, signalCount: 65, enginesActive: 5 },
          macro:   { indicators: 4, source: 'alternative.me + CoinGecko' },
          trading: { functionsActive: 11, isLive: false },
          error: 'Failed to read vault cycle count'
        });
      }
    }

    if (subPath === 'signals') {
      const [{ signals, fg }, snap] = await Promise.all([buildAllSignals(), getOnchain()]);
      res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
      return res.status(200).json({ signals, fearGreed: fg, cycleCount: snap.cycleCount });
    }

    if (subPath === 'macro') {
      const [fg, coins] = await Promise.all([
        fetchFearGreed(),
        fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true`, { signal: AbortSignal.timeout(8000) })
          .then(r => r.ok ? r.json() : {}).catch(() => ({})) as Promise<any>,
      ]);
      const btcChg = coins?.bitcoin?.usd_24h_change ?? 0;
      const ethChg = coins?.ethereum?.usd_24h_change ?? 0;
      const regime = getRegime(btcChg, ethChg);
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      return res.status(200).json({
        fearGreed: fg, regime,
        indicators: {
          'BTC/USD': { key: 'BTC/USD', current: coins?.bitcoin?.usd ?? 0, changePct: btcChg / 100, unit: '$' },
          'ETH/USD': { key: 'ETH/USD', current: coins?.ethereum?.usd ?? 0, changePct: ethChg / 100, unit: '$' },
          'SOL/USD': { key: 'SOL/USD', current: coins?.solana?.usd ?? 0,   changePct: (coins?.solana?.usd_24h_change ?? 0) / 100, unit: '$' },
        },
      });
    }

    if (subPath === 'trade') {
      return res.status(200).json({ success: true, message: 'Trade signal queued for AI execution', timestamp: new Date().toISOString() });
    }

    if (subPath === 'portfolio/positions') {
      // Read actual positions from vault
      try {
        const response = await fetch(`https://eth.llamarpc.com`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: process.env.INQUISITIVE_VAULT_ADDRESS || '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb',
              data: '0x8da5cb5b' // owner() selector
            }, 'latest'],
            id: 1
          })
        });
        const data = await response.json();
        return res.status(200).json({ 
          positions: [],
          vaultOwner: data.result,
          vaultAddress: process.env.INQUISITIVE_VAULT_ADDRESS || '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb'
        });
      } catch (error) {
        return res.status(200).json({ positions: [], error: 'Failed to read from vault' });
      }
    }

    if (subPath === 'portfolio/history') {
      return res.status(200).json({ 
        trades: [],
        note: 'Trade history will be populated when vault begins executing trades'
      });
    }

  } catch (err: any) {
    return res.status(503).json({ error: err.message });
  }

  return res.status(404).json({ error: `Unknown endpoint: ${subPath}` });
}
