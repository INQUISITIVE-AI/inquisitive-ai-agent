'use strict';
/**
 * @fileoverview INQUISITIVE AI — Vault Oracle Service
 *
 * Bridges the AI brain (server-side signals) to the on-chain InquisitiveVaultV2.
 * Listens for brain cycle events, maps signals to Ethereum mainnet ERC-20 addresses,
 * and calls submitSignalsBatch() on VaultV2 via the aiOracle wallet.
 *
 * Requirements (add to .env):
 *   ORACLE_PRIVATE_KEY=<deployer/oracle wallet private key>
 *   MAINNET_RPC_URL=<Infura or Alchemy Ethereum mainnet RPC>
 *
 * The aiOracle on VaultV2 is currently set to the deployer wallet.
 * Only that wallet (or a wallet you've set via setAIOracle()) can submit signals.
 */

const { ethers } = require('ethers');
const path       = require('path');
const brain      = require('./inquisitiveBrain');

// ── VaultV2 deployment ─────────────────────────────────────────────────────
const VAULT_V2_ADDRESS = '0xb99dc519c4373e5017222bbd46f42a4e12a0ec25';

// Load full ABI from JSON (all functions, events, views)
const VAULT_V2_ABI = require(path.join(__dirname, '../../abi-vault-v2.json'));

// ── Brain signal → on-chain uint8 mapping ─────────────────────────────────
const SIGNAL_MAP = { BUY: 1, SELL: 2, HOLD: 0, REDUCE: 2, SKIP: 0 };

// ── Ethereum mainnet ERC-20 addresses (Uniswap V3 tradeable) ──────────────
// Only assets that exist as Ethereum mainnet ERC-20s with Uniswap V3 liquidity
const ETH_MAINNET_TOKENS = {
  BTC:   '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
  ETH:   '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH (buy ETH exposure via WETH)
  USDC:  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  AAVE:  '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', // AAVE
  UNI:   '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI
  LDO:   '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', // LDO
  LINK:  '0x514910771AF9Ca656af840dff83E8264EcF986CA', // LINK
  GRT:   '0xc944E90C64B2c07662A292be6244BDf05Cda44a7', // GRT
  ARB:   '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1', // ARB
  PAXG:  '0x45804880De22913dAFE09f4980848ECE6EcbAf78', // PAXG
  ENA:   '0x57e114B691Db790C35207b2e685D4A43181e6061', // ENA
  POL:   '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6', // POL (ex-MATIC)
  FET:   '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85', // ASI (FET)
  RNDR:  '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24', // RNDR
  STRK:  '0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766', // STRK
  MKR:   '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', // MKR
  ENS:   '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72', // ENS
  COMP:  '0xc00e94Cb662C3520282E6f5717214004A7f26888', // COMP
  CRV:   '0xD533a949740bb3306d119CC777fa900bA034cd52', // CRV
  CVX:   '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B', // CVX
  BAL:   '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
  SNX:   '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6f', // SNX
  YFI:   '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e', // YFI
  ZRO:   '0x6985884C4392D348587B19cb9eAAf157F13271cd', // ZRO (LayerZero)
  ONDO:  '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3', // ONDO
  QNT:   '0x4a220E6096B25EADb88358cb44068A3248254675', // QNT
  SKY:   '0x56072C95FAA701256059aa122697B133aDEd9279', // SKY (MakerDAO rebrand)
};

// ── Minimum confidence threshold to submit a signal on-chain ──────────────
const MIN_CONFIDENCE = 0.65; // 65% — only strong signals go on-chain to save gas

// ── Minimum interval between batch submissions (ms) ───────────────────────
const SUBMIT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

class VaultOracle {
  constructor() {
    this.provider  = null;
    this.wallet    = null;
    this.vault     = null;
    this.ready     = false;
    this.lastSubmit = 0;
    this.submitCount = 0;
  }

