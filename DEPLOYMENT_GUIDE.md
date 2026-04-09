# INQUISITIVE Protocol — CLI Deployment Guide

Deploy all missing contracts using Foundry + your hardware wallet. No private key exposure. Single owner setup — no multi-sig complexity.

---

## Prerequisites

1. **Foundry installed**: `foundryup`
2. **Hardware wallet** (Ledger/Trezor) connected OR MetaMask
3. **Your team wallet** (`0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746`) has ETH for gas (0.05+ ETH recommended)

---

## Configuration

Set these environment variables (or hardcode in commands below):

```bash
export MAINNET_RPC="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"  # Or Infura/QuickNode
export ETHERSCAN_API_KEY="your_etherscan_api_key"  # For verification
```

**Contract Addresses (already deployed):**
- INQAI Token: `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5`
- Vault: `0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb`
- Strategy: `0xa2589adA4D647a9977e8e46Db5849883F2e66B3e`
- Strategy Manager: `0x8431173FA9594B43E226D907E26EF68cD6B6542D`
- Profit Maximizer: `0x23a033c08e3562786068cB163967626234A45E37`
- Team Wallet: `0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746`

---

## Deployment Commands (Run in Order)

### Step 1: INQAIStaking (No Constructor Args)

```bash
forge create contracts/INQAIStaking.sol:INQAIStaking \
  --rpc-url $MAINNET_RPC \
  --ledger \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --verify
```

**Save output address as `STAKING_ADDR`**

---

### Step 2: FeeDistributor (No Constructor Args)

```bash
forge create contracts/FeeDistributor.sol:FeeDistributor \
  --rpc-url $MAINNET_RPC \
  --ledger \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --verify
```

**Save output address as `FEE_DISTRIBUTOR_ADDR`**

---

### Step 3: ReferralTracker (No Constructor Args)

```bash
forge create contracts/ReferralTracker.sol:ReferralTracker \
  --rpc-url $MAINNET_RPC \
  --ledger \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --verify
```

**Save output address as `REFERRAL_TRACKER_ADDR`**

---

### Step 4: LiquidityLauncher (No Constructor Args)

```bash
forge create contracts/LiquidityLauncher.sol:LiquidityLauncher \
  --rpc-url $MAINNET_RPC \
  --ledger \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --verify
```

**Save output address as `LIQUIDITY_LAUNCHER_ADDR`**

---

### Step 5: INQAITimelock (No Constructor Args — Single Owner)

```bash
forge create contracts/INQAITimelock.sol:INQAITimelock \
  --rpc-url $MAINNET_RPC \
  --ledger \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --verify
```

**Save output address as `TIMELOCK_ADDR`**

Owner = your deployer wallet automatically. 2-day delay on critical ops.

---

### Step 6: INQAIInsurance (No Constructor Args)

```bash
forge create contracts/INQAIInsurance.sol:INQAIInsurance \
  --rpc-url $MAINNET_RPC \
  --ledger \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --verify
```

**Save output address as `INSURANCE_ADDR`**

---

## Wiring Commands (After All Deployments)

### Wire Staking ↔ FeeDistributor

```bash
# Set FeeDistributor on Staking
forge cast $STAKING_ADDR "setFeeDistributor(address)" $FEE_DISTRIBUTOR_ADDR \
  --rpc-url $MAINNET_RPC \
  --ledger

# Set Staking on FeeDistributor
forge cast $FEE_DISTRIBUTOR_ADDR "setStakingContract(address)" $STAKING_ADDR \
  --rpc-url $MAINNET_RPC \
  --ledger
```

### Wire ReferralTracker ↔ LiquidityLauncher

```bash
# Set Launcher on ReferralTracker
forge cast $REFERRAL_TRACKER_ADDR "setLauncherContract(address)" $LIQUIDITY_LAUNCHER_ADDR \
  --rpc-url $MAINNET_RPC \
  --ledger

# Set ReferralTracker on LiquidityLauncher
forge cast $LIQUIDITY_LAUNCHER_ADDR "setReferralTracker(address)" $REFERRAL_TRACKER_ADDR \
  --rpc-url $MAINNET_RPC \
  --ledger
```

