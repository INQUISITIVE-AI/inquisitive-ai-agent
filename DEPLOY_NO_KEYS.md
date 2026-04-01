# ZERO-PRIVATE-KEY Deployment Guide

> **No private keys in any file, code, or environment variable. Ever.**  
> Deploy using MetaMask or Remix IDE only.

---

## Option 1: MetaMask + Hardhat (RECOMMENDED)

Deploy contracts using MetaMask signing — no private key storage.

### Prerequisites
```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile
```

### Step 1: Start Local Node
```bash
npx hardhat node --fork https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### Step 2: Connect MetaMask
1. Open MetaMask
2. Add network:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH
3. Switch to team wallet: `0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746`

### Step 3: Deploy
```bash
npx hardhat run scripts/deploy-metamask.js --network localhost
```

MetaMask will prompt you to sign each transaction.

---

## Option 2: Remix IDE (Alternative)

Deploy directly on Etherscan via Remix + MetaMask.

### Step 1: Open Remix
Go to [remix.ethereum.org](https://remix.ethereum.org)

### Step 2: Create Files
Create these files in Remix:

**File: `LiquidityLauncher.sol`**
- Copy from: `@/contracts/LiquidityLauncher.sol`

**File: `FeeDistributor.sol`**
- Copy from: `@/contracts/FeeDistributor.sol`

**File: `INQAIStaking.sol`**
- Copy from: `@/contracts/INQAIStaking.sol`

**File: `ReferralTracker.sol`**
- Copy from: `@/contracts/ReferralTracker.sol`

### Step 3: Compile
1. Select Solidity version 0.8.24
2. Click "Compile" for each contract

### Step 4: Deploy
1. Environment: Injected Provider (MetaMask)
2. Ensure MetaMask is on Ethereum Mainnet
3. Ensure team wallet is selected
4. Deploy each contract individually
5. MetaMask will prompt for each deployment

### Step 5: Connect Contracts
After deployment, call these functions on each contract:

**On FeeDistributor:**
```
setStakingContract(<INQAIStaking_address>)
```

**On INQAIStaking:**
```
setFeeDistributor(<FeeDistributor_address>)
```

**On ReferralTracker:**
```
setLauncherContract(<LiquidityLauncher_address>)
```

---

## Post-Deployment Setup

### 1. Approve INQAI to Launcher
From team wallet, approve 25,000 INQAI:

**Via Etherscan:**
1. Go to INQAI token contract: `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5`
2. Write Contract → `approve`
3. Spender: `<LiquidityLauncher_address>`
4. Amount: `25000000000000000000000` (25K with 18 decimals)

### 2. Fund Referral Bonus Pool
From team wallet, send INQAI to ReferralTracker:

**Via Etherscan:**
1. INQAI token → `transfer`
2. To: `<ReferralTracker_address>`
3. Amount: `5000000000000000000000` (5K with 18 decimals)

---

## Contract Addresses After Deployment

Save these after deployment:

```
NEXT_PUBLIC_LAUNCHER_CONTRACT=0x...
NEXT_PUBLIC_DISTRIBUTOR_CONTRACT=0x...
NEXT_PUBLIC_STAKING_CONTRACT=0x...
NEXT_PUBLIC_REFERRAL_CONTRACT=0x...
```

Update `.env.local` with these addresses (no private keys!).

---

## Verification

Verify contracts on Etherscan via Hardhat:

```bash
export ETHERSCAN_API_KEY=your_api_key

npx hardhat verify --network mainnet <LAUNCHER_ADDRESS>
npx hardhat verify --network mainnet <DISTRIBUTOR_ADDRESS>
npx hardhat verify --network mainnet <STAKING_ADDRESS>
npx hardhat verify --network mainnet <REFERRAL_ADDRESS>
```

---

## Security Checklist

- [ ] No PRIVATE_KEY in .env
- [ ] No PRIVATE_KEY in any .js or .ts file
- [ ] No PRIVATE_KEY in any .sol file
- [ ] No PRIVATE_KEY in command history
- [ ] MetaMask used for all signing
- [ ] Team wallet is contract owner
- [ ] Chainlink Automation registered for vault
- [ ] Contracts verified on Etherscan

---

## Chainlink Automation Setup

After deployment, register automation for each contract:

1. Go to [automation.chain.link](https://automation.chain.link)
2. Register new Upkeep for each:
   - **Vault**: `0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb` (existing)
   - **FeeDistributor**: Call `distributeFees()` when balance > 0.01 ETH
   - **LiquidityLauncher**: Call `checkAndLaunch()` daily
3. Fund with LINK
4. MetaMask signs — no private key storage

---

**ZERO PRIVATE KEYS. EVER.**
