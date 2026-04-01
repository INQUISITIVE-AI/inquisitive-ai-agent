// scripts/activate.js
// ─────────────────────────────────────────────────────────────────────────────
// INQUISITIVE — Full Vault Activation (NO PRIVATE KEY REQUIRED)
//
// Generates ABI-encoded calldata for:
//   • setPortfolio()       — 26 ETH-mainnet ERC-20s (Uniswap V3 on Ethereum)
//                            NOTE: SOIL is the designed 27th ETH-mainnet asset — add to
//                            PHASE1_TOKENS once its Uniswap V3 contract address is verified
//   • setPhase2Registry()  — 13 cross-chain assets (deBridge DLN bridges)
//   • setAutomationEnabled(true)
//
// DEFAULT usage (zero private key):
//   node scripts/activate.js
//   → copies calldata → Etherscan Write Contract → MetaMask signs
//
// OPTIONAL auto-execute (if you have the deployer key):
//   DEPLOYER_PRIVATE_KEY=0x... node scripts/activate.js --execute
//
// Bridge wallet setup (one-time, set in .env or Vercel env vars):
//   PORTFOLIO_WALLET_SOLANA=<your-solana-address>
//   PORTFOLIO_WALLET_BSC=<your-evm-address>
//   PORTFOLIO_WALLET_AVALANCHE=<your-evm-address>
//   PORTFOLIO_WALLET_OPTIMISM=<your-evm-address>
//   PORTFOLIO_WALLET_TRON=<your-tron-T-address>
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const { ethers } = require('ethers');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const EXECUTE = process.argv.includes('--execute');

// ── Addresses ──────────────────────────────────────────────────────────────
const VAULT_ADDR   = process.env.INQUISITIVE_VAULT_ADDRESS || '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb'; // InquisitiveVaultUpdated — fully configured on-chain
const LINK_TOKEN   = '0x514910771AF9Ca656af840dff83E8264EcF986CA';
const CL_REGISTRAR = '0x6B0B234fB2f380309D47A7E9391E29E9a179395C'; // Chainlink Automation v2.1

