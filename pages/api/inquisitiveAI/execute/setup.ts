import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

// ── INQUISITIVE — Vault Activation API ───────────────────────────────────────
// Calls setPortfolio() + setPhase2Registry() + setAutomationEnabled(true) on-chain.
// Requires EXECUTOR_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) to be the vault owner.
// Safe to call repeatedly — each step is idempotent (skipped if already done).
// Called by Vercel Cron every 5 min until vault is fully configured.
// maxDuration: 300s to allow for slow mainnet tx confirmations.

export const config = { maxDuration: 300 };

const VAULT_ADDR = process.env.INQUISITIVE_VAULT_ADDRESS || '0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52';
const RPC_URLS = [
  process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
];

const VAULT_ABI = [
  'function owner() external view returns (address)',
  'function getPortfolioLength() external view returns (uint256)',
  'function getPhase2Length() external view returns (uint256)',
  'function automationEnabled() external view returns (bool)',
  'function setPortfolio(address[] calldata _tokens, uint256[] calldata _weights, uint24[] calldata _fees) external',
  'function setPhase2Registry((bytes tokenAddr, uint256 chainId, bytes receiver, uint256 weightBps, string symbol)[] assets) external',
  'function setAutomationEnabled(bool _enabled) external',
];

// ── 26 ETH-mainnet ERC-20s: Uniswap V3 (same list as activate.js) ────────────
const PHASE1 = [
  { addr: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', fee: 3000, w: 3523 },
  { addr: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', fee: 100,  w: 2341 },
  { addr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', fee: 500,  w: 585  },
  { addr: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', fee: 3000, w: 390  },
  { addr: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', fee: 3000, w: 390  },
  { addr: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', fee: 3000, w: 292  },
  { addr: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1', fee: 3000, w: 292  },
  { addr: '0x45804880De22913dAFE09f4980848ECE6EcbAf78', fee: 3000, w: 292  },
  { addr: '0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30', fee: 3000, w: 195  },
  { addr: '0x57e114B691Db790C35207b2e685D4A43181e6061', fee: 3000, w: 195  },
  { addr: '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6', fee: 3000, w: 195  },
  { addr: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85', fee: 3000, w: 195  },
  { addr: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24', fee: 3000, w: 195  },
  { addr: '0x514910771AF9Ca656af840dff83E8264EcF986CA', fee: 3000, w: 195  },
  { addr: '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3', fee: 3000, w: 195  },
  { addr: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7', fee: 3000, w: 97   },
  { addr: '0x56072C95FAA701256059aa122697B133aDEd9279', fee: 3000, w: 97   },
  { addr: '0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766', fee: 3000, w: 97   },
  { addr: '0x4a220E6096B25EADb88358cb44068A3248254675', fee: 3000, w: 48   },
  { addr: '0x6985884C4392D348587B19cb9eAAf157F13271cd', fee: 3000, w: 48   },
  { addr: '0x3506424F91fD33084466F402d5D97f05F8e3b4AF', fee: 3000, w: 48   },
  { addr: '0x4E15361FD6b4BB609Fa63C81A2be19d873717870', fee: 3000, w: 19   },
  { addr: '0xdBe2C93A4e82a177617F4a43Ee1A69c69Ee8e7E6', fee: 3000, w: 19   },
  { addr: '0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96', fee: 3000, w: 19   },
  { addr: '0x420412E765BFa6d85aaaC94b4f7b708C89be2e2B', fee: 3000, w: 19   },
  { addr: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB', fee: 3000, w: 19   },
];

// ── Base58 decode (for Solana public keys and TRON addresses) ─────────────────
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Decode(s: string): Buffer {
  const bytes: number[] = [0];
  for (const c of s) {
    let carry = B58.indexOf(c);
    if (carry < 0) throw new Error(`Invalid base58 char: ${c}`);
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58; bytes[i] = carry & 0xff; carry >>= 8;
    }
    while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (const c of s) { if (c !== '1') break; bytes.push(0); }
  return Buffer.from(bytes.reverse());
}
function evmBytes(addr: string): Buffer { return Buffer.from(addr.replace('0x', ''), 'hex'); }

// ── 13 cross-chain assets via deBridge DLN ────────────────────────────────────
function buildPhase2Assets() {
  const SOL_WALLET = process.env.PORTFOLIO_WALLET_SOLANA  || process.env.PAYMENT_SOL_ADDRESS || '7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk';
  const BSC_WALLET = process.env.PORTFOLIO_WALLET_BSC      || process.env.DEPLOYER_ADDRESS    || '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';
  const AVA_WALLET = process.env.PORTFOLIO_WALLET_AVALANCHE|| process.env.DEPLOYER_ADDRESS    || '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';
  const OPT_WALLET = process.env.PORTFOLIO_WALLET_OPTIMISM || process.env.DEPLOYER_ADDRESS    || '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';
  const TRX_WALLET = process.env.PORTFOLIO_WALLET_TRON     || 'TDSkgbhuMAHChDw6kGCLJmM9v7PPMJgHJA';

  const solBuf = base58Decode(SOL_WALLET);
  const bscBuf = evmBytes(BSC_WALLET);
  const avaBuf = evmBytes(AVA_WALLET);
  const optBuf = evmBytes(OPT_WALLET);
  // TRON: base58 decode → strip 0x41 prefix byte and 4-byte checksum → 20 bytes
  const tronBuf = TRX_WALLET.startsWith('T')
    ? (() => { const b = base58Decode(TRX_WALLET); return b.slice(1, 21); })()
    : evmBytes(TRX_WALLET);

  return [
    { tokenAddr: base58Decode('So11111111111111111111111111111111111111112'),  chainId: 7565164n, receiver: solBuf, weightBps: 800n,  symbol: 'SOL'     },
    { tokenAddr: base58Decode('JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'), chainId: 7565164n, receiver: solBuf, weightBps: 100n,  symbol: 'JUP'     },
    { tokenAddr: base58Decode('J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn'),chainId: 7565164n, receiver: solBuf, weightBps: 50n,   symbol: 'JITOSOL' },
    { tokenAddr: base58Decode('jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v'), chainId: 7565164n, receiver: solBuf, weightBps: 50n,   symbol: 'JUPSOL'  },
    { tokenAddr: base58Decode('MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey'), chainId: 7565164n, receiver: solBuf, weightBps: 50n,   symbol: 'MNDE'    },
    { tokenAddr: base58Decode('4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy'), chainId: 7565164n, receiver: solBuf, weightBps: 10n,   symbol: 'HONEY'   },
    { tokenAddr: base58Decode('hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux'), chainId: 7565164n, receiver: solBuf, weightBps: 25n,   symbol: 'HNT'     },
    { tokenAddr: base58Decode('HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3'), chainId: 7565164n, receiver: solBuf, weightBps: 10n,   symbol: 'PYTH'    },
    { tokenAddr: evmBytes('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),        chainId: 56n,      receiver: bscBuf, weightBps: 500n,  symbol: 'BNB'     },
    { tokenAddr: evmBytes('0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409'),         chainId: 56n,      receiver: bscBuf, weightBps: 10n,   symbol: 'FDUSD'   },
    { tokenAddr: evmBytes('0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'),         chainId: 43114n,   receiver: avaBuf, weightBps: 300n,  symbol: 'AVAX'    },
    { tokenAddr: evmBytes('0x4200000000000000000000000000000000000042'),          chainId: 10n,      receiver: optBuf, weightBps: 100n,  symbol: 'OP'      },
    { tokenAddr: evmBytes('0x0000000000000000000000000000000000000000'),          chainId: 728126428n,receiver: tronBuf,weightBps: 100n,  symbol: 'TRX'     },
  ];
}

async function getProvider(): Promise<ethers.JsonRpcProvider> {
  for (const url of RPC_URLS) {
    try { const p = new ethers.JsonRpcProvider(url); await p.getBlockNumber(); return p; } catch {}
  }
  throw new Error('All RPC endpoints unavailable');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const isVercelCron = !!req.headers['x-vercel-cron'];
  const auth = req.headers['authorization'] || req.headers['x-cron-secret'];
  if (!isVercelCron && process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const rawKey = process.env.EXECUTOR_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || '';
  const key    = rawKey ? (rawKey.startsWith('0x') ? rawKey : '0x' + rawKey) : '';
  if (!key || key.length < 66) {
    return res.status(200).json({
      status:  'NO_KEY',
      message: 'Set EXECUTOR_PRIVATE_KEY (must be vault owner) in Vercel environment variables.',
      vault:   VAULT_ADDR,
      timestamp: new Date().toISOString(),
    });
  }

  let provider: ethers.JsonRpcProvider;
  try { provider = await getProvider(); } catch {
    return res.status(200).json({ status: 'RPC_UNAVAILABLE', timestamp: new Date().toISOString() });
  }

  const signer  = new ethers.Wallet(key, provider);
  const vault   = new ethers.Contract(VAULT_ADDR, VAULT_ABI, signer);
  const signerBal = parseFloat(ethers.formatEther(await provider.getBalance(signer.address).catch(() => 0n)));

  const owner = await vault.owner().catch(() => '') as string;
  if (owner && owner.toLowerCase() !== signer.address.toLowerCase()) {
    return res.status(200).json({
      status:        'NOT_OWNER',
      message:       `Key derives address ${signer.address} which is NOT the vault owner (${owner}). Setup functions require the owner key.`,
      signerAddress: signer.address,
      ownerAddress:  owner,
      signerETH:     signerBal,
      hint:          'If EXECUTOR_PRIVATE_KEY is a different key from the deployer, also set DEPLOYER_PRIVATE_KEY in Vercel env vars.',
      timestamp:     new Date().toISOString(),
    });
  }

  if (signerBal < 0.005) {
    return res.status(200).json({
      status:        'SIGNER_NO_GAS',
      message:       `Signer ${signer.address} has only ${signerBal.toFixed(6)} ETH — needs ≥0.005 ETH for setup gas fees.`,
      signerAddress: signer.address,
      signerETH:     signerBal,
      timestamp:     new Date().toISOString(),
    });
  }

  const feeData = await provider.getFeeData();
  const gasOpts = {
    maxFeePerGas:         feeData.maxFeePerGas         ? feeData.maxFeePerGas * 120n / 100n : undefined,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
  };

  const steps: any[] = [];

  // ── Step 1: setPortfolio() ────────────────────────────────────────────────
  const portLen = Number(await vault.getPortfolioLength().catch(() => 0n));
  if (portLen === 0) {
    try {
      const tokens  = PHASE1.map(t => ethers.getAddress(t.addr));
      const weights = PHASE1.map(t => BigInt(t.w));
      const fees    = PHASE1.map(t => t.fee);
      const tx = await vault.setPortfolio(tokens, weights, fees, { gasLimit: 800_000n, ...gasOpts });
      console.log(`[setup] setPortfolio tx: ${tx.hash}`);
      await tx.wait(1);
      steps.push({ action: 'setPortfolio', status: 'OK', txHash: tx.hash, assets: PHASE1.length });
    } catch (e: any) {
      steps.push({ action: 'setPortfolio', status: 'FAILED', error: e.message });
    }
  } else {
    steps.push({ action: 'setPortfolio', status: 'ALREADY_SET', assets: portLen });
  }

  // ── Step 2: setPhase2Registry() ──────────────────────────────────────────
  const p2Len = Number(await vault.getPhase2Length().catch(() => 0n));
  if (p2Len === 0) {
    try {
      const raw    = buildPhase2Assets();
      const assets = raw.map(a => ({
        tokenAddr: ('0x' + a.tokenAddr.toString('hex')) as `0x${string}`,
        chainId:   a.chainId,
        receiver:  ('0x' + a.receiver.toString('hex')) as `0x${string}`,
        weightBps: a.weightBps,
        symbol:    a.symbol,
      }));
      const tx2 = await vault.setPhase2Registry(assets, { gasLimit: 1_500_000n, ...gasOpts });
      console.log(`[setup] setPhase2Registry tx: ${tx2.hash}`);
      await tx2.wait(1);
      steps.push({ action: 'setPhase2Registry', status: 'OK', txHash: tx2.hash, assets: assets.length });
    } catch (e: any) {
      steps.push({ action: 'setPhase2Registry', status: 'FAILED', error: e.message });
    }
  } else {
    steps.push({ action: 'setPhase2Registry', status: 'ALREADY_SET', assets: p2Len });
  }

  // ── Step 3: setAutomationEnabled(true) ───────────────────────────────────
  const autoOn = await vault.automationEnabled().catch(() => false) as boolean;
  if (!autoOn) {
    try {
      const tx3 = await vault.setAutomationEnabled(true, { gasLimit: 100_000n, ...gasOpts });
      console.log(`[setup] setAutomationEnabled tx: ${tx3.hash}`);
      await tx3.wait(1);
      steps.push({ action: 'setAutomationEnabled', status: 'OK', txHash: tx3.hash });
    } catch (e: any) {
      steps.push({ action: 'setAutomationEnabled', status: 'FAILED', error: e.message });
    }
  } else {
    steps.push({ action: 'setAutomationEnabled', status: 'ALREADY_ENABLED' });
  }

  const allDone    = steps.every(s => s.status === 'OK' || s.status.startsWith('ALREADY'));
  const anyFailed  = steps.some(s => s.status === 'FAILED');

  return res.status(200).json({
    status:        allDone && !anyFailed ? 'SETUP_COMPLETE' : anyFailed ? 'SETUP_PARTIAL' : 'SETUP_COMPLETE',
    vault:         VAULT_ADDR,
    signerAddress: signer.address,
    signerETH:     signerBal,
    steps,
    message: allDone
      ? 'Vault is fully configured. performUpkeep() will execute on next keeper cycle.'
      : 'Some setup steps failed — check steps[] for details.',
    etherscan:  `https://etherscan.io/address/${VAULT_ADDR}`,
    timestamp:  new Date().toISOString(),
  });
}
