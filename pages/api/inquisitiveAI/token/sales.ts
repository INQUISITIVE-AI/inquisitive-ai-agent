import type { NextApiRequest, NextApiResponse } from 'next';
import { getOnchain, VAULT_ADDR, DEPLOYER_ADDR, INQAI_ADDR } from '../_onchainCache';
import { getPrices } from '../_priceCache';

// ── INQAI Real Token Sales & Market Cap ──────────────────────────────────────
// Computes LIVE on-chain metrics:
//   - Tokens sold = totalSupply - deployerBalance (real circulating supply)
//   - AUM = vault ETH × ETH price + vault USDC
//   - Market cap = circulatingSupply × navPerToken
//   - Sales history from Etherscan transaction logs
// All data sourced from Ethereum mainnet via RPC + Etherscan.

const ETHERSCAN_KEY    = process.env.ETHERSCAN_API_KEY || '';
const PRESALE_PRICE    = parseFloat(process.env.NEXT_PUBLIC_PRESALE_PRICE  || '8');
const TARGET_PRICE     = parseFloat(process.env.NEXT_PUBLIC_TARGET_PRICE   || '15');
const TOTAL_SUPPLY     = parseInt(process.env.NEXT_PUBLIC_TOTAL_SUPPLY     || '100000000');
const DEPLOYMENT_BLOCK = process.env.DEPLOYMENT_BLOCK || '21993900';

export const config = { maxDuration: 30 };

// Fetch real ETH deposit transactions to the deployer/vault from Etherscan
async function fetchDeposits(): Promise<any[]> {
  if (!ETHERSCAN_KEY) return [];
  try {
    const [vaultTxs, deployerTxs] = await Promise.allSettled([
      fetch(
        `https://api.etherscan.io/api?module=account&action=txlist` +
        `&address=${VAULT_ADDR}&startblock=${DEPLOYMENT_BLOCK}&endblock=99999999` +
        `&page=1&offset=50&sort=desc&apikey=${ETHERSCAN_KEY}`,
        { signal: AbortSignal.timeout(8000) }
      ).then(r => r.json()),
      fetch(
        `https://api.etherscan.io/api?module=account&action=txlist` +
        `&address=${DEPLOYER_ADDR}&startblock=${DEPLOYMENT_BLOCK}&endblock=99999999` +
        `&page=1&offset=50&sort=desc&apikey=${ETHERSCAN_KEY}`,
        { signal: AbortSignal.timeout(8000) }
      ).then(r => r.json()),
    ]);

    const vaultList    = vaultTxs.status    === 'fulfilled' && vaultTxs.value?.status    === '1' ? vaultTxs.value.result    : [];
    const deployerList = deployerTxs.status === 'fulfilled' && deployerTxs.value?.status === '1' ? deployerTxs.value.result : [];

    // Incoming ETH to vault or deployer = purchases
    const allIncoming = [
      ...vaultList.filter   ((tx: any) => tx.to?.toLowerCase()   === VAULT_ADDR.toLowerCase()    && BigInt(tx.value || 0) > 0n),
      ...deployerList.filter((tx: any) => tx.to?.toLowerCase()   === DEPLOYER_ADDR.toLowerCase() && BigInt(tx.value || 0) > 0n),
    ];

    return allIncoming.sort((a: any, b: any) => parseInt(b.timeStamp) - parseInt(a.timeStamp));
  } catch {
    return [];
  }
}

