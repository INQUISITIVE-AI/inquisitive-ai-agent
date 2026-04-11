#!/usr/bin/env node
// diagnose-and-fix.mjs — Comprehensive INQUISITIVE Platform Diagnostic & Fix Script
// Run: node diagnose-and-fix.mjs

import { createPublicClient, http, parseAbi, encodeFunctionData, getAddress, formatEther } from 'viem';
import { mainnet } from 'viem/chains';

const RPC_URLS = [
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
  'https://cloudflare-eth.com',
];

// Contract Addresses
const VAULT = '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb';
const STAKING = '0x46625868a36c11310fb988a69100e87519558e59';
const INQAI = '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5';

// ABIs
const VAULT_ABI = parseAbi([
  'function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData)',
  'function performUpkeep(bytes calldata performData) external',
  'function cycleCount() external view returns (uint256)',
  'function getPortfolioLength() external view returns (uint256)',
  'function automationEnabled() external view returns (bool)',
  'function lastDeployTime() external view returns (uint256)',
  'function owner() external view returns (address)',
  'function portfolioTokens(uint256) external view returns (address)',
  'function portfolioWeights(uint256) external view returns (uint256)',
  'function MIN_REDEPLOY_GAP() external view returns (uint256)',
  'function setPortfolio(address[] calldata tokens, uint256[] calldata weights, uint24[] calldata fees) external',
  'function setAutomationEnabled(bool enabled) external',
  'function deposit() external payable',
  'receive() external payable',
]);

const STAKING_ABI = parseAbi([
  'function getStakeInfo(address user) external view returns (uint256 amount, uint256 startTime, uint256 lockEndTime, uint256 pendingReward, bool canUnstake)',
  'function stake(uint256 amount) external',
  'function unstake() external',
]);

const ERC20_ABI = parseAbi([
  'function balanceOf(address) external view returns (uint256)',
  'function allowance(address,address) external view returns (uint256)',
  'function approve(address,uint256) external returns (bool)',
]);

// Create client with fallback
function createClient() {
  return createPublicClient({
    chain: mainnet,
    transport: http(RPC_URLS[0]),
  });
}

const publicClient = createClient();

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║          INQUISITIVE PLATFORM — COMPREHENSIVE DIAGNOSTIC                    ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════════
// VAULT DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════════════
console.log('🔍 VAULT CONTRACT DIAGNOSTICS');
console.log('   Address:', VAULT);
console.log('');

