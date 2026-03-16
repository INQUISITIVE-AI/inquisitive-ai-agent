#!/usr/bin/env node
/**
 * withdraw-vault.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates the calldata to withdraw ALL ETH from the vault back to the
 * team/owner address (0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746).
 *
 * The vault contract has:
 *   collectFees(address token, uint256 amount)  — onlyOwner
 *   When token == address(0), transfers ETH to owner.
 *
 * USAGE
 * ─────
 * 1. Run this script to see the exact calldata + Etherscan link
 *    node scripts/withdraw-vault.js
 *
 * 2. Go to Etherscan Write Contract:
 *    https://etherscan.io/address/0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52#writeContract
 *
 * 3. Connect MetaMask with the team wallet:
 *    0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746
 *
 * 4. Call collectFees with:
 *    token  = 0x0000000000000000000000000000000000000000   (ETH = address(0))
 *    amount = <full vault ETH balance in wei>
 *
 * OR use the EMERGENCY WITHDRAW button on the analytics page (when connected as owner).
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const { ethers } = require('ethers');

const VAULT_ADDRESS  = '0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52';
const TEAM_ADDRESS   = '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';
const MAINNET_RPC    = process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868';

const VAULT_ABI = [
  'function getETHBalance() external view returns (uint256)',
  'function collectFees(address token, uint256 amount) external',
  'function owner() external view returns (address)',
];

async function main() {
  const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
  const vault    = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  INQUISITIVE VAULT — ETH WITHDRAWAL TO TEAM ADDRESS');
  console.log('════════════════════════════════════════════════════════════════');

  let vaultETH, owner;
  try {
    vaultETH = await vault.getETHBalance();
    owner    = await vault.owner();
  } catch (e) {
    console.error('RPC error:', e.message);
    process.exit(1);
  }

  const ethFormatted = ethers.formatEther(vaultETH);

  console.log(`\n  Vault address : ${VAULT_ADDRESS}`);
  console.log(`  Vault owner   : ${owner}`);
  console.log(`  Team address  : ${TEAM_ADDRESS}`);
  console.log(`  Vault ETH bal : ${ethFormatted} ETH  (${vaultETH.toString()} wei)`);

  if (vaultETH === 0n) {
    console.log('\n  ⚠️  Vault has 0 ETH — nothing to withdraw.\n');
    return;
  }

  // Generate ABI-encoded calldata for collectFees(address(0), fullBalance)
  const iface   = new ethers.Interface(VAULT_ABI);
  const calldata = iface.encodeFunctionData('collectFees', [
    ethers.ZeroAddress,
    vaultETH,
  ]);

  console.log('\n────────────────────────────────────────────────────────────────');
  console.log('  WITHDRAW INSTRUCTIONS (owner signs via MetaMask — no private key)');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('\n  1. Open Etherscan Write Contract:');
  console.log(`     https://etherscan.io/address/${VAULT_ADDRESS}#writeContract`);
  console.log('\n  2. Click "Connect to Web3" → connect MetaMask with team wallet:');
  console.log(`     ${TEAM_ADDRESS}`);
  console.log('\n  3. Find collectFees and enter:');
  console.log(`     token  → 0x0000000000000000000000000000000000000000`);
  console.log(`     amount → ${vaultETH.toString()}  (= ${ethFormatted} ETH)`);
  console.log('\n  4. Click Write → confirm in MetaMask');
  console.log(`     ETH will arrive at team address: ${TEAM_ADDRESS}`);
  console.log('\n────────────────────────────────────────────────────────────────');
  console.log('  RAW CALLDATA (for Gnosis Safe or raw tx):');
  console.log(`  To:   ${VAULT_ADDRESS}`);
  console.log(`  Data: ${calldata}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  // If DEPLOYER_PRIVATE_KEY is available, offer to auto-execute
  const privKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.EXECUTOR_PRIVATE_KEY;
  if (privKey) {
    console.log('  ⚡ DEPLOYER_PRIVATE_KEY found — auto-executing withdrawal...');
    try {
      const wallet  = new ethers.Wallet(privKey, provider);
      const vaultW  = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wallet);
      const tx      = await vaultW.collectFees(ethers.ZeroAddress, vaultETH);
      console.log(`  TX submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`  ✅ Withdrawal confirmed in block ${receipt.blockNumber}`);
      console.log(`     ${ethFormatted} ETH → ${TEAM_ADDRESS}`);
    } catch (err) {
      console.error('  ❌ Auto-execution failed:', err.message);
      console.log('     Use the Etherscan manual method above instead.');
    }
  } else {
    console.log('  ℹ️  No DEPLOYER_PRIVATE_KEY in env — use Etherscan manual method above.');
    console.log('     (MetaMask signs, no private key needed in code)\n');
  }
}

main().catch(console.error);