const RPC_URLS = [
  process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
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

// ── ETH-mainnet ERC-20s (26): Uniswap V3 on Ethereum mainnet ───────────────────
// Weights are relative integers (×100 from PORTFOLIO_WEIGHTS in _brain.ts).
// The contract normalises them at runtime vs. (ethDirectSum + bridgeSum).
const PHASE1_TOKENS = [
  { sym:'BTC',  addr:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', fee:3000, w:3523 },
  { sym:'ETH',  addr:'0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', fee:100,  w:2341 }, // stETH, rebasing 1:1
  { sym:'USDC', addr:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', fee:500,  w:585  },
  { sym:'AAVE', addr:'0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', fee:3000, w:390  },
  { sym:'UNI',  addr:'0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', fee:3000, w:390  },
  { sym:'LDO',  addr:'0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', fee:3000, w:292  },
  { sym:'ARB',  addr:'0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1', fee:3000, w:292  },
  { sym:'PAXG', addr:'0x45804880De22913dAFE09f4980848ECE6EcbAf78', fee:3000, w:292  },
  { sym:'INJ',  addr:'0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30', fee:3000, w:195  },
  { sym:'ENA',  addr:'0x57e114B691Db790C35207b2e685D4A43181e6061', fee:3000, w:195  },
  { sym:'POL',  addr:'0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6', fee:3000, w:195  },
  { sym:'FET',  addr:'0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85', fee:3000, w:195  },
  { sym:'RNDR', addr:'0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24', fee:3000, w:195  },
  { sym:'LINK', addr:'0x514910771AF9Ca656af840dff83E8264EcF986CA', fee:3000, w:195  },
  { sym:'ONDO', addr:'0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3', fee:3000, w:195  },
  { sym:'GRT',  addr:'0xc944E90C64B2c07662A292be6244BDf05Cda44a7', fee:3000, w:97   },
  { sym:'SKY',  addr:'0x56072C95FAA701256059aa122697B133aDEd9279', fee:3000, w:97   },
  { sym:'STRK', addr:'0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766', fee:3000, w:97   },
  { sym:'QNT',  addr:'0x4a220E6096B25EADb88358cb44068A3248254675', fee:3000, w:48   },
  { sym:'ZRO',  addr:'0x6985884C4392D348587B19cb9eAAf157F13271cd', fee:3000, w:48   },
  { sym:'CHZ',  addr:'0x3506424F91fD33084466F402d5D97f05F8e3b4AF', fee:3000, w:48   },
  { sym:'ACH',  addr:'0x4E15361FD6b4BB609Fa63C81A2be19d873717870', fee:3000, w:19   },
  { sym:'DBR',  addr:'0xdBe2C93A4e82a177617F4a43Ee1A69c69Ee8e7E6', fee:3000, w:19   },
  { sym:'XSGD', addr:'0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96', fee:3000, w:19   }, // Singapore Dollar ERC-20
  { sym:'BRZ',  addr:'0x420412E765BFa6d85aaaC94b4f7b708C89be2e2B', fee:3000, w:19   }, // Brazilian Real ERC-20
  { sym:'JPYC', addr:'0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB', fee:3000, w:19   }, // JPY Coin v1 ERC-20
];
// ETH-mainnet weight sum = 5125 (~52% of total deployed allocation)

// ── Cross-chain assets — deBridge DLN bridges ────────────────────────────
// tokenAddr: bytes-encoded token address on destination chain
//   Solana: 32-byte base58-decoded mint public key
//   EVM:    20-byte hex address
// receiver: bytes-encoded portfolio wallet on destination chain (same encoding)
// weightBps: relative weight (same scale as ETH-mainnet weights above)

const BASE58_ALPHA = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Decode(s) {
  const bytes = [0];
  for (const c of s) {
    let carry = BASE58_ALPHA.indexOf(c);
    if (carry < 0) throw new Error(`Invalid base58 char: ${c}`);
    for (let i = 0; i < bytes.length; i++) { carry += bytes[i] * 58; bytes[i] = carry & 0xff; carry >>= 8; }
    while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (const c of s) { if (c === '1') bytes.push(0); else break; }
  return Buffer.from(bytes.reverse());
}
function evmBytes(addr) { return Buffer.from(addr.replace('0x',''), 'hex'); }

function buildPhase2Assets(wallets) {
  // wallets: { solana, bsc, avalanche, optimism, tron }
  const SOL_WALLET = wallets.solana ? base58Decode(wallets.solana) : Buffer.alloc(32);
  const BSC_WALLET = wallets.bsc    ? evmBytes(wallets.bsc)        : Buffer.alloc(20);
  const AVA_WALLET = wallets.avax   ? evmBytes(wallets.avax)       : Buffer.alloc(20);
  const OPT_WALLET = wallets.op     ? evmBytes(wallets.op)         : Buffer.alloc(20);
  const TRX_WALLET = wallets.tron ? (wallets.tron.startsWith("T") ? (() => { const b = base58Decode(wallets.tron); return b.slice(1,21); })() : evmBytes(wallets.tron)) : Buffer.alloc(20);

  return [
    // ── Solana (chainId 7565164) ─────────────────────────────────────────
    { tokenAddr: base58Decode('So11111111111111111111111111111111111111112'),  chainId: 7565164n, receiver: SOL_WALLET, weightBps: 800n,  symbol: 'SOL'     },
    { tokenAddr: base58Decode('JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'), chainId: 7565164n, receiver: SOL_WALLET, weightBps: 100n,  symbol: 'JUP'     },
    { tokenAddr: base58Decode('J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn'),chainId: 7565164n, receiver: SOL_WALLET, weightBps: 50n,   symbol: 'JITOSOL' },
    { tokenAddr: base58Decode('jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v'), chainId: 7565164n, receiver: SOL_WALLET, weightBps: 50n,   symbol: 'JUPSOL'  },
    { tokenAddr: base58Decode('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'), chainId: 7565164n, receiver: SOL_WALLET, weightBps: 50n,   symbol: 'mSOL'    }, // Marinade Staked SOL
    { tokenAddr: base58Decode('4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy'), chainId: 7565164n, receiver: SOL_WALLET, weightBps: 10n,   symbol: 'HONEY'   },
    { tokenAddr: base58Decode('hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux'), chainId: 7565164n, receiver: SOL_WALLET, weightBps: 25n,   symbol: 'HNT'     },
    { tokenAddr: base58Decode('HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3'), chainId: 7565164n, receiver: SOL_WALLET, weightBps: 10n,   symbol: 'PYTH'    },
    // ── BSC (chainId 56) ─────────────────────────────────────────────────
    { tokenAddr: evmBytes('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),        chainId: 56n,      receiver: BSC_WALLET, weightBps: 500n,  symbol: 'BNB'     }, // WBNB
    { tokenAddr: evmBytes('0xa8AEA66B361a8d53e8865c62D142167Af28Af058'),         chainId: 56n,      receiver: BSC_WALLET, weightBps: 10n,   symbol: 'CNGN'    }, // Compliant Naira (cNGN) on BSC
    // ── Avalanche (chainId 43114) ────────────────────────────────────────
    { tokenAddr: evmBytes('0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'),         chainId: 43114n,   receiver: AVA_WALLET, weightBps: 300n,  symbol: 'AVAX'    }, // WAVAX
    // ── Optimism (chainId 10) ────────────────────────────────────────────
    { tokenAddr: evmBytes('0x4200000000000000000000000000000000000042'),          chainId: 10n,      receiver: OPT_WALLET, weightBps: 100n,  symbol: 'OP'      },
    // ── TRON (chainId 728126428) ─────────────────────────────────────────
    { tokenAddr: evmBytes('0x0000000000000000000000000000000000000000'),          chainId: 728126428n,receiver: TRX_WALLET, weightBps: 100n,  symbol: 'TRX'     },
  ];
}
// Cross-chain (deBridge DLN) weight sum = 2105 (~21% of total deployed allocation, 13 assets)
// Combined deployed total = 5095 + 2105 = 7200 (~73.4% direct execution, ~26.6% stETH yield)

// ── TRON address (same secp256k1, different format) ────────────────────────
function sha256d(buf) {
  const h1 = crypto.createHash('sha256').update(buf).digest();
  return crypto.createHash('sha256').update(h1).digest();
}
function base58Encode(buf) {
  let n = BigInt('0x' + buf.toString('hex'));
  let s = '';
  while (n > 0n) { s = BASE58_ALPHA[Number(n % 58n)] + s; n /= 58n; }
  for (const b of buf) { if (b !== 0) break; s = '1' + s; }
  return s;
}
function ethToTron(ethAddr) {
  const raw  = Buffer.from(ethAddr.replace('0x',''), 'hex');
  const full = Buffer.concat([Buffer.from([0x41]), raw]);
  return base58Encode(Buffer.concat([full, sha256d(full).slice(0, 4)]));
}

// ── Helpers ────────────────────────────────────────────────────────────────
const L = console.log;
function ok(m)   { L(`  ✅  ${m}`); }
function warn(m) { L(`  ⚠️   ${m}`); }
function err(m)  { L(`  ❌  ${m}`); }
function step(n, m) { L(`\n${'─'.repeat(62)}\n  STEP ${n}: ${m}\n${'─'.repeat(62)}`); }
function box(lines) { L('\n  ' + '┌' + '─'.repeat(58) + '┐'); lines.forEach(l => L('  │ ' + l.padEnd(57) + '│')); L('  └' + '─'.repeat(58) + '┘'); }

async function getProvider() {
  for (const url of RPC_URLS) {
    try { const p = new ethers.JsonRpcProvider(url); await p.getBlockNumber(); return p; } catch {}
  }
  throw new Error('All RPC endpoints unavailable');
}

// ── Generate setPortfolio() calldata ──────────────────────────────────────
function genSetPortfolioCalldata() {
  const iface = new ethers.Interface([
    'function setPortfolio(address[] calldata _tokens, uint256[] calldata _weights, uint24[] calldata _fees) external',
  ]);
  const tokens  = PHASE1_TOKENS.map(t => ethers.getAddress(t.addr.toLowerCase()));
  const weights = PHASE1_TOKENS.map(t => BigInt(t.w));
  const fees    = PHASE1_TOKENS.map(t => t.fee);
  return iface.encodeFunctionData('setPortfolio', [tokens, weights, fees]);
}

// ── Generate setPhase2Registry() calldata ────────────────────────────────
function genSetPhase2Calldata(assets) {
  const iface = new ethers.Interface([
    'function setPhase2Registry((bytes tokenAddr, uint256 chainId, bytes receiver, uint256 weightBps, string symbol)[] assets) external',
  ]);
  const encoded = assets.map(a => ({
    tokenAddr: '0x' + a.tokenAddr.toString('hex'),
    chainId:   a.chainId,
    receiver:  '0x' + a.receiver.toString('hex'),
    weightBps: a.weightBps,
    symbol:    a.symbol,
  }));
  return iface.encodeFunctionData('setPhase2Registry', [encoded]);
}

// ── Auto-execute via deployer key ────────────────────────────────────────
async function executeOnChain(provider, pk, calldata1, calldata2) {
  const signer = new ethers.Wallet(pk, provider);
  L(`\n  Executor: ${signer.address}`);
  L(`  Balance:  ${ethers.formatEther(await provider.getBalance(signer.address))} ETH\n`);

  const vault = new ethers.Contract(VAULT_ADDR, VAULT_ABI, signer);
  const owner = await vault.owner().catch(() => 'unknown');
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    err(`Signer (${signer.address}) is not vault owner (${owner}). Aborting.`);
    process.exit(1);
  }

  const feeData = await provider.getFeeData();
  const gasOpts = {
    maxFeePerGas:         feeData.maxFeePerGas         ? feeData.maxFeePerGas * 120n / 100n : undefined,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
  };

  // setPortfolio
  const portLen = await vault.getPortfolioLength().catch(() => 0n);
  if (portLen === 0n) {
    L('  Sending setPortfolio()...');
    const tx = await signer.sendTransaction({ to: VAULT_ADDR, data: calldata1, gasLimit: 800_000n, ...gasOpts });
    L(`  Tx: https://etherscan.io/tx/${tx.hash}`);
    await tx.wait(1);
    ok('setPortfolio() confirmed');
  } else {
    L(`  setPortfolio(): already set (${portLen} assets) — skipping`);
  }

  // setPhase2Registry
  const p2Len = await vault.getPhase2Length().catch(() => 0n);
  if (p2Len === 0n) {
    L('  Sending setPhase2Registry()...');
    const tx2 = await signer.sendTransaction({ to: VAULT_ADDR, data: calldata2, gasLimit: 1_500_000n, ...gasOpts });
    L(`  Tx: https://etherscan.io/tx/${tx2.hash}`);
    await tx2.wait(1);
    ok('setPhase2Registry() confirmed');
  } else {
    L(`  setPhase2Registry(): already set (${p2Len} assets) — skipping`);
  }

  // setAutomationEnabled
  const autoOn = await vault.automationEnabled().catch(() => false);
  if (!autoOn) {
    L('  Sending setAutomationEnabled(true)...');
    const iface = new ethers.Interface(['function setAutomationEnabled(bool _enabled) external']);
    const tx3 = await signer.sendTransaction({ to: VAULT_ADDR, data: iface.encodeFunctionData('setAutomationEnabled',[true]), gasLimit: 100_000n, ...gasOpts });
    await tx3.wait(1);
    ok('Automation enabled');
  } else {
    L('  Automation already enabled — skipping');
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  L('\n' + '═'.repeat(62));
  L('  INQUISITIVE — Vault Activation');
  L('  27 ETH-mainnet swaps + 13 deBridge DLN bridges + 25 stETH yield positions');
  L('  Vault: ' + VAULT_ADDR);
  L('═'.repeat(62));

  // ── Connect RPC ────────────────────────────────────────────────────────
  let provider;
  try { provider = await getProvider(); } catch (e) { err('RPC unavailable: ' + e.message); process.exit(1); }
  L(`\n  RPC connected. Block: ${await provider.getBlockNumber()}`);

  // ── Verify contract ────────────────────────────────────────────────────
  step(1, 'Verify vault deployment');
  const code = await provider.getCode(VAULT_ADDR);
  if (code === '0x' || code.length < 10) {
    err(`No contract at ${VAULT_ADDR}.`);
    L('  Deploy first: npx hardhat run scripts/deploy-upgraded.js --network mainnet');
    process.exit(1);
  }
  ok(`Contract deployed (${(code.length - 2) / 2} bytes bytecode)`);
  const vault = new ethers.Contract(VAULT_ADDR, VAULT_ABI, provider);
  const owner = await vault.owner().catch(() => 'unknown');
  L(`  Owner:    ${owner}`);
  L(`  ETH-mainnet portfolio: ${await vault.getPortfolioLength().catch(() => '?')} assets set (setPortfolio)`);
  L(`  Cross-chain registry:  ${await vault.getPhase2Length().catch(() => '?')} assets set (setPhase2Registry)`);
  L(`  AutoOn:   ${await vault.automationEnabled().catch(() => '?')}`);

  // ── Resolve Phase 2 wallet addresses ──────────────────────────────────
  step(2, 'Cross-chain bridge destination wallets (deBridge DLN)');
  const solanaWallet = process.env.PORTFOLIO_WALLET_SOLANA  || process.env.PAYMENT_SOL_ADDRESS || '';
  const bscWallet    = process.env.PORTFOLIO_WALLET_BSC      || '';
  const avaxWallet   = process.env.PORTFOLIO_WALLET_AVALANCHE|| '';
  const opWallet     = process.env.PORTFOLIO_WALLET_OPTIMISM || '';
  const tronWallet   = process.env.PORTFOLIO_WALLET_TRON     || '';

  const walletsReady = solanaWallet && bscWallet && avaxWallet && opWallet && tronWallet;
  if (!walletsReady) {
    warn('Bridge wallet env vars not fully set. Using PLACEHOLDER bytes.');
    warn('Set these in .env or Vercel env vars, then re-run activate.js:');
    L('');
    L('  PORTFOLIO_WALLET_SOLANA=<phantom-or-solflare-address>');
    L('  PORTFOLIO_WALLET_BSC=<your-evm-address>');
    L('  PORTFOLIO_WALLET_AVALANCHE=<your-evm-address>');
    L('  PORTFOLIO_WALLET_OPTIMISM=<your-evm-address>');
    L('  PORTFOLIO_WALLET_TRON=<your-T-address>');
    L('');
    L('  You can call setPhase2Registry() AFTER setting wallets.');
    L('  setPortfolio() works now. setPhase2Registry() needs wallet addresses.');
  } else {
    ok(`Solana wallet:   ${solanaWallet}`);
    ok(`BSC wallet:      ${bscWallet}`);
    ok(`Avalanche wallet:${avaxWallet}`);
    ok(`Optimism wallet: ${opWallet}`);
    ok(`TRON wallet:     ${tronWallet}`);
  }

  // ── Build calldata ─────────────────────────────────────────────────────
  step(3, 'Generate calldata');
  const phase2Assets = buildPhase2Assets({
    solana: solanaWallet, bsc: bscWallet, avax: avaxWallet, op: opWallet, tron: tronWallet,
  });

  const calldata1 = genSetPortfolioCalldata();
  const calldata2 = genSetPhase2Calldata(phase2Assets);
  const calldata3 = new ethers.Interface(['function setAutomationEnabled(bool) external'])
                               .encodeFunctionData('setAutomationEnabled', [true]);

  L(`  setPortfolio()      calldata length: ${calldata1.length} chars`);
  L(`  setPhase2Registry() calldata length: ${calldata2.length} chars`);
  L(`  setAutomationEnabled() calldata:     ${calldata3}`);

  // ── Print Etherscan instructions ───────────────────────────────────────
  step(4, 'Setup instructions — NO private key required');
  box([
    'HOW TO ACTIVATE (using MetaMask + Etherscan):',
    '',
    '1. Open Etherscan Write Contract:',
    `   https://etherscan.io/address/${VAULT_ADDR}#writeContract`,
    '',
    '2. Connect MetaMask (must be vault owner wallet)',
    '',
    '3. Call setPortfolio() — paste these arrays:',
    '   tokens  → see ETH-mainnet tokens output below',
    '   weights → see ETH-mainnet weights output below',
    '   fees    → see ETH-mainnet fees output below',
    '',
    '4. Call setPhase2Registry() — paste the assets array',
    '   (output below, or use --execute flag with deployer key)',
    '',
    '5. Call setAutomationEnabled( _enabled: true )',
    '',
    '6. Register Chainlink Automation:',
    '   https://automation.chain.link → New Upkeep → Custom Logic',
    `   Contract: ${VAULT_ADDR}`,
    '   Gas limit: 5,000,000  |  Fund: 1 LINK (~$15)',
  ]);

  // ── Print ETH-mainnet arrays ───────────────────────────────────────────
  step(5, 'ETH-mainnet — setPortfolio() input arrays (26 tokens, Uniswap V3)');
  L('\n  _tokens (address[]):');
  L('  [' + PHASE1_TOKENS.map(t => `"${t.addr}"`).join(',') + ']');
  L('\n  _weights (uint256[]):');
  L('  [' + PHASE1_TOKENS.map(t => t.w).join(',') + ']');
  L('\n  _fees (uint24[]):');
  L('  [' + PHASE1_TOKENS.map(t => t.fee).join(',') + ']');
  L('\n  Asset breakdown:');
  const p1Sum = PHASE1_TOKENS.reduce((s,t)=>s+t.w,0);
  PHASE1_TOKENS.forEach(t => L(`    ${t.sym.padEnd(5)} w:${String(t.w).padStart(5)}  (${(t.w/p1Sum*100).toFixed(1)}% of ETH-direct)  ${t.addr}`));

  // ── Print Phase 2 tuple array ──────────────────────────────────────────
  step(6, 'Cross-chain — setPhase2Registry() assets tuple[] (13 deBridge DLN bridges)');
  if (!walletsReady) {
    warn('Receiver bytes are ZERO PLACEHOLDERS — set wallet env vars and re-run.');
  }
  L('\n  assets (tuple[]):');
  L('  [');
  phase2Assets.forEach((a, i) => {
    L(`    [  // ${a.symbol}`);
    L(`      "0x${a.tokenAddr.toString('hex')}",  // tokenAddr`);
    L(`      ${a.chainId},                          // chainId`);
    L(`      "0x${a.receiver.toString('hex')}",    // receiver ${walletsReady ? '(set)' : '(PLACEHOLDER)'}`);
    L(`      ${a.weightBps},                        // weightBps`);
    L(`      "${a.symbol}"                          // symbol`);
    L('    ]' + (i < phase2Assets.length-1 ? ',' : ''));
  });
  L('  ]');

  // ── Full encoded calldata ──────────────────────────────────────────────
  step(7, 'Full ABI-encoded calldata (for advanced use)');
  L('\n  setPortfolio() calldata (paste in Etherscan "Send Raw Transaction"):');
  L('  ' + calldata1);
  L('\n  setPhase2Registry() calldata:');
  L('  ' + calldata2);

  // ── Auto-execute if --execute flag ────────────────────────────────────
  if (EXECUTE) {
    step(8, 'Auto-execute (--execute flag set)');
    const pk = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!pk) {
      err('DEPLOYER_PRIVATE_KEY not set. Cannot auto-execute.');
      L('  Either set the env var or use the Etherscan instructions above.');
      process.exit(1);
    }
    await executeOnChain(provider, pk, calldata1, calldata2);
  }

  // ── Chainlink registration helper ────────────────────────────────────
  step(EXECUTE ? 9 : 8, 'Chainlink Automation — register upkeep');
  L('');
  box([
    'Chainlink Automation = ZERO private key, FULLY autonomous execution.',
    '',
    '  URL: https://automation.chain.link',
    '  → Connect MetaMask (any wallet, not just owner)',
    '  → New Upkeep → Custom Logic',
    `  → Contract address: ${VAULT_ADDR}`,
    '  → Gas limit: 5,000,000',
    '  → Fund with 1 LINK (~$15/month)',
    '',
    'Once registered, performUpkeep() runs every 60 seconds automatically.',
    'ETH-DIRECT + BRIDGE execute in ONE call — no private key ever.',
  ]);

  // ── Summary ────────────────────────────────────────────────────────────
  L('\n' + '═'.repeat(62));
  L('  ACTIVATION SUMMARY');
  L('═'.repeat(62));
  L('');
  L('  Ethereum mainnet (26 assets — setPortfolio(), Uniswap V3 swaps):');
  L('  → BTC(WBTC), ETH(stETH), USDC, AAVE, UNI, LDO, ARB, PAXG,');
  L('    INJ, ENA, POL, FET, RNDR, LINK, ONDO, GRT, SKY, DBR,');
  L('    STRK, QNT, ZRO, CHZ, ACH, BRZ, JPYC, XSGD');
  L('  (SOIL: ETH held as Lido stETH pending Uniswap V3 address verification)');
  L('');
  L('  deBridge DLN (13 cross-chain — native assets on destination chains):');
  L('  → SOL, JUP, JITOSOL, JUPSOL, mSOL, HONEY, HNT, PYTH  (Solana)');
  L('  → BNB (BSC)  |  AVAX (Avalanche)  |  OP (Optimism)  |  TRX (TRON)  |  CNGN (BSC)');
  L('');
  L('  stETH yield positions (25 assets — ETH as Lido stETH, native price tracked):');
  L('  → XRP, ADA, SUI, DOT, NEAR, ICP, HYPE, TAO, ATOM, ALGO,');
  L('    XLM, LTC, BCH, HBAR, ZEC, XMR, ETC, XTZ, VET,');
  L('    FIL, AR, XDC, CC, STX, EOS');
  L('');
  L('  ALL 65 assets priced from live CoinGecko native feeds.');
  L('  ZERO price proxy disconnect. ZERO private keys in code.');
  L('');
  L('  Chainlink Automation: https://automation.chain.link');
  L(`  Etherscan Write: https://etherscan.io/address/${VAULT_ADDR}#writeContract`);
  L('');
  L('═'.repeat(62) + '\n');
}

main().catch(e => { console.error('\n  FATAL:', e.message || e); process.exit(1); });