// Fetch USDC transfers to vault/deployer
async function fetchUsdcDeposits(): Promise<any[]> {
  if (!ETHERSCAN_KEY) return [];
  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  try {
    const [vaultUsdc, deployerUsdc] = await Promise.allSettled([
      fetch(
        `https://api.etherscan.io/api?module=account&action=tokentx` +
        `&contractaddress=${USDC}&address=${VAULT_ADDR}` +
        `&startblock=21993900&page=1&offset=50&sort=desc&apikey=${ETHERSCAN_KEY}`,
        { signal: AbortSignal.timeout(8000) }
      ).then(r => r.json()),
      fetch(
        `https://api.etherscan.io/api?module=account&action=tokentx` +
        `&contractaddress=${USDC}&address=${DEPLOYER_ADDR}` +
        `&startblock=21993900&page=1&offset=50&sort=desc&apikey=${ETHERSCAN_KEY}`,
        { signal: AbortSignal.timeout(8000) }
      ).then(r => r.json()),
    ]);
    const vList = vaultUsdc.status    === 'fulfilled' && vaultUsdc.value?.status    === '1' ? vaultUsdc.value.result    : [];
    const dList = deployerUsdc.status === 'fulfilled' && deployerUsdc.value?.status === '1' ? deployerUsdc.value.result : [];
    return [...vList, ...dList].filter((tx: any) =>
      tx.to?.toLowerCase() === VAULT_ADDR.toLowerCase() ||
      tx.to?.toLowerCase() === DEPLOYER_ADDR.toLowerCase()
    );
  } catch {
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [snap, priceResult, ethDeposits, usdcDeposits] = await Promise.all([
      getOnchain(),
      getPrices(),
      fetchDeposits(),
      fetchUsdcDeposits(),
    ]);

    const ethPrice = priceResult.map.get('ETH')?.priceUsd ?? 3200;

    // ── Real on-chain token economics ─────────────────────────────────────────
    const totalSupply        = snap.totalSupply || TOTAL_SUPPLY;
    const circulatingSupply  = snap.circulatingSupply;   // totalSupply - deployerBalance
    const tokensSold         = circulatingSupply;
    const deployerBalance    = snap.deployerInqai;
    const tokensSoldPct      = totalSupply > 0 ? (tokensSold / totalSupply) * 100 : 0;
    const tokensRemaining    = Math.max(0, totalSupply - tokensSold);

    // ── AUM from on-chain vault balances ──────────────────────────────────────
    const vaultEth  = snap.vaultEth;
    const vaultUsdc = snap.vaultUsdc;
    const aumUSD    = vaultEth * ethPrice + vaultUsdc;

    // ── NAV per token ─────────────────────────────────────────────────────────
    const navPerToken = circulatingSupply > 0 && aumUSD > 0
      ? aumUSD / circulatingSupply
      : PRESALE_PRICE;

    // ── Market cap (circulating supply × current price) ───────────────────────
    const marketCapUSD   = circulatingSupply * navPerToken;
    const fdvUSD         = totalSupply * navPerToken;          // fully diluted

    // ── Parse ETH deposits into purchase records ──────────────────────────────
    const ethPurchases = ethDeposits.slice(0, 20).map((tx: any) => {
      const ethAmt   = parseFloat(tx.value) / 1e18;
      const usdVal   = ethAmt * ethPrice;
      const inqaiAmt = usdVal / PRESALE_PRICE;
      return {
        type:     'ETH',
        hash:     tx.hash,
        from:     tx.from,
        ethAmount: parseFloat(ethAmt.toFixed(6)),
        usdValue:  parseFloat(usdVal.toFixed(2)),
        inqaiAmount: parseFloat(inqaiAmt.toFixed(2)),
        timestamp: parseInt(tx.timeStamp) * 1000,
        status:   tx.txreceipt_status === '1' ? 'confirmed' : 'pending',
        etherscan: `https://etherscan.io/tx/${tx.hash}`,
      };
    });

    const usdcPurchases = usdcDeposits.slice(0, 10).map((tx: any) => {
      const usdcAmt  = parseFloat(tx.value) / 1e6;
      const inqaiAmt = usdcAmt / PRESALE_PRICE;
      return {
        type:       'USDC',
        hash:       tx.hash,
        from:       tx.from,
        usdValue:   parseFloat(usdcAmt.toFixed(2)),
        inqaiAmount: parseFloat(inqaiAmt.toFixed(2)),
        timestamp:  parseInt(tx.timeStamp) * 1000,
        status:     'confirmed',
        etherscan:  `https://etherscan.io/tx/${tx.hash}`,
      };
    });

    const allPurchases = [...ethPurchases, ...usdcPurchases]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 25);

    const totalEthRaised  = ethDeposits.reduce((s: number, tx: any) => s + parseFloat(tx.value) / 1e18, 0);
    const totalUsdcRaised = usdcDeposits.reduce((s: number, tx: any) => s + parseFloat(tx.value) / 1e6, 0);
    const totalUsdRaised  = totalEthRaised * ethPrice + totalUsdcRaised;

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({
      onChain: true,
      token: {
        symbol:          'INQAI',
        address:         INQAI_ADDR,
        totalSupply,
        circulatingSupply,
        tokensSold,
        tokensSoldPct:   parseFloat(tokensSoldPct.toFixed(4)),
        tokensRemaining,
        deployerBalance,
        presalePrice:    PRESALE_PRICE,
        targetPrice:     TARGET_PRICE,
        navPerToken:     parseFloat(navPerToken.toFixed(6)),
      },
      marketCap: {
        circulatingUSD:  parseFloat(marketCapUSD.toFixed(2)),
        fullyDilutedUSD: parseFloat(fdvUSD.toFixed(2)),
        aumUSD:          parseFloat(aumUSD.toFixed(2)),
        vaultEth:        parseFloat(vaultEth.toFixed(6)),
        vaultUsdc:       parseFloat(vaultUsdc.toFixed(2)),
        ethPrice:        parseFloat(ethPrice.toFixed(2)),
      },
      fundraise: {
        totalEthRaised:  parseFloat(totalEthRaised.toFixed(6)),
        totalUsdcRaised: parseFloat(totalUsdcRaised.toFixed(2)),
        totalUsdRaised:  parseFloat(totalUsdRaised.toFixed(2)),
        purchaseCount:   allPurchases.length,
      },
      recentPurchases: allPurchases,
      vault: {
        address:           VAULT_ADDR,
        deployer:          DEPLOYER_ADDR,
        portfolioLength:   snap.portfolioLength,
        cycleCount:        snap.cycleCount,
        automationEnabled: snap.automationEnabled,
        stale:             snap.stale,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[sales] error:', err.message);
    res.status(500).json({ error: 'Failed to fetch token sales data', details: err.message });
  }
}
