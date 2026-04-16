'use strict';
const hre = require('hardhat');

async function main() {
  const forwarder = process.argv[2] || process.env.CHAINLINK_FORWARDER_ADDRESS;
  if (!forwarder) throw new Error('usage: authorize-forwarder.js <forwarderAddress>  (or set CHAINLINK_FORWARDER_ADDRESS)');

  const vaultAddr = process.env.INQUISITIVE_VAULT_ADDRESS;
  if (!vaultAddr) throw new Error('INQUISITIVE_VAULT_ADDRESS is required');

  console.log(`Authorizing forwarder ${forwarder} on vault ${vaultAddr}`);
  const vault = await hre.ethers.getContractAt('InquisitiveVaultV2', vaultAddr);
  const tx = await vault.setAutomationForwarder(forwarder);
  console.log(`tx: ${tx.hash}`);
  await tx.wait();
  console.log('✓ forwarder authorized');
}
main().catch(e => { console.error(e); process.exit(1); });
