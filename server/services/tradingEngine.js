'use strict';
// ============================================================
// INQUISITIVE AI — TRADING ENGINE (production)
// Primary execution: Chainlink Automation → vault.performUpkeep()
// Signal submission:  server → vault.submitSignal(bytes) via operator key
// Fallback execution: server → vault.performUpkeep() (only if upkeep paused)
// ============================================================
const EventEmitter = require('events');
const { ethers } = require('ethers');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const brain = require('./inquisitiveBrain');
const { CT } = require('./inquisitiveBrain');
const priceFeed = require('./priceFeed');

const log = pino({ name: 'tradingEngine', level: process.env.LOG_LEVEL || 'info' });

const VAULT       = (process.env.INQUISITIVE_VAULT_ADDRESS || '').toLowerCase();
const RPC_URL     = process.env.MAINNET_RPC_URL;
const OP_KEY      = process.env.OPERATOR_PRIVATE_KEY;
const UPKEEP_ID   = BigInt(process.env.CHAINLINK_UPKEEP_ID || '0');
const FALLBACK_OK = process.env.ALLOW_OPERATOR_FALLBACK === 'true';

if (!VAULT || !RPC_URL || !OP_KEY) {
  throw new Error('tradingEngine: INQUISITIVE_VAULT_ADDRESS, MAINNET_RPC_URL, OPERATOR_PRIVATE_KEY required');
}

const ABI_PATH = path.join(__dirname, '..', '..', 'abi-vault-v2.json');
const vaultAbi = fs.existsSync(ABI_PATH) ? JSON.parse(fs.readFileSync(ABI_PATH, 'utf8')) : [
  'function submitSignal(bytes payload) external',
  'function checkUpkeep(bytes checkData) external view returns (bool, bytes)',
  'function performUpkeep(bytes performData) external',
  'function setAutomationForwarder(address forwarder) external',
  'event PerformUpkeepExecuted(uint8 source, uint256 dataLen)',
];

const provider = new ethers.JsonRpcProvider(RPC_URL, 1, { staticNetwork: true });
const operator = new ethers.Wallet(OP_KEY, provider);
const managedOperator = new ethers.NonceManager(operator);
const vault   = new ethers.Contract(VAULT, vaultAbi, managedOperator);
const vaultRO = new ethers.Contract(VAULT, vaultAbi, provider);

class TradingEngine extends EventEmitter {
  constructor() {
    super();
    this.tradingActive = false;
    this.loopTimer = null;
    this.lastLoopAt = 0;
    this.lastTxHash = null;
    this.lastChainlinkPerformAt = 0;
  }

  async start() {
    if (this.tradingActive) return { ok: true, alreadyRunning: true };
    log.info({ vault: VAULT, upkeepId: UPKEEP_ID.toString() }, 'starting trading engine');
    await this._verifyOnChainState();
    this.tradingActive = true;
    this._tick().catch(e => log.error({ err: e.message }, 'first tick failed'));
    this.loopTimer = setInterval(() => {
      this._tick().catch(e => log.error({ err: e.message }, 'tick failed'));
    }, 8_000);
    this.emit('started');
    return { ok: true, startedAt: Date.now() };
  }

  async stop() {
    if (!this.tradingActive) return { ok: true, alreadyStopped: true };
    this.tradingActive = false;
    if (this.loopTimer) clearInterval(this.loopTimer);
    this.loopTimer = null;
    this.emit('stopped');
    log.info('trading engine stopped');
    return { ok: true, stoppedAt: Date.now() };
  }

  isActive() { return this.tradingActive; }
  history(limit = 100) { return db.listRecentTrades(limit); }
  status() {
    return {
      active: this.tradingActive,
      vault: VAULT,
      lastLoopAt: this.lastLoopAt,
      lastTxHash: this.lastTxHash,
      lastChainlinkPerformAt: this.lastChainlinkPerformAt,
      upkeepId: UPKEEP_ID.toString(),
      fallbackAllowed: FALLBACK_OK,
    };
  }

  async _tick() {
    this.lastLoopAt = Date.now();
    if (!priceFeed.isReady()) { log.warn('prices not ready — skipping tick'); return; }

    const signals = await brain.scoreAll();
    const actionable = signals.filter(s =>
      (s.action === 'BUY' || s.action === 'SELL') &&
      s.finalScore >= (CT.MIN_ACTION_SCORE || 0.72)
    );
    if (actionable.length === 0) { this.emit('tick:idle'); return; }

    const payload = this._encodeSignals(actionable);
    await this._submitSignal(payload, actionable);

    const since = Date.now() - this.lastChainlinkPerformAt;
    if (FALLBACK_OK && UPKEEP_ID === 0n && since > 30_000) {
      await this._fallbackPerformUpkeep();
    }
  }

