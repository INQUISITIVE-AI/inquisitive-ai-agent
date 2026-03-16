const { ethers } = require('ethers');

const RPCS = [
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
  'https://eth.llamarpc.com',
];

async function getProvider() {
  for (const url of RPCS) {
    try {
      const p = new ethers.JsonRpcProvider(url);
      await p.getBlockNumber();
      return p;
    } catch {}
  }
  throw new Error('All RPCs failed');
}

(async () => {
  const provider = await getProvider();
  const TEAM = '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';
  const nonce = await provider.getTransactionCount(TEAM);
  console.log('Team wallet nonce:', nonce);

  for (let n = 0; n < nonce; n++) {
    const addr = ethers.getCreateAddress({ from: TEAM, nonce: n });
    try {
      const code = await provider.getCode(addr);
      if (code && code.length > 4) {
        console.log(`CONTRACT nonce=${n}: ${addr}  (${(code.length - 2) / 2} bytes)`);
      }
    } catch { continue; }
  }
  console.log('Done.');
})().catch(e => console.error('Error:', e.message));
