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
  cycleCount:        '0x316fda0f', // keccak256("cycleCount()")
  automationEnabled: '0xd966a594', // keccak256("automationEnabled()")
  lastDeployTime:    '0x579578e3', // keccak256("lastDeployTime()")
  portfolioLength:   '0xe6f713d5', // keccak256("getPortfolioLength()")
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
  const [ethBalHex, cycleHex, autoHex, lastDeployHex, portfolioLenHex] = await Promise.all([
    rpcCall('eth_getBalance', [VAULT_ADDR, 'latest']),
    rpcCall('eth_call', [{ to: VAULT_ADDR, data: SELECTORS.cycleCount }, 'latest']),
    rpcCall('eth_call', [{ to: VAULT_ADDR, data: SELECTORS.automationEnabled }, 'latest']),
    rpcCall('eth_call', [{ to: VAULT_ADDR, data: SELECTORS.lastDeployTime }, 'latest']),
    rpcCall('eth_call', [{ to: VAULT_ADDR, data: SELECTORS.portfolioLength }, 'latest']),
  ]);

  const ethBalance = ethBalHex ? parseFloat((BigInt(ethBalHex) * 10000n / 10n ** 18n).toString()) / 10000 : 0;
  const cycleCount = cycleHex && cycleHex !== '0x' ? parseInt(cycleHex, 16) : 0;
  const autoEnabled = autoHex && autoHex !== '0x' ? parseInt(autoHex, 16) !== 0 : false;
  const lastDeploy = lastDeployHex && lastDeployHex !== '0x' ? parseInt(lastDeployHex, 16) : 0;
  const portfolioLength = portfolioLenHex && portfolioLenHex !== '0x' ? parseInt(portfolioLenHex, 16) : 0;

  return { ethBalance, cycleCount, autoEnabled, lastDeploy, portfolioLength, vaultAddress: VAULT_ADDR };
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