  async init() {
    const rpc        = process.env.MAINNET_RPC_URL;
    const privateKey = process.env.ORACLE_PRIVATE_KEY;

    if (!rpc) {
      console.warn('⚠️  [Oracle] MAINNET_RPC_URL not set — vault oracle disabled');
      return false;
    }
    if (!privateKey) {
      console.warn('⚠️  [Oracle] ORACLE_PRIVATE_KEY not set — vault oracle disabled');
      console.warn('   Add the deployer/oracle wallet private key to .env to enable on-chain signal submission');
      return false;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpc);
      this.wallet   = new ethers.Wallet(privateKey, this.provider);
      this.vault    = new ethers.Contract(VAULT_V2_ADDRESS, VAULT_V2_ABI, this.wallet);

      const network = await this.provider.getNetwork();
      if (network.chainId !== 1n) {
        console.error(`❌ [Oracle] Wrong network: chainId=${network.chainId} — expected mainnet (1)`);
        return false;
      }

      const walletAddr = await this.wallet.getAddress();
      const aiOracle   = await this.vault.aiOracle();
      const autoEnabled = await this.vault.automationEnabled();

      if (walletAddr.toLowerCase() !== aiOracle.toLowerCase()) {
        console.error(`❌ [Oracle] Wallet ${walletAddr} is NOT the aiOracle (${aiOracle}) — signals will revert`);
        console.error('   Call vault.setAIOracle(newOracle) from owner to update the oracle address');
        return false;
      }

      console.log(`✅ [Oracle] Initialized — wallet: ${walletAddr}`);
      console.log(`   Vault: ${VAULT_V2_ADDRESS}`);
      console.log(`   Automation enabled: ${autoEnabled}`);
      this.ready = true;
      return true;
    } catch (err) {
      console.error('❌ [Oracle] Init failed:', err.message);
      return false;
    }
  }

  _buildSignalBatch(allSignals) {
    const assets  = [];
    const signals = [];

    for (const [symbol, signal] of allSignals.entries()) {
      const addr = ETH_MAINNET_TOKENS[symbol];
      if (!addr) continue; // Not a mainnet ERC-20 we can trade

      const action = signal.action || 'HOLD';
      const score  = signal.finalScore || 0;

      // Only submit BUY/SELL with sufficient confidence
      if ((action === 'BUY' || action === 'SELL' || action === 'REDUCE') && score >= MIN_CONFIDENCE) {
        assets.push(addr);
        signals.push(SIGNAL_MAP[action] ?? 0);
      }
      // For HOLD/SKIP, we submit 0 to clear any stale signals
      else if (action === 'HOLD' || action === 'SKIP') {
        assets.push(addr);
        signals.push(0);
      }
    }

    return { assets, signals };
  }

  async submitBatch(allSignals) {
    if (!this.ready) return;

    const now = Date.now();
    if (now - this.lastSubmit < SUBMIT_INTERVAL_MS) return;

    const { assets, signals } = this._buildSignalBatch(allSignals);
    if (!assets.length) {
      console.log('📡 [Oracle] No eligible signals to submit this cycle');
      return;
    }

    const buys  = signals.filter(s => s === 1).length;
    const sells = signals.filter(s => s === 2).length;
    const holds = signals.filter(s => s === 0).length;

    try {
      console.log(`📡 [Oracle] Submitting ${assets.length} signals: BUY=${buys} SELL=${sells} HOLD=${holds}`);
      const tx = await this.vault.submitSignalsBatch(assets, signals, {
        gasLimit: 800_000, // batch of ~27 signals; ~30k gas each
      });
      console.log(`   TX: ${tx.hash}`);
      const receipt = await tx.wait(1);
      this.lastSubmit  = now;
      this.submitCount++;
      console.log(`✅ [Oracle] Batch confirmed — block ${receipt.blockNumber} | cycle #${this.submitCount}`);
    } catch (err) {
      console.error('❌ [Oracle] submitSignalsBatch failed:', err.message?.slice(0, 200));
    }
  }

  start() {
    this.init().then(ok => {
      if (!ok) return;
      brain.on('cycle', ({ allSignals, cycleCount }) => {
        if (!brain.isLive) {
          console.log(`📋 [Oracle] Brain in paper-trade mode (cycle ${cycleCount}) — not submitting on-chain yet`);
          return;
        }
        // Convert allSignals array to a Map for lookup
        const signalMap = new Map();
        if (Array.isArray(allSignals)) {
          for (const s of allSignals) signalMap.set(s.symbol, s);
        } else if (allSignals instanceof Map) {
          for (const [k, v] of allSignals) signalMap.set(k, v);
        }
        this.submitBatch(signalMap).catch(err =>
          console.error('[Oracle] submitBatch error:', err.message)
        );
      });
      console.log('🔗 [Oracle] Listening for brain cycles — will submit signals on-chain every 5 min');
    });
  }
}

const vaultOracle = new VaultOracle();
module.exports = vaultOracle;
