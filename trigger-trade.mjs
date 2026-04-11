#!/usr/bin/env node
// trigger-trade.mjs — Manually trigger vault performUpkeep()
// Run: node trigger-trade.mjs
// Requires: PRIVATE_KEY env var with the vault owner's key

import { createWalletClient, createPublicClient, http, encodeFunctionData, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const VAULT = '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb';

const VAULT_ABI = parseAbi([
  'function performUpkeep(bytes calldata performData) external',
  'function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData)',
  'function cycleCount() external view returns (uint256)',
  'function owner() external view returns (address)',
  'function automationEnabled() external view returns (bool)',
]);

const RPC_URL = process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: PRIVATE_KEY environment variable not set');
  console.error('   Set it with: export PRIVATE_KEY=0x...');
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http(RPC_URL),
});

console.log('═════════════════════════════════════════════════════════════════');
console.log('🔥 INQUISITIVE VAULT — MANUAL TRADE TRIGGER');
console.log('═════════════════════════════════════════════════════════════════');
console.log('');
console.log('Vault Address:', VAULT);
console.log('Owner Address:', account.address);
console.log('RPC Endpoint:', RPC_URL);
console.log('');

async function main() {
  // Check current state
  console.log('📊 Current Vault State:');
  console.log('');
  
  try {
    const owner = await publicClient.readContract({
      address: VAULT,
      abi: VAULT_ABI,
      functionName: 'owner',
    });
    console.log('   Vault Owner:', owner);
    console.log('   Are you owner?', owner.toLowerCase() === account.address.toLowerCase() ? '✅ YES' : '❌ NO');
    
    const cycleCount = await publicClient.readContract({
      address: VAULT,
      abi: VAULT_ABI,
      functionName: 'cycleCount',
    });
    console.log('   Current Cycle:', cycleCount.toString());
    
    const autoEnabled = await publicClient.readContract({
      address: VAULT,
      abi: VAULT_ABI,
      functionName: 'automationEnabled',
    });
    console.log('   Automation Enabled:', autoEnabled ? '✅ Yes' : '❌ No');
    
    const ethBalance = await publicClient.getBalance({ address: VAULT });
    console.log('   Vault ETH:', (Number(ethBalance) / 1e18).toFixed(6), 'ETH');
    
  } catch (err) {
    console.error('   ❌ Error reading vault state:', err.message);
  }
  
  console.log('');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('');
  
  // Test checkUpkeep
  console.log('🔎 Testing checkUpkeep()...');
  try {
    const [upkeepNeeded, performData] = await publicClient.readContract({
      address: VAULT,
      abi: VAULT_ABI,
      functionName: 'checkUpkeep',
      args: ['0x'],
    });
    console.log('   ✅ checkUpkeep() succeeded');
    console.log('   Upkeep Needed:', upkeepNeeded ? '✅ YES (will trade)' : '❌ NO (conditions not met)');
    console.log('   Perform Data:', performData);
  } catch (err) {
    console.log('   ❌ checkUpkeep() REVERTED:', err.message || err);
    console.log('');
    console.log('   ⚠️  CANNOT PROCEED: checkUpkeep must succeed before performUpkeep');
    console.log('   Fix the vault configuration first (see VAULT-EMERGENCY-FIX.md)');
    process.exit(1);
  }
  
  console.log('');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('');
  
  // Confirm with user
  console.log('🚀 Ready to trigger performUpkeep()');
  console.log('');
  console.log('   This will:');
  console.log('   • Spend gas to execute the trade (~0.003 ETH)');
  console.log('   • Buy portfolio assets using vault ETH');
  console.log('   • Increase cycleCount by 1');
  console.log('   • Start autonomous trading once Chainlink is funded');
  console.log('');
  
  // For automated execution, comment out this check
  const shouldProceed = process.env.FORCE === 'true';
  
  if (!shouldProceed) {
    console.log('   To execute, set FORCE=true:');
    console.log('   FORCE=true node trigger-trade.mjs');
    console.log('');
    console.log('   ⚠️  Aborting (FORCE not set)');
    process.exit(0);
  }
  
  // Execute performUpkeep
  console.log('   Executing performUpkeep()...');
  console.log('');
  
  try {
    const hash = await walletClient.writeContract({
      address: VAULT,
      abi: VAULT_ABI,
      functionName: 'performUpkeep',
      args: ['0x'],
      value: 0n,
    });
    
    console.log('   ✅ Transaction sent!');
    console.log('   Hash:', hash);
    console.log('');
    console.log('   View on Etherscan: https://etherscan.io/tx/' + hash);
    console.log('');
    
    // Wait for confirmation
    console.log('   Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    console.log('');
    console.log('   ✅ Transaction confirmed!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    console.log('   Status:', receipt.status === 'success' ? '✅ SUCCESS' : '❌ FAILED');
    
    if (receipt.status === 'success') {
      const newCycleCount = await publicClient.readContract({
        address: VAULT,
        abi: VAULT_ABI,
        functionName: 'cycleCount',
      });
      console.log('');
      console.log('   🎉 FIRST TRADE EXECUTED!');
      console.log('   New Cycle Count:', newCycleCount.toString());
      console.log('');
      console.log('   The vault is now active. Real data will appear in the UI.');
      console.log('   Chainlink Automation will continue trading autonomously.');
    }
    
  } catch (err) {
    console.error('');
    console.error('   ❌ Transaction failed:', err.message || err);
    console.error('');
    console.error('   Common causes:');
    console.error('   • Not the vault owner (need owner address to execute)');
    console.error('   • Insufficient ETH for gas');
    console.error('   • Portfolio not properly configured');
    console.error('   • Cooldown period active (wait 60s between trades)');
    process.exit(1);
  }
}

main().catch(console.error);
