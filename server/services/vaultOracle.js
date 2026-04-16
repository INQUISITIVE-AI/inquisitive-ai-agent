'use strict';
// ============================================================
// INQUISITIVE AI — Vault on-chain oracle (read-only)
// Reads nav, paused state, and PerformUpkeepExecuted events.
// ============================================================
const { ethers } = require('ethers');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const log = pino({ name: 'vaultOracle', level: process.env.LOG_LEVEL || 'info' });

const VAULT = (process.env.INQUISITIVE_VAULT_ADDRESS || '').toLowerCase();
const RPC   = process.env.MAINNET_RPC_URL;

const ABI_PATH = path.join(__dirname, '..', '..', 'abi-vault-v2.json');
const ABI = fs.existsSync(ABI_PATH) ? JSON.parse(fs.readFileSync(ABI_PATH, 'utf8')) : [
  'function totalValueLocked() view returns (uint256)',
  'function paused() view returns (bool)',
  'event PerformUpkeepExecuted(uint8 source, uint256 dataLen)',
];

class VaultOracle {
  constructor() {
    this.state = { tvl: null, paused: null, updatedAt: 0 };
  }

  async initialize() {
    if (!VAULT || !RPC) { log.warn('vault/RPC not configured'); return; }
    const provider = new ethers.JsonRpcProvider(RPC, 1, { staticNetwork: true });
    this.c = new ethers.Contract(VAULT, ABI, provider);
    try { await this.refresh(); } catch (e) { log.warn({ err: e.message }, 'initial read failed'); }
    try {
      this.c.on('PerformUpkeepExecuted', (source, dataLen, ev) => {
        db.recordUpkeepEvent({
          success: true, txHash: ev?.log?.transactionHash, blockNumber: ev?.log?.blockNumber,
        });
        log.info({ source: Number(source), dataLen: Number(dataLen) }, 'upkeep event');
      });
    } catch (e) { log.warn({ err: e.message }, 'event subscribe failed'); }
    setInterval(() => this.refresh().catch(e => log.warn({ err: e.message }, 'refresh err')), 30_000);
  }
  async refresh() {
    if (!this.c) return;
    let tvl = null, paused = null;
    try { tvl = (await this.c.totalValueLocked()).toString(); } catch {}
    try { paused = await this.c.paused(); } catch {}
    this.state = { tvl, paused, updatedAt: Date.now() };
  }
  get() { return { ...this.state }; }
}

module.exports = new VaultOracle();
module.exports.VaultOracle = VaultOracle;
