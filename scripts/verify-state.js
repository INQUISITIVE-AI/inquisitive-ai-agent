const { ethers } = require('ethers');
require('dotenv').config();

const RPC_URL = process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Contract addresses from deployment-info.json
const ADDRS = {
  INQAI: '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5',
  Vault: '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb',
  Staking: '0x46625868a36c11310fb988a69100e87519558e59',
  FeeDistributor: '0x0d6aed33e80bc541904906d73ba4bfe18c730a09',
  Referral: '0xa9a851b9659de281bfad8c5c81fe0b55aa23727a',
  Launcher: '0x617664c7dab0462c50780564f9554413c729830d',
  Insurance: '0xa0486fc0b9e4a282eca0435bae141be6982e502e',
  Timelock: '0x972b7f40d1837f0b8bf003d7147de7b9fcfc601e'
};

// Minimal ABIs for checks
const ABIS = {
  FeeDistributor: ['function stakingContract() view returns (address)', 'function totalCollected() view returns (uint256)'],
  Staking: ['function feeDistributor() view returns (address)', 'function rewardRate() view returns (uint256)'],
  Referral: ['function launcherContract() view returns (address)'],
  Launcher: ['function referralTracker() view returns (address)', 'function inqaiToken() view returns (address)'],
  INQAI: ['function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)'],
  Vault: ['function automationEnabled() view returns (bool)', 'function getPortfolioLength() view returns (uint256)', 'function getPhase2Length() view returns (uint256)', 'function owner() view returns (address)']
};

async function checkState() {
  console.log('=== INQUISITIVE ON-CHAIN STATE CHECK ===\n');
  
  // 1. Check ETH balances
  console.log('--- ETH BALANCES ---');
  for (const [name, addr] of Object.entries(ADDRS)) {
    const bal = await provider.getBalance(addr);
    const eth = ethers.formatEther(bal);
    const status = name === 'FeeDistributor' && bal < ethers.parseEther('0.1') ? '⚠️ NEEDS 0.1 ETH' :
                   name === 'Vault' && bal < ethers.parseEther('0.5') ? '⚠️ NEEDS 0.5 ETH' : '✅';
    console.log(`${name}: ${eth} ETH ${status}`);
  }
  
  // 2. Check wiring
  console.log('\n--- CONTRACT WIRING ---');
  const staking = new ethers.Contract(ADDRS.Staking, ABIS.Staking, provider);
  const feeDist = new ethers.Contract(ADDRS.FeeDistributor, ABIS.FeeDistributor, provider);
  const referral = new ethers.Contract(ADDRS.Referral, ABIS.Referral, provider);
  const launcher = new ethers.Contract(ADDRS.Launcher, ABIS.Launcher, provider);
  
  try {
    const stakingFeeDist = await staking.feeDistributor();
    console.log(`Staking.feeDistributor: ${stakingFeeDist === ADDRS.FeeDistributor ? '✅' : '❌ ' + stakingFeeDist}`);
  } catch(e) { console.log('Staking.feeDistributor: ❌ ERROR'); }
  
  try {
    const feeDistStaking = await feeDist.stakingContract();
    console.log(`FeeDistributor.staking: ${feeDistStaking === ADDRS.Staking ? '✅' : '❌ ' + feeDistStaking}`);
  } catch(e) { console.log('FeeDistributor.staking: ❌ ERROR'); }
  
  try {
    const refLauncher = await referral.launcherContract();
    console.log(`Referral.launcher: ${refLauncher === ADDRS.Launcher ? '✅' : '❌ ' + refLauncher}`);
  } catch(e) { console.log('Referral.launcher: ❌ ERROR'); }
  
  try {
    const launchReferral = await launcher.referralTracker();
    console.log(`Launcher.referral: ${launchReferral === ADDRS.Referral ? '✅' : '❌ ' + launchReferral}`);
  } catch(e) { console.log('Launcher.referral: ❌ ERROR'); }
  
  // 3. Check vault configuration
  console.log('\n--- VAULT CONFIG ---');
  const vault = new ethers.Contract(ADDRS.Vault, ABIS.Vault, provider);
  try {
    const autoEnabled = await vault.automationEnabled();
    console.log(`automationEnabled: ${autoEnabled ? '✅' : '❌ DISABLED'}`);
  } catch(e) { console.log('automationEnabled: ❌ ERROR'); }
  
  try {
    const portfolioLen = await vault.getPortfolioLength();
    const phase2Len = await vault.getPhase2Length();
    console.log(`Portfolio (Uniswap): ${portfolioLen} assets ${portfolioLen > 0 ? '✅' : '❌ NONE'}`);
    console.log(`Phase2 (deBridge): ${phase2Len} assets ${phase2Len > 0 ? '✅' : '❌ NONE'}`);
  } catch(e) { console.log('Portfolio: ❌ ERROR - ' + e.message); }
  
  // 4. Check INQAI approval to Launcher
  console.log('\n--- INQAI APPROVALS ---');
  const inqai = new ethers.Contract(ADDRS.INQAI, ABIS.INQAI, provider);
  try {
    const allowance = await inqai.allowance(ADDRS.Vault, ADDRS.Launcher);
    const ethAllow = ethers.formatEther(allowance);
    console.log(`Vault->Launcher allowance: ${ethAllow} INQAI ${allowance >= ethers.parseEther('25000') ? '✅' : '❌ NEEDS 25K'}`);
  } catch(e) { console.log('Vault->Launcher: ❌ ERROR'); }
  
  // 5. Check total collected by FeeDistributor
  console.log('\n--- FEE DISTRIBUTOR ---');
  try {
    const collected = await feeDist.totalCollected();
    console.log(`totalCollected: ${ethers.formatEther(collected)} ETH`);
  } catch(e) { console.log('totalCollected: ❌ ERROR'); }
  
  console.log('\n=== END STATE CHECK ===');
}

checkState().catch(console.error);
