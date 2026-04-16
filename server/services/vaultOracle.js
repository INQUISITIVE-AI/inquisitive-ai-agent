'use strict';
// ============================================================
// INQUISITIVE AI — VAULT ORACLE SERVICE
// Reads VaultV2 on-chain state and emits events for WebSocket.
// Execution is handled entirely by Chainlink Automation.
// This service is read-only — no private keys, no signing.
// ============================================================

const EventEmitter = require('events');

const VAULT_ADDR = process.env.NEXT_PUBLIC_VAULT_V2_ADDRESS
  || process.env.INQUISITIVE_VAULT_ADDRESS
  || '0xb99dc519c4373e5017222bbd46f42a4e12a0ec25';

const RPC_URLS = [
  ...(process.env.MAINNET_RPC_URL ? [process.env.MAINNET_RPC_URL] : []),
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
];

// Minimal ABI selectors (raw eth_call, no ethers dependency in server)
const SELECTORS = {
  totalTrades:       '0xe275c997', // cast sig "totalTrades()"
  automationEnabled: '0xd966a594', // cast sig "automationEnabled()"
  lastTradeTime:     '0xd5eee8b6', // cast sig "lastTradeTime()"
  trackedAssets:     '0xc4b97370', // cast sig "getTrackedAssets()" -> address[]
  aiOracle:          '0x31b221cd', // cast sig "aiOracle()"
};

async function rpcCall(method, params) {
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(5000),
      });
      const json = await res.json();
      if (json.result !== undefined) return json.result;
    } catch { /* try next RPC */ }
  }
  return null;
}

async function readVaultState() {
  const [ethBalHex, tradesHex, autoHex, lastTradeHex, trackedAssetsHex, aiOracleHex] = await Promise.all([
    rpcCall('eth_getBalance', [VAULT_ADDR, 'latest']),
    rpcCall('eth_call', [{ to: VAULT_ADDR, data: SELECTORS.totalTrades }, 'latest']),
    rpcCall('eth_call', [{ to: VAULT_ADDR, data: SELECTORS.automationEnabled }, 'latest']),
    rpcCall('eth_call', [{ to: VAULT_ADDR, data: SELECTORS.lastTradeTime }, 'latest']),
    rpcCall('eth_call', [{ to: VAULT_ADDR, data: SELECTORS.trackedAssets }, 'latest']),
    rpcCall('eth_call', [{ to: VAULT_ADDR, data: SELECTORS.aiOracle }, 'latest']),
  ]);

  const ethBalance = ethBalHex ? parseFloat((BigInt(ethBalHex) * 10000n / 10n ** 18n).toString()) / 10000 : 0;
  const cycleCount = tradesHex && tradesHex !== '0x' ? parseInt(tradesHex, 16) : 0;
  const autoEnabled = autoHex && autoHex !== '0x' ? parseInt(autoHex, 16) !== 0 : false;
  const lastDeploy = lastTradeHex && lastTradeHex !== '0x' ? parseInt(lastTradeHex, 16) : 0;
  // ABI-decode address[]: second 32-byte word is array length
  const portfolioLength = (trackedAssetsHex && trackedAssetsHex.length >= 2 + 128)
    ? parseInt(trackedAssetsHex.slice(66, 130), 16) : 0;
  const aiOracle = aiOracleHex && aiOracleHex.length >= 42 ? '0x' + aiOracleHex.slice(-40) : '';

  return { ethBalance, cycleCount, autoEnabled, lastDeploy, portfolioLength, aiOracle, vaultAddress: VAULT_ADDR };
}

class VaultOracleService extends EventEmitter {
  constructor() {
    super();
    this._interval = null;
    this._lastState = null;
    this.POLL_MS = 60_000; // 1 min — Chainlink handles actual execution cadence
  }

  start() {
    console.log(`🔗 [VaultOracle] Monitoring VaultV2 ${VAULT_ADDR} (read-only, Chainlink executes)`);
    this._poll();
    this._interval = setInterval(() => this._poll(), this.POLL_MS);
    return this;
  }

  stop() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
  }

  async _poll() {
    try {
      const state = await readVaultState();
      const prev  = this._lastState;
      this._lastState = state;

      // Emit on cycle count change (Chainlink executed a trade)
      if (prev && state.cycleCount > prev.cycleCount) {
        console.log(`⚡ [VaultOracle] New cycle detected: ${prev.cycleCount} → ${state.cycleCount}`);
        this.emit('cycle', state);
      }

      this.emit('status', state);
    } catch (err) {
      console.warn('[VaultOracle] Poll error:', err.message);
    }
  }

  getStatus() {
    return this._lastState || { vaultAddress: VAULT_ADDR, status: 'initializing' };
  }
}

module.exports = new VaultOracleService();
