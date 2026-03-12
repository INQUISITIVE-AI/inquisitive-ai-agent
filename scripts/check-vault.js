// scripts/check-vault.js — verify what contract is deployed at the vault address
const https = require('https');

const VAULT = '0x506F72eABc90793ae8aC788E650bC9407ED853Fa';
const RPC   = 'https://eth.llamarpc.com';

function call(data) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ jsonrpc:'2.0', id:1, method:'eth_call', params:[{ to: VAULT, data }, 'latest'] });
    const req  = https.request(RPC, { method:'POST', headers:{'Content-Type':'application/json'} }, (r) => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d).result); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(body); req.end();
  });
}

function getBalance() {
  return new Promise((resolve) => {
    const body = JSON.stringify({ jsonrpc:'2.0', id:1, method:'eth_getBalance', params:[VAULT, 'latest'] });
    const req  = https.request(RPC, { method:'POST', headers:{'Content-Type':'application/json'} }, (r) => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d).result); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(body); req.end();
  });
}

function getCode() {
  return new Promise((resolve) => {
    const body = JSON.stringify({ jsonrpc:'2.0', id:1, method:'eth_getCode', params:[VAULT, 'latest'] });
    const req  = https.request(RPC, { method:'POST', headers:{'Content-Type':'application/json'} }, (r) => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d).result); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(body); req.end();
  });
}

async function main() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  INQUISITIVE — Vault Contract State Check');
  console.log(`  Address: ${VAULT}`);
  console.log('══════════════════════════════════════════════════════════\n');

  const [code, ethBal] = await Promise.all([getCode(), getBalance()]);

  const ethAmount = ethBal ? (parseInt(ethBal, 16) / 1e18).toFixed(6) : '0';
  const codeLen   = code && code !== '0x' ? (code.length - 2) / 2 : 0;

  console.log(`Contract deployed:    ${codeLen > 0 ? 'YES' : 'NO — empty address'}`);
  console.log(`Bytecode size:        ${codeLen} bytes`);
  console.log(`ETH balance:          ${ethAmount} ETH`);

  if (codeLen === 0) {
    console.log('\n❌ VERDICT: NO CONTRACT at this address.');
    console.log('   The vault has never been deployed, OR was deployed to a different address.');
    console.log('   ACTION: Deploy InquisitiveVaultUpdated via Remix or Hardhat.\n');
    return;
  }

  // Selector check — keccak256 of function signatures
  const selectors = {
    'getPortfolioLength()':   '0x82901869',
    'checkUpkeep(bytes)':     '0x6e04d938',
    'performUpkeep(bytes)':   '0x4585e33b',
    'setPortfolio(address[],uint256[],uint24[])': '0x5ce4f9b2',
    'getETHBalance()':        '0xc8e45b86',
    'automationEnabled()':    '0x6d92e8fd',
    'cycleCount()':           '0x7b18a2d4',
    'owner()':                '0x8da5cb5b',
  };

  console.log('\nFunction availability (call results):');
  const results = {};
  for (const [name, sel] of Object.entries(selectors)) {
    const r = await call(sel);
    const exists = r !== null && r !== '0x' && !r?.startsWith('0x08c379a'); // not a revert
    results[name] = exists;
    console.log(`  ${exists ? '✅' : '❌'} ${name.padEnd(48)} ${r ? r.slice(0,34) : 'null'}`);
  }

  const hasNew = results['getPortfolioLength()'] && results['setPortfolio(address[],uint256[],uint24[])'];
  const hasOld = results['owner()'];

  console.log('\n══════════════════════════════════════════════════════════');
  if (hasNew) {
    const portLen = results['getPortfolioLength()'];
    console.log('✅ VERDICT: NEW vault (InquisitiveVaultUpdated) IS deployed.');
    console.log('   setPortfolio() exists. checkUpkeep/performUpkeep exist.');
    console.log('\n   NEXT STEP: Run node scripts/generate-portfolio-calldata.js');
    console.log('   Then call setPortfolio() via Etherscan Write Contract (MetaMask).');
  } else if (hasOld) {
    console.log('⚠️  VERDICT: OLD vault deployed — missing setPortfolio/checkUpkeep/performUpkeep.');
    console.log('   ACTION: Deploy InquisitiveVaultUpdated to replace it.');
    console.log('   Run: npx hardhat run scripts/deploy-upgraded.js --network mainnet');
  } else {
    console.log('❓ VERDICT: Unknown contract — could not identify functions.');
  }
  console.log('══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
