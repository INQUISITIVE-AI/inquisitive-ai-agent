const { ethers } = require('ethers');
const tokens = [
  { sym: 'BTC',  addr: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
  { sym: 'ETH',  addr: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' },
  { sym: 'USDC', addr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { sym: 'AAVE', addr: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' },
  { sym: 'UNI',  addr: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
  { sym: 'LDO',  addr: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32' },
  { sym: 'ARB',  addr: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1' },
  { sym: 'PAXG', addr: '0x45804880De22913dAFE09f4980848ECE6EcbAf78' },
  { sym: 'INJ',  addr: '0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30' },
  { sym: 'ENA',  addr: '0x57e114B691Db790C35207b2e685D4A43181e6061' },
  { sym: 'POL',  addr: '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6' },
  { sym: 'FET',  addr: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85' },
  { sym: 'RNDR', addr: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24' },
  { sym: 'LINK', addr: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
  { sym: 'ONDO', addr: '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3' },
  { sym: 'GRT',  addr: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7' },
  { sym: 'SKY',  addr: '0x56072C95FAA701256059aa122697B133aDEd9279' },
  { sym: 'STRK', addr: '0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766' },
  { sym: 'QNT',  addr: '0x4a220E6096B25EADb88358cb44068A3248254675' },
  { sym: 'ZRO',  addr: '0x6985884C4392D348587B19cb9eAAf157F13271cD' },
  { sym: 'CHZ',  addr: '0x3506424F91fD33084466F402d5D97f05F8e3b4AF' },
  { sym: 'ACH',  addr: '0x4e15361FD6b4BB609Fa63C81A2be19d873717870' },
  { sym: 'DBR',  addr: '0xdBe2c93a4E82a177617f4a43Ee1a69C69EE8e7e6' },
  { sym: 'XSGD', addr: '0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96' },
  { sym: 'BRZ',  addr: '0x420412E765BFa6d85aaaC94b4f7b708C89be2e2B' },
  { sym: 'JPYC', addr: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB' },
];

let anyBad = false;
tokens.forEach(t => {
  try {
    const correct = ethers.getAddress(t.addr);
    if (correct === t.addr) {
      console.log('OK  ', t.sym, t.addr);
    } else {
      console.log('BAD ', t.sym);
      console.log('     input:  ', t.addr);
      console.log('     correct:', correct);
      anyBad = true;
    }
  } catch (e) {
    console.log('ERR ', t.sym, e.message);
    anyBad = true;
  }
});

console.log('\n' + (anyBad ? '❌ BAD ADDRESSES FOUND — fix before setPortfolio' : '✅ ALL 26 ADDRESSES VALID'));