  _encodeSignals(signals) {
    const coder = ethers.AbiCoder.defaultAbiCoder();
    const tuples = signals.map(s => [
      s.assetAddress || '0x0000000000000000000000000000000000000000',
      s.action === 'BUY' ? 1 : 2,
      Math.round(s.targetBps || 200),
      Math.round(s.finalScore * 1e4),
    ]);
    return coder.encode(
      ['tuple(address asset, uint8 action, uint16 bps, uint64 score)[]'],
      [tuples]
    );
  }

  async _submitSignal(payload, signals) {
    try {
      const gas = await vault.submitSignal.estimateGas(payload);
      const tx  = await vault.submitSignal(payload, { gasLimit: (gas * 12n) / 10n });
      this.lastTxHash = tx.hash;
      db.insertTrade({
        hash: tx.hash, type: 'SUBMIT_SIGNAL',
        signals: JSON.stringify(signals.map(s => ({ symbol: s.symbol, action: s.action, score: s.finalScore }))),
        status: 'pending', submittedAt: Date.now(),
      });
      this.emit('tx:submitted', { hash: tx.hash, count: signals.length });
      log.info({ hash: tx.hash, count: signals.length }, 'submitSignal sent');
      const receipt = await tx.wait(1);
      const status = receipt.status === 1 ? 'confirmed' : 'reverted';
      db.updateTradeStatus(tx.hash, status, receipt.blockNumber, receipt.gasUsed?.toString());
      this.emit('tx:' + status, { hash: tx.hash, blockNumber: receipt.blockNumber });
      log.info({ hash: tx.hash, status, block: receipt.blockNumber }, 'submitSignal receipt');
    } catch (err) { this._handleTxError(err, 'submitSignal'); }
  }

  async _fallbackPerformUpkeep() {
    try {
      const checkData = '0x';
      const [upkeepNeeded, performData] = await vaultRO.checkUpkeep(checkData);
      if (!upkeepNeeded) return;
      const gas = await vault.performUpkeep.estimateGas(performData);
      const tx  = await vault.performUpkeep(performData, { gasLimit: (gas * 12n) / 10n });
      this.lastTxHash = tx.hash;
      db.insertTrade({
        hash: tx.hash, type: 'FALLBACK_PERFORM_UPKEEP',
        signals: null, status: 'pending', submittedAt: Date.now(),
      });
      const receipt = await tx.wait(1);
      db.updateTradeStatus(tx.hash, receipt.status === 1 ? 'confirmed' : 'reverted',
                           receipt.blockNumber, receipt.gasUsed?.toString());
      log.warn({ hash: tx.hash }, 'operator-triggered fallback performUpkeep');
    } catch (err) { this._handleTxError(err, 'performUpkeep'); }
  }

  _handleTxError(err, op) {
    const msg = err?.shortMessage || err?.message || String(err);
    const code = err?.code;
    if (code === 'INSUFFICIENT_FUNDS') {
      log.error({ op }, 'operator wallet out of ETH — fund it');
    } else if (code === 'NONCE_EXPIRED' || code === 'REPLACEMENT_UNDERPRICED') {
      log.warn({ op, code }, 'nonce/replace — resetting nonce manager');
      try { managedOperator.reset(); } catch {}
    } else if (err?.revert || /execution reverted/i.test(msg)) {
      log.error({ op, revert: err?.revert?.name, msg }, 'vault reverted');
    } else {
      log.error({ op, msg }, 'tx failure');
    }
    this.emit('tx:error', { op, msg });
  }

  async _verifyOnChainState() {
    const code = await provider.getCode(VAULT);
    if (!code || code === '0x') throw new Error(`no bytecode at vault ${VAULT}`);
    const bal = await provider.getBalance(operator.address);
    log.info({ operator: operator.address, eth: ethers.formatEther(bal) }, 'operator wallet balance');
    if (bal < ethers.parseEther('0.02')) log.warn('operator balance < 0.02 ETH — top up soon');

    try {
      vaultRO.on('PerformUpkeepExecuted', (source, dataLen) => {
        this.lastChainlinkPerformAt = Date.now();
        log.info({ source, dataLen: Number(dataLen) }, 'on-chain performUpkeep observed');
      });
    } catch (e) { log.warn({ err: e.message }, 'could not subscribe to PerformUpkeepExecuted'); }
  }
}

const tradingEngine = new TradingEngine();

if (process.env.AUTO_START_TRADING === 'true') {
  setTimeout(() => {
    tradingEngine.start().catch(e => log.error({ err: e.message }, 'auto-start failed'));
  }, 10_000);
}

module.exports = tradingEngine;
module.exports.TradingEngine = TradingEngine;
module.exports.tradingActive = () => tradingEngine.isActive();
module.exports.CT = CT;
