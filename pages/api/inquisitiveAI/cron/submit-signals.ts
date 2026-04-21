// ── INQUISITIVE — Vercel-Automated Signal Submission ─────────────────────────
// Runs hourly via Vercel Cron. Signs and broadcasts submitSignalsBatch()
// to the InquisitiveVaultV2 contract on Ethereum mainnet, using a dedicated
// bot wallet whose private key is stored in the INQUISITIVE_BOT_PRIVATE_KEY
// env var. After signals are on-chain, Chainlink Automation picks them up on
// its next cron run and executes Uniswap V3 swaps via vault.performUpkeep().
//
// Prerequisites (one-time, user action):
//   1. Generate a bot wallet (use /vault-setup.html → card 8 → "Generate")
//   2. Add env var to Vercel: INQUISITIVE_BOT_PRIVATE_KEY (from step 1)
//   3. Set the vault's aiOracle to the bot wallet's address
//        (/vault-setup.html → card 3)
//   4. Send ~0.01 ETH to the bot wallet for gas
//
// After those 4 steps, trades execute fully autonomously — no server signer,
// no Trezor in the loop, no human babysitting.
//
// Security:
//   • Bot wallet can only call submitSignalsBatch (aiOracle-gated). It
//     CANNOT withdraw funds, transfer assets, or change admin settings.
//   • Cron endpoint requires either Vercel's x-vercel-cron header (auto)
//     OR Bearer auth with CRON_SECRET env var for manual invocation.