### Fund Referral Bonus Pool

```bash
# Approve INQAI spending
forge cast 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5 "approve(address,uint256)" $REFERRAL_TRACKER_ADDR 1000000000000000000000 \
  --rpc-url $MAINNET_RPC \
  --ledger

# Transfer and fund 1000 INQAI
forge cast 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5 "transfer(address,uint256)" $REFERRAL_TRACKER_ADDR 1000000000000000000000 \
  --rpc-url $MAINNET_RPC \
  --ledger

# Fund the bonus pool
forge cast $REFERRAL_TRACKER_ADDR "fundBonusPool(uint256)" 1000000000000000000000 \
  --rpc-url $MAINNET_RPC \
  --ledger
```

---

## Post-Deployment Actions Required

### 1. Fund FeeDistributor with ETH for Buybacks

Send 0.1+ ETH to `FEE_DISTRIBUTOR_ADDR` — this funds the automatic INQAI buybacks.

### 2. Configure Staking Reward Rate

```bash
forge cast $STAKING_ADDR "setRewardRate(uint256)" 100 \
  --rpc-url $MAINNET_RPC \
  --ledger
```
(Reward rate is in basis points, 100 = 1% per epoch — adjust as needed)

### 3. Register Chainlink Automation for FeeDistributor

Visit https://automation.chain.link
- **Target Contract**: `FEE_DISTRIBUTOR_ADDR`
- **Function**: `distributeFees()`
- **Gas Limit**: 500,000
- **Fund with**: 50+ LINK tokens

### 4. Fund Vault with ETH for AI Execution

Send 0.5+ ETH to `0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb`
This enables `performUpkeep()` to execute trades.

### 5. Configure Vault Portfolio (66 Assets)

Use Etherscan or cast to call `setPortfolio()` on the vault with your 27 ETH-mainnet + cross-chain asset addresses and weights.

---

## Summary of Deployed Contracts

After deployment, update your frontend `.env`:

```
NEXT_PUBLIC_INQAI_STAKING=0x...
NEXT_PUBLIC_FEE_DISTRIBUTOR=0x...
NEXT_PUBLIC_REFERRAL_TRACKER=0x...
NEXT_PUBLIC_LIQUIDITY_LAUNCHER=0x...
NEXT_PUBLIC_TIMELOCK=0x...
NEXT_PUBLIC_INSURANCE=0x...
```

---

## What Each Contract Does

| Contract | Purpose |
|----------|---------|
| **INQAIStaking** | Users stake INQAI to earn protocol fees |
| **FeeDistributor** | Splits fees: 60% buyback→stakers, 20% burn, 20% treasury |
| **ReferralTracker** | On-chain referral tracking, 5% bonus each side |
| **LiquidityLauncher** | Community presale → auto Uniswap V3 launch at $10K |
| **INQAITimelock** | 2-day delay on critical ops, single owner, NO multi-sig |
| **INQAIInsurance** | Protocol insurance fund for black swan events |

---

## Security Notes

- **No private keys in commands** — all signed via `--ledger` (hardware wallet)
- **Timelock**: Single owner (you), 2-day delay, cancel anytime
- **Team wallet gets liquid tokens** — no vesting (as requested)
- **All contracts owned by deployer** — can transfer to Timelock later if desired

---

## One-Script Alternative

Run the full Foundry script (uses your Ledger for signing):

```bash
forge script script/DeployFullProtocol.s.sol \
  --rpc-url $MAINNET_RPC \
  --ledger \
  --broadcast \
  --verify
```

This deploys all 6 contracts + wires them together in one go.

---

## Cost Breakdown

- **Gas for 6 deployments**: ~0.03-0.05 ETH
- **FeeDistributor funding**: 0.1+ ETH (for buybacks)
- **Vault funding**: 0.5+ ETH (for AI trading)
- **Chainlink Automation**: 50+ LINK (one-time)

**Total to get running**: ~0.7 ETH + 50 LINK
