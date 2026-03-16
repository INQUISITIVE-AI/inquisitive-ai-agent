/**
 * deploy-upgraded.js
 * Deploy upgraded InquisitiveVaultUpdated + AIStrategyManager to Ethereum mainnet.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-upgraded.js --network mainnet
 *
 * Required env vars:
 *   PRIVATE_KEY          — deployer private key (set in .env, NEVER commit)
 *   MAINNET_RPC_URL      — Infura/Alchemy RPC URL
 *   ETHERSCAN_API_KEY    — for contract verification
 */

const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying from:', deployer.address);
  console.log('Balance:', hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'ETH');

  // ── 1. Deploy upgraded Vault ──────────────────────────────────────────────
  const INQAI_TOKEN = process.env.INQAI_TOKEN_ADDRESS || '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5';
  console.log('\nDeploying InquisitiveVaultUpdated with INQAI:', INQAI_TOKEN);

  const VaultFactory = await hre.ethers.getContractFactory('InquisitiveVaultUpdated');
  const vault        = await VaultFactory.deploy(INQAI_TOKEN);
  await vault.waitForDeployment();
  const vaultAddr    = await vault.getAddress();
  console.log('InquisitiveVaultUpdated deployed to:', vaultAddr);

  // ── 2. Deploy upgraded AIStrategyManager ─────────────────────────────────
  const OLD_STRATEGY = process.env.INQUISITIVE_STRATEGY_ADDRESS || '0xa2589adA4D647a9977e8e46Db5849883F2e66B3e';
  console.log('\nDeploying AIStrategyManager with vault:', vaultAddr);

  const StratFactory = await hre.ethers.getContractFactory('AIStrategyManager');
  const strategy     = await StratFactory.deploy(OLD_STRATEGY, vaultAddr);
  await strategy.waitForDeployment();
  const stratAddr    = await strategy.getAddress();
  console.log('AIStrategyManager deployed to:', stratAddr);

  // ── 3. Wire vault to strategy ─────────────────────────────────────────────
  console.log('\nSetting strategy in vault...');
  const setTx = await vault.setStrategy(stratAddr);
  await setTx.wait();
  console.log('Strategy set in vault.');

  // ── 4. Set AI executor (same as deployer initially — update to hot wallet later) ──
  console.log('\nSetting AI executor to deployer (update to dedicated hot wallet later)...');
  const execTx = await vault.setAIExecutor(deployer.address);
  await execTx.wait();
  console.log('AI executor set.');

  // ── 5. Summary ────────────────────────────────────────────────────────────
  console.log('\n✅ Deployment complete.\n');
  console.log('── Step 1: Update .env ───────────────────────────────────────────');
  console.log(`INQUISITIVE_VAULT_ADDRESS=${vaultAddr}`);
  console.log(`AI_STRATEGY_MANAGER_ADDRESS=${stratAddr}`);
  console.log('\n── Step 2: Configure vault on-chain (MetaMask, no key in code) ──');
  console.log('   node scripts/activate.js');
  console.log('   → Prints exact arrays for setPortfolio() + setPhase2Registry()');
  console.log(`   → Paste into: https://etherscan.io/address/${vaultAddr}#writeContract`);
  console.log('   → Connect MetaMask and sign both transactions');
  console.log('\n── Step 3: Enable autonomous execution ───────────────────────────');
  console.log(`   Etherscan Write: setAutomationEnabled(true) on ${vaultAddr}`);
  console.log('   Then: https://automation.chain.link → New Upkeep → Custom Logic');
  console.log(`   Paste vault address: ${vaultAddr}`);
  console.log('   Fund with 1 LINK — Chainlink runs performUpkeep() every 60s autonomously');

  // ── 6. Verify on Etherscan ────────────────────────────────────────────────
  if (process.env.ETHERSCAN_API_KEY) {
    console.log('\nVerifying on Etherscan...');
    try {
      await hre.run('verify:verify', { address: vaultAddr,  constructorArguments: [INQAI_TOKEN] });
      await hre.run('verify:verify', { address: stratAddr, constructorArguments: [OLD_STRATEGY, vaultAddr] });
      console.log('Verified on Etherscan.');
    } catch (e) {
      console.warn('Etherscan verification failed (may already be verified):', e.message);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
