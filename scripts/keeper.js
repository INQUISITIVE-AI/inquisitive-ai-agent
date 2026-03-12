#!/usr/bin/env node
// ── INQUISITIVE Vault Keeper ────────────────────────────────────────────────
// Calls performUpkeep() on InquisitiveVaultUpdated if checkUpkeep() returns true.
// Run via GitHub Actions cron every 15 minutes — completely free.
//
// Required env vars (set in GitHub Secrets, never in code):
//   KEEPER_PRIVATE_KEY  — dedicated hot wallet, CAN ONLY call performUpkeep()
//   MAINNET_RPC_URL     — any public RPC works (Infura, Alchemy, llamarpc, etc.)
//
// The keeper wallet:
//   1. Generate: node -e "const {ethers}=require('ethers');const w=ethers.Wallet.createRandom();console.log('Address:',w.address,'\\nKey:',w.privateKey)"
//   2. Fund with 0.02 ETH for gas (~200 executions)
//   3. Call vault.setAIExecutor(keeperAddress) on Etherscan → limits this key to performUpkeep() only
//   4. Add KEEPER_PRIVATE_KEY to GitHub Secrets (Settings → Secrets → Actions)

const { ethers } = require('ethers');

const VAULT_ADDR = process.env.INQUISITIVE_VAULT_ADDRESS || '0x506F72eABc90793ae8aC788E650bC9407ED853Fa';
const RPC_URLS   = [
  process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
];

const VAULT_ABI = [
  'function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData)',
  'function performUpkeep(bytes calldata performData) external',
  'function getPortfolioLength() external view returns (uint256)',
  'function automationEnabled() external view returns (bool)',
  'function cycleCount() external view returns (uint256)',
];

async function getProvider() {
  for (const url of RPC_URLS) {
    try {
      const p = new ethers.JsonRpcProvider(url);
      await p.getBlockNumber();
      console.log(`RPC connected: ${url}`);
      return p;
    } catch {}
  }
  throw new Error('All RPC endpoints unavailable');
}

async function main() {
  const keeperKey = process.env.KEEPER_PRIVATE_KEY;
  if (!keeperKey) {
    console.error('KEEPER_PRIVATE_KEY not set in environment');
    process.exit(1);
  }

  const provider = await getProvider();
  const keeper   = new ethers.Wallet(keeperKey, provider);
  const vault    = new ethers.Contract(VAULT_ADDR, VAULT_ABI, keeper);
  const readVault= new ethers.Contract(VAULT_ADDR, VAULT_ABI, provider);

  const [portfolioLen, autoEnabled, upkeepResult, keeperBalRaw] = await Promise.all([
    readVault.getPortfolioLength().catch(() => 0n),
    readVault.automationEnabled().catch(() => false),
    readVault.checkUpkeep('0x').catch(() => [false, '0x']),
    provider.getBalance(keeper.address),
  ]);

  const portfolioAssets = Number(portfolioLen);
  const upkeepNeeded    = upkeepResult[0];
  const keeperETH       = parseFloat(ethers.formatEther(keeperBalRaw));

  console.log(`Vault:    ${VAULT_ADDR}`);
  console.log(`Keeper:   ${keeper.address} (${keeperETH.toFixed(4)} ETH)`);
  console.log(`Portfolio: ${portfolioAssets} assets configured`);
  console.log(`AutoEnabled: ${autoEnabled}`);
  console.log(`UpkeepNeeded: ${upkeepNeeded}`);

  if (portfolioAssets === 0) {
    console.log('SKIP: vault portfolio not configured — run activate.js first');
    process.exit(0);
  }

  if (!upkeepNeeded) {
    console.log('SKIP: checkUpkeep() returned false — vault idle or cooldown active');
    process.exit(0);
  }

  if (keeperETH < 0.003) {
    console.warn(`WARNING: keeper gas low (${keeperETH} ETH) — fund ${keeper.address} with 0.02 ETH`);
  }

  console.log('Submitting performUpkeep()...');
  const feeData      = await provider.getFeeData();
  const maxFeePerGas = feeData.maxFeePerGas ? feeData.maxFeePerGas * 120n / 100n : undefined;
  const gasEst       = await vault.performUpkeep.estimateGas('0x').catch(() => 5_000_000n);

  const tx = await vault.performUpkeep('0x', {
    gasLimit:             gasEst * 130n / 100n,
    maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
  });

  console.log(`Tx submitted: ${tx.hash}`);
  const receipt = await tx.wait(1);
  console.log(`Confirmed in block ${receipt.blockNumber} — gas used: ${receipt.gasUsed}`);
  console.log(`Etherscan: https://etherscan.io/tx/${receipt.hash}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Keeper error:', err.message);
  process.exit(1);
});