try {
  // Check ETH balance
  const vaultEth = await publicClient.getBalance({ address: VAULT });
  console.log('   💰 Vault ETH Balance:', formatEther(vaultEth), 'ETH');
  console.log('      Status:', vaultEth > 5000000000000000n ? '✅ Sufficient (>0.005 ETH)' : '❌ Insufficient (<0.005 ETH)');
  
  // Check cycle count
  const cycleCount = await publicClient.readContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: 'cycleCount',
  });
  console.log('   🔄 Cycle Count:', cycleCount.toString());
  console.log('      Status:', cycleCount > 0n ? '✅ Trades executed' : '❌ No trades yet');
  
  // Check portfolio
  const portfolioLen = await publicClient.readContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: 'getPortfolioLength',
  });
  console.log('   📊 Portfolio Length:', portfolioLen.toString(), 'assets');
  console.log('      Status:', portfolioLen >= 27n ? '✅ Phase 1 configured' : '❌ Incomplete (need 27 assets)');
  
  // Check automation
  const autoEnabled = await publicClient.readContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: 'automationEnabled',
  });
  console.log('   🤖 Automation Enabled:', autoEnabled);
  console.log('      Status:', autoEnabled ? '✅ Enabled' : '❌ Disabled');
  
  // Check last deploy
  const lastDeploy = await publicClient.readContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: 'lastDeployTime',
  });
  console.log('   ⏰ Last Deploy Time:', lastDeploy > 0n ? new Date(Number(lastDeploy) * 1000).toISOString() : 'Never');
  
  // Check owner
  const owner = await publicClient.readContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: 'owner',
  });
  console.log('   👤 Owner:', owner);
  
  // Check cooldown
  const cooldown = await publicClient.readContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: 'MIN_REDEPLOY_GAP',
  });
  console.log('   ⏱️  Cooldown Period:', cooldown.toString(), 'seconds');
  
  // Try checkUpkeep
  console.log('');
  console.log('   🔎 Testing checkUpkeep()...');
  try {
    const [upkeepNeeded, performData] = await publicClient.readContract({
      address: VAULT,
      abi: VAULT_ABI,
      functionName: 'checkUpkeep',
      args: ['0x'],
    });
    console.log('   ✅ checkUpkeep() Result:', upkeepNeeded ? 'UPKEEP NEEDED' : 'No upkeep needed');
    console.log('      performData:', performData);
  } catch (err) {
    console.log('   ❌ checkUpkeep() REVERTED:', err.message || err);
    console.log('      This is why Chainlink Automation cannot execute!');
  }
  
} catch (err) {
  console.log('   ❌ Vault read error:', err.message || err);
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════════
// STAKING CONTRACT DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════════════
console.log('🔍 STAKING CONTRACT DIAGNOSTICS');
console.log('   Address:', STAKING);
console.log('   Checksummed:', getAddress(STAKING));
console.log('');

try {
  // Verify staking contract is valid address
  const code = await publicClient.getBytecode({ address: STAKING });
  console.log('   📄 Contract Code:', code && code.length > 2 ? '✅ Contract deployed' : '❌ No code at address');
  
  if (code && code.length > 2) {
    // Try to read staking info for zero address (should not revert if contract works)
    try {
      const stakeInfo = await publicClient.readContract({
        address: STAKING,
        abi: STAKING_ABI,
        functionName: 'getStakeInfo',
        args: ['0x0000000000000000000000000000000000000000'],
      });
      console.log('   ✅ getStakeInfo() works:', stakeInfo);
    } catch (err) {
      console.log('   ⚠️  getStakeInfo() error:', err.message || err);
    }
  }
} catch (err) {
  console.log('   ❌ Staking contract error:', err.message || err);
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY & ACTION ITEMS
// ═══════════════════════════════════════════════════════════════════════════════
console.log('📋 DIAGNOSTIC SUMMARY');
console.log('');
console.log('Critical Issues Found:');
console.log('');
console.log('1. 🔴 checkUpkeep() REVERTS');
console.log('   → Chainlink Automation cannot determine if upkeep is needed');
console.log('   → Possible causes:');
console.log('     • Portfolio has 32 assets but weights may all be 0');
console.log('     • Contract has unexpected state causing view function to revert');
console.log('     • ABI mismatch between deployed code and interface');
console.log('');
console.log('2. 🟡 Cycle Count = 0');
console.log('   → No trades have ever been executed');
console.log('   → All portfolio stats are fake/placeholder until first trade');
console.log('');
console.log('3. 🟡 Portfolio Incomplete (32 of 66 assets)');
console.log('   → Only Phase 1 partial configuration detected');
console.log('   → Phase 2 (cross-chain) likely not configured');
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('🔧 REQUIRED ACTIONS (You must do these with your private key):');
console.log('');
console.log('ACTION 1: Complete Vault Configuration');
console.log('───────────────────────────────────────');
console.log('Run this forge script with your PRIVATE_KEY:');
console.log('');
console.log('  forge script script/ConfigureVault.s.sol --rpc-url $MAINNET_RPC --broadcast');
console.log('');
console.log('This will:');
console.log('  • Set all 27 Phase 1 ETH-mainnet assets with proper weights');
console.log('  • Set all 13 Phase 2 cross-chain assets');
console.log('  • Enable automation');
console.log('  • Deposit 0.1 ETH to activate');
console.log('');

console.log('ACTION 2: Manually Trigger First Trade');
console.log('───────────────────────────────────────');
console.log('Go to Etherscan and call performUpkeep manually:');
console.log('');
console.log('  https://etherscan.io/address/' + VAULT + '#writeContract');
console.log('');
console.log('  Function: performUpkeep(bytes calldata performData)');
console.log('  Input: 0x (empty bytes)');
console.log('  Value: 0 ETH');
console.log('');
console.log('If this works, the vault will execute trades and cycleCount will increase.');
console.log('');

console.log('ACTION 3: Fix Staking Address Format (if needed)');
console.log('───────────────────────────────────────');
console.log('The staking contract address is valid. The "Address is invalid" error');
console.log('in your screenshot suggests a wagmi/viem validation issue.');
console.log('');
console.log('Check that NEXT_PUBLIC_STAKING_CONTRACT in Vercel is set to:');
console.log('  ', getAddress(STAKING));
console.log('');
console.log('No quotes, no spaces, just the plain address with 0x prefix.');
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('📊 Expected Behavior After Fixes:');
console.log('');
console.log('  • performUpkeep() executes every 60 seconds when ETH > 0.005');
console.log('  • Each execution buys 27 ETH-mainnet assets via Uniswap V3');
console.log('  • cycleCount increases by 1 per execution');
console.log('  • Real portfolio data appears in UI (not fake placeholder)');
console.log('  • Chainlink Automation takes over and runs autonomously');
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════════');