import type { NextApiRequest, NextApiResponse } from 'next';
import { createWalletClient, createPublicClient, http, encodeFunctionData, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

export const config = { maxDuration: 55 };

// ── On-chain constants ────────────────────────────────────────────────────────
const VAULT_ADDRESS = '0xb99dc519c4373e5017222bbd46f42a4e12a0ec25' as const;

// The 17 tracked assets — addresses MUST match the vault's getTrackedAssets()
// output AND chainlink-functions/source.js TRACKED_SYMBOLS in same order.
const SIGNAL_ASSET_ORDER: Array<{ symbol: string; addr: `0x${string}` }> = [
  { symbol: 'BTC',  addr: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' }, // WBTC
  { symbol: 'ETH',  addr: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' }, // WETH
  { symbol: 'ETH',  addr: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' }, // stETH (same signal as ETH)
  { symbol: 'USDC', addr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { symbol: 'LINK', addr: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
  { symbol: 'UNI',  addr: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
  { symbol: 'LDO',  addr: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32' },
  { symbol: 'GRT',  addr: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7' },
  { symbol: 'ARB',  addr: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1' },
  { symbol: 'ENA',  addr: '0x57e114B691Db790C35207b2e685D4A43181e6061' },
  { symbol: 'ONDO', addr: '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3' },
  { symbol: 'MKR',  addr: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2' },
  { symbol: 'ENS',  addr: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72' },
  { symbol: 'COMP', addr: '0xc00e94Cb662C3520282E6f5717214004A7f26888' },
  { symbol: 'CRV',  addr: '0xD533a949740bb3306d119CC777fa900bA034cd52' },
  { symbol: 'CVX',  addr: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B' },
  { symbol: 'BAL',  addr: '0xba100000625a3754423978a60c9317c58a424e3D' },
];

// Minimal ABI we need
const VAULT_ABI = [
  {
    type: 'function',
    name: 'submitSignalsBatch',
    inputs: [
      { name: 'assets',  type: 'address[]' },
      { name: 'signals', type: 'uint8[]'   },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'aiOracle',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'automationEnabled',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

// ── Auth check ────────────────────────────────────────────────────────────────
// Vercel Cron automatically sends x-vercel-cron header. For manual/external
// invocation we also accept Bearer <CRON_SECRET>.
function isAuthorized(req: NextApiRequest): boolean {
  if (req.headers['x-vercel-cron']) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev / local — allow
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${secret}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const started = Date.now();

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pk = process.env.INQUISITIVE_BOT_PRIVATE_KEY;
  if (!pk) {
    return res.status(503).json({
      error: 'INQUISITIVE_BOT_PRIVATE_KEY not configured',
      hint:  'Add the env var in Vercel → Settings → Environment Variables. Generate a key at /vault-setup.html card 8.',
      readiness: 'bot-wallet-not-set-up',
    });
  }

  // Normalize key (accept with or without 0x prefix)
  const privateKey = (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    return res.status(500).json({ error: 'INQUISITIVE_BOT_PRIVATE_KEY is malformed (expect 32-byte hex)' });
  }

  const rpcUrl = process.env.MAINNET_RPC_URL
              || process.env.INFURA_RPC_URL
              || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868';

  let account, walletClient, publicClient;
  try {
    account = privateKeyToAccount(privateKey);
    walletClient = createWalletClient({ account, chain: mainnet, transport: http(rpcUrl) });
    publicClient = createPublicClient({ chain: mainnet, transport: http(rpcUrl) });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to initialise wallet', detail: e?.message });
  }

  try {
    // 1. Sanity checks — is the vault ready for signals from us?
    const [onchainAIOracle, automationEnabled, botBalance] = await Promise.all([
      publicClient.readContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'aiOracle' }) as Promise<`0x${string}`>,
      publicClient.readContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'automationEnabled' }) as Promise<boolean>,
      publicClient.getBalance({ address: account.address }),
    ]);

    const oracleOK = onchainAIOracle.toLowerCase() === account.address.toLowerCase();
    const botEth = Number(formatEther(botBalance));

    if (!oracleOK) {
      return res.status(412).json({
        error: 'Vault aiOracle does not match bot wallet',
        detail: {
          botAddress: account.address,
          onchainAIOracle,
          fix: `Call vault.setAIOracle(${account.address}) from the current owner (see /vault-setup.html card 3).`,
        },
        readiness: 'aioracle-mismatch',
      });
    }
    if (!automationEnabled) {
      return res.status(412).json({
        error: 'Vault automationEnabled is false',
        fix:   'Call vault.setAutomationEnabled(true) from the owner (see /vault-setup.html card 4).',
        readiness: 'automation-disabled',
      });
    }
    if (botEth < 0.0005) {
      return res.status(412).json({
        error: 'Bot wallet ETH too low for gas',
        detail: { botAddress: account.address, balanceEth: botEth },
        fix:   `Send ~0.01 ETH to ${account.address} to fund gas (covers ~100 submissions at current gwei).`,
        readiness: 'bot-wallet-underfunded',
      });
    }

    // 2. Fetch live AI signals from the brain
    const origin = req.headers.host
      ? `https://${req.headers.host}`
      : process.env.NEXT_PUBLIC_API_URL || 'https://getinqai.com';
    const oracleResp = await fetch(`${origin}/api/inquisitiveAI/cron/oracle`, {
      headers: { 'user-agent': 'inquisitive-cron-submit-signals/1.0' },
    });
    if (!oracleResp.ok) {
      return res.status(502).json({ error: 'AI oracle endpoint failed', status: oracleResp.status });
    }
    const oracle = await oracleResp.json();
    if (!oracle.success || !Array.isArray(oracle.signals)) {
      return res.status(502).json({ error: 'AI oracle returned malformed payload' });
    }

    const bySymbol: Record<string, number> = {};
    for (const s of oracle.signals) bySymbol[s.symbol] = s.signal ?? 0;

    const assets  = SIGNAL_ASSET_ORDER.map(x => x.addr);
    const signals = SIGNAL_ASSET_ORDER.map(x => bySymbol[x.symbol] ?? 0);

    const buyCount  = signals.filter(s => s === 1).length;
    const sellCount = signals.filter(s => s === 2).length;
    const holdCount = signals.filter(s => s === 0).length;

    // 3. Estimate gas (safety) and build EIP-1559 fees
    const calldata = encodeFunctionData({
      abi: VAULT_ABI,
      functionName: 'submitSignalsBatch',
      args: [assets as readonly `0x${string}`[], signals as unknown as readonly number[]],
    });

    let gasEstimate: bigint;
    try {
      gasEstimate = await publicClient.estimateGas({
        account: account.address,
        to: VAULT_ADDRESS,
        data: calldata,
      });
    } catch (e: any) {
      return res.status(500).json({ error: 'Gas estimation failed', detail: e?.shortMessage || e?.message });
    }
    const gasLimit = (gasEstimate * 130n) / 100n; // +30% headroom

    const block = await publicClient.getBlock({ blockTag: 'latest' });
    const baseFee = block.baseFeePerGas ?? 2_000_000_000n;
    const priorityFee = 1_500_000_000n; // 1.5 gwei
    const maxFeePerGas = baseFee * 2n + priorityFee;

    // 4. Broadcast
    const txHash = await walletClient.writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'submitSignalsBatch',
      args: [assets as readonly `0x${string}`[], signals as unknown as readonly number[]],
      gas: gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas: priorityFee,
    });

    // 5. (Optional) Wait briefly for receipt — don't block the whole function
    let status: 'submitted' | 'confirmed' | 'unknown' = 'submitted';
    let blockNumber: number | undefined;
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 35_000,
        pollingInterval: 2_000,
      });
      status = receipt.status === 'success' ? 'confirmed' : 'unknown';
      blockNumber = Number(receipt.blockNumber);
    } catch {
      status = 'submitted';
    }

    return res.status(200).json({
      success:    true,
      status,
      txHash,
      blockNumber,
      etherscan:  `https://etherscan.io/tx/${txHash}`,
      bot:        account.address,
      botEth,
      vault:      VAULT_ADDRESS,
      regime:     oracle.regime,
      fng:        oracle.fng,
      submitted:  { buys: buyCount, sells: sellCount, holds: holdCount, total: signals.length },
      gasLimit:   gasLimit.toString(),
      maxFeeGwei: Number(maxFeePerGas) / 1e9,
      elapsedMs:  Date.now() - started,
      ts:         new Date().toISOString(),
    });

  } catch (e: any) {
    console.error('[cron/submit-signals]', e);
    return res.status(500).json({
      error:  'submitSignalsBatch failed',
      detail: e?.shortMessage || e?.message || String(e),
      elapsedMs: Date.now() - started,
    });
  }
}
