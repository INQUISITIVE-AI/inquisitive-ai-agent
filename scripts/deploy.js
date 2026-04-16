'use strict';
const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

const INFO_PATH = path.join(__dirname, '..', 'deployment-info.json');

function loadInfo() {
  if (!fs.existsSync(INFO_PATH)) {
    return { network: hre.network.name, contracts: {}, activeVault: null, legacyVault: null };
  }
  return JSON.parse(fs.readFileSync(INFO_PATH, 'utf8'));
}
function saveInfo(info) { fs.writeFileSync(INFO_PATH, JSON.stringify(info, null, 2) + '\n'); }

async function deployIfMissing(info, key, factoryName, args = []) {
  if (info.contracts[key]) {
    console.log(`• ${key} already deployed at ${info.contracts[key]} — skipping`);
    return info.contracts[key];
  }
  console.log(`→ Deploying ${key}…`);
  const Factory = await hre.ethers.getContractFactory(factoryName);
  const c = await Factory.deploy(...args);
  await c.waitForDeployment();
  const addr = await c.getAddress();
  info.contracts[key] = addr;
  saveInfo(info);
  console.log(`  ✓ ${key} → ${addr}`);
  return addr;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Network:  ${hre.network.name}`);
  console.log(`Balance:  ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);

  const info = loadInfo();
  info.network  = hre.network.name;
  info.deployer = deployer.address;

  const MAINNET_CANONICAL = {
    INQAI:                 '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5',
    InquisitiveVaultV2:    '0xb99dc519c4373e5017222bbd46f42a4e12a0ec25',
    INQAIStaking:          '0x46625868a36c11310fb988a69100e87519558e59',
    FeeDistributor:        '0x0d6aed33e80bc541904906d73ba4bfe18c730a09',
    ReferralTracker:       '0xa9a851b9659de281bfad8c5c81fe0b55aa23727a',
    LiquidityLauncher:     '0x617664c7dab0462c50780564f9554413c729830d',
    INQAITimelock:         '0x972b7f40d1837f0b8bf003d7147de7b9fcfc601e',
    INQAIInsurance:        '0xa0486fc0b9e4a282eca0435bae141be6982e502e',
    InquisitiveVault:      '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb',
  };

  if (hre.network.name === 'mainnet') {
    for (const [k, v] of Object.entries(MAINNET_CANONICAL)) {
      if (!info.contracts[k]) info.contracts[k] = v;
    }
    info.activeVault = MAINNET_CANONICAL.InquisitiveVaultV2;
    info.legacyVault = MAINNET_CANONICAL.InquisitiveVault;
    saveInfo(info);
    console.log('✓ Mainnet canonical addresses recorded. No new deploys from this script on mainnet.');
    console.log('  Next: npm run setup:vault');
    return;
  }

  await deployIfMissing(info, 'INQAI', 'INQAI');
  const inqai = info.contracts.INQAI;
  await deployIfMissing(info, 'InquisitiveVaultV2', 'InquisitiveVaultV2', [inqai]);
  await deployIfMissing(info, 'INQAIStaking', 'INQAIStaking', [inqai]);
  await deployIfMissing(info, 'FeeDistributor', 'FeeDistributor', [inqai, info.contracts.INQAIStaking]);
  await deployIfMissing(info, 'ReferralTracker', 'ReferralTracker', [inqai]);
  await deployIfMissing(info, 'LiquidityLauncher', 'LiquidityLauncher', [inqai]);
  await deployIfMissing(info, 'INQAITimelock', 'INQAITimelock', [86400]);
  await deployIfMissing(info, 'INQAIInsurance', 'INQAIInsurance', [inqai]);

  info.activeVault = info.contracts.InquisitiveVaultV2;
  saveInfo(info);
  console.log('\n✓ Deployment complete.');
  console.log(`  Active vault: ${info.activeVault}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
