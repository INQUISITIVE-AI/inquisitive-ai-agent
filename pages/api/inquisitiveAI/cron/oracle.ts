// ── INQUISITIVE — Autonomous AI Oracle Cron ──────────────────────────────────
// Runs every 5 minutes via Vercel Cron (configured in vercel.json).
// 1. Fetches live prices + Fear & Greed index
// 2. Runs 5-engine AI brain on all 66 assets
// 3. Reads tracked assets from VaultV2
// 4. Submits BUY/SELL/HOLD signals via submitSignalsBatch()
// 5. Calls performUpkeep() if Chainlink automation reports it is needed
//
// Required Vercel env vars:
//   ORACLE_PRIVATE_KEY   — deployer private key (0x...) for signing txs
//   CRON_SECRET          — token Vercel adds as Authorization: Bearer <secret>
//   MAINNET_RPC_URL      — optional, falls back to public RPCs

import type { NextApiRequest, NextApiResponse } from 'next';
import { createWalletClient, createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import VAULT_ABI from '../../../../abi-vault-v2.json';
import { ASSET_REGISTRY, PORTFOLIO_WEIGHTS, scoreAsset, getRegime } from '../_brain';
import type { AssetInput, FGIndex } from '../_brain';
import { getPrices } from '../_priceCache';

export const config = { maxDuration: 55 };

const VAULT_ADDR = (
  process.env.NEXT_PUBLIC_VAULT_V2_ADDRESS ||
  process.env.INQUISITIVE_VAULT_ADDRESS    ||
  '0xb99dc519c4373e5017222bbd46f42a4e12a0ec25'
) as `0x${string}`;

// Map of lowercase ERC-20 address → AI brain symbol
// Only assets that are (or could be) tracked in the vault on Ethereum mainnet
const ADDR_TO_SYMBOL: Record<string, string> = {
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'ETH',   // WETH
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'BTC',   // WBTC
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',  // USDC
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'LINK',  // Chainlink
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'UNI',   // Uniswap
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'AAVE',  // Aave
  '0x5a98fcbea516cf06857215779fd812ca3bef1b32': 'LDO',   // Lido DAO
  '0xc944e90c64b2c07662a292be6244bdf05cda44a7': 'GRT',   // The Graph
  '0x57e114b691db790c35207b2e685d4a43181e6061': 'ENA',   // Ethena
  '0xfaba6f8e4a5e8ab82f62fe7c39859fa577269be3': 'ONDO',  // Ondo Finance
  '0x5283d291dbcf85356a21ba090934d823c5ef2d84': 'BLUR',  // Blur (reserve)
  '0xba100000625a3754423978a60c9317c58a424e3d': 'BAL',   // Balancer
  '0x0f5d2fb29fb7d3cfee444a200298f468908cc942': 'MANA',  // Decentraland
  '0x6810e776880c02933d47db1b9fc05908e5386b96': 'GNO',   // Gnosis
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'STETH', // stETH (Lido)
  '0xd533a949740bb3306d119cc777fa900ba034cd52': 'CRV',   // Curve
  '0x4d224452801aced8b2f0aebe155379bb5d594381': 'APE',   // ApeCoin
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': 'MATIC', // Polygon (old)
  '0x0d8775f648430679a709e98d2b0cb6250d2887ef': 'BAT',   // Basic Attention
};

// Build VEM transport with fallback
function buildTransport() {
  const urls = [
    process.env.MAINNET_RPC_URL,
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
  ].filter(Boolean) as string[];
  return http(urls[0]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const privateKey = process.env.ORACLE_PRIVATE_KEY as `0x${string}` | undefined;
  if (!privateKey || !privateKey.startsWith('0x')) {
    return res.status(200).json({
      skipped: true,
      reason: 'ORACLE_PRIVATE_KEY not configured in Vercel environment variables.',
      action: 'Add ORACLE_PRIVATE_KEY to Vercel project settings to enable autonomous execution.',
    });
  }

  try {
    const transport    = buildTransport();
    const publicClient = createPublicClient({ chain: mainnet, transport });

    // 1. Read tracked assets from VaultV2
    const trackedAssets = (await publicClient.readContract({
      address: VAULT_ADDR,
      abi:     VAULT_ABI as any,
      functionName: 'getTrackedAssets',
    })) as `0x${string}`[];

    if (!trackedAssets || trackedAssets.length === 0) {
      return res.status(200).json({
        skipped: true,
        reason:  'No assets tracked in VaultV2 yet.',
        action:  'Call addTrackedAsset(address) on the vault to register ERC-20 tokens.',
        vault:   VAULT_ADDR,
      });
    }

    // 2. Compute live AI signals for all 66 assets
    const [priceResult, fgRaw] = await Promise.all([
      getPrices(),
      fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(6000) })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    let fg: FGIndex | null = null;
    if (fgRaw?.data?.[0]) {
      fg = {
        value: parseInt(fgRaw.data[0].value),
        valueClassification: fgRaw.data[0].value_classification,
      };
    }

    const allInputs: AssetInput[] = ASSET_REGISTRY.map(meta => {
      const p = priceResult.map.get(meta.symbol);
      return {
        symbol: meta.symbol, category: meta.category,
        weight: PORTFOLIO_WEIGHTS[meta.symbol] ?? 0,
        stakeable: meta.stakeable, lendable: meta.lendable, yieldable: meta.yieldable,
        priceUsd:  p?.priceUsd  ?? 0,
        change24h: p?.change24h ?? 0,
        change7d:  p?.change7d  ?? 0,
        volume24h: p?.volume24h ?? 0,
        marketCap: p?.marketCap ?? 0,
        athChange: p?.athChange ?? 0,
      };
    });

    const btcIn  = allInputs.find(a => a.symbol === 'BTC');
    const ethIn  = allInputs.find(a => a.symbol === 'ETH');
    const regime = getRegime(
      (btcIn?.change24h ?? 0) * 100, (ethIn?.change24h ?? 0) * 100,
      (btcIn?.change7d  ?? 0) * 100, (ethIn?.change7d  ?? 0) * 100,
    );

    const scored      = allInputs.map(inp => scoreAsset(inp, regime, fg, allInputs));
    const signalBySymbol = new Map(scored.map(s => [
      s.symbol,
      s.action === 'BUY' ? 1 : (s.action === 'SELL' || s.action === 'REDUCE' ? 2 : 0),
    ]));

    // 3. Map tracked vault assets → signals
    const batchAddrs:   `0x${string}`[] = [];
    const batchSignals: number[]         = [];
    for (const addr of trackedAssets) {
      const symbol = ADDR_TO_SYMBOL[addr.toLowerCase()];
      batchAddrs.push(addr);
      batchSignals.push(symbol ? (signalBySymbol.get(symbol) ?? 0) : 0);
    }

    // 4. Submit signals on-chain
    const account      = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({ account, chain: mainnet, transport });

    const signalsTx = await walletClient.writeContract({
      address:      VAULT_ADDR,
      abi:          VAULT_ABI as any,
      functionName: 'submitSignalsBatch',
      args:         [batchAddrs, batchSignals],
    });

    // 5. Check if vault wants to execute trades; trigger if so
    let upkeepTx: string | null = null;
    try {
      const [upkeepNeeded] = (await publicClient.readContract({
        address:      VAULT_ADDR,
        abi:          VAULT_ABI as any,
        functionName: 'checkUpkeep',
        args:         ['0x'],
      })) as [boolean, `0x${string}`];

      if (upkeepNeeded) {
        upkeepTx = await walletClient.writeContract({
          address:      VAULT_ADDR,
          abi:          VAULT_ABI as any,
          functionName: 'performUpkeep',
          args:         ['0x'],
        });
      }
    } catch { /* upkeep check is best-effort */ }

    const buys  = batchSignals.filter(s => s === 1).length;
    const sells = batchSignals.filter(s => s === 2).length;

    return res.status(200).json({
      success: true,
      regime,
      trackedAssets: batchAddrs.length,
      signals: { buys, sells, hold: batchAddrs.length - buys - sells },
      signalsTx,
      upkeepTx,
      ts: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error('[cron/oracle]', err);
    return res.status(500).json({ error: err.shortMessage || err.message || 'Oracle failed' });
  }
}
