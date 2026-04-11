# INQUISITIVE Platform - Post-Deployment Checklist

Based on DOCUMENTATION.md - Complete these tasks to make the token fully operational.

## Remaining Tasks

### 1. Fund FeeDistributor with 0.1+ ETH for Buybacks
**Contract:** `0x0d6aed33e80bc541904906d73ba4bfe18c730a09`

**Action:** Send 0.1 ETH from team wallet to FeeDistributor address.

**Why:** Enables the 60% buyback mechanism. Without funding, no INQAI buybacks can occur.

**Verification:** Check balance at https://etherscan.io/address/0x0d6aed33e80bc541904906d73ba4bfe18c730a09

---

### 2. Fund Vault with 0.5+ ETH for AI Trade Execution
**Contract:** `0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb`

**Action:** Send 0.5 ETH from team wallet to Vault address.

**Why:** Vault needs ETH to execute trades across 66 assets. Minimum 0.005 ETH per trade cycle.

**Verification:** Check balance at https://etherscan.io/address/0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb

**Current Status:** Already has 0.0112 ETH (sufficient for first trade)

---

### 3. Register Chainlink Automation (CRITICAL FOR AUTONOMOUS TRADING)
**URL:** https://automation.chain.link

**Steps:**
1. Connect MetaMask (team wallet: `0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746`)
2. Click "Register New Upkeep"
3. Select "Custom Logic"
4. **Target Contract:** `0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb`
5. **Function:** `performUpkeep(bytes)`
6. **Gas Limit:** 5,000,000
7. **Check Data:** `0x` (empty bytes)
8. **Fund with LINK:** Minimum 50 LINK tokens

**Why:** This is the ONLY autonomous execution method per documentation. Without this, the AI cannot trade automatically.

**LINK Token:** Available on Uniswap or major exchanges

---

### 4. Configure Staking Reward Rate
**Contract:** `0x46625868a36c11310fb988a69100e87519558e59` (INQAIStaking)

**Action:** Call `setRewardRate(uint256)` with value `100`

**Why:** Sets 1% reward per epoch (100 basis points = 1%)

**Via Etherscan:**
1. Go to https://etherscan.io/address/0x46625868a36c11310fb988a69100e87519558e59#writeContract
2. Connect team wallet
3. Find `setRewardRate`
4. Enter `100`
5. Submit transaction

---

### 5. Approve 25K INQAI to LiquidityLauncher for Presale Pool
**INQAI Token:** `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5`
**LiquidityLauncher:** `0x617664c7dab0462c50780564f9554413c729830d`

**Action:** Call `approve(address spender, uint256 amount)` on INQAI token

**Parameters:**
- `spender`: `0x617664c7dab0462c50780564f9554413c729830d`
- `amount`: `25000000000000000000000` (25,000 INQAI with 18 decimals)

**Via Etherscan:**
1. Go to https://etherscan.io/address/0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5#writeContract
2. Connect team wallet
3. Find `approve`
4. Enter spender: `0x617664c7dab0462c50780564f9554413c729830d`
5. Enter amount: `25000000000000000000000`
6. Submit transaction

**Why:** Enables the $10K auto-launch presale functionality.

---

### 6. Apply to CEXs: Gate.io, MEXC, Bitget

**Run:**
```bash
node scripts/deploy.js --cex
```

This generates standardized applications for:
- Gate.io
- MEXC
- Bitget
- Binance (optional)
- Coinbase (optional)

**Required:**
- CoinGecko listing (complete)
- Etherscan verification (complete)
- Website live (complete)
- Whitepaper (generate from docs)

---

## Current Status

| Task | Status | Contract/URL |
|------|--------|--------------|
| Contracts deployed | ✅ | All 11 verified |
| Staking wired | ✅ | `0x46625868a36c11310fb988a69100e87519558e59` |
| Referral wired | ✅ | `0xa9a851b9659de281bfad8c5c81fe0b55aa23727a` |
| Vault configured | ✅ | 32 assets set |
| Vault funded | ✅ | 0.0112 ETH |
| FeeDistributor funded | ❌ | Needs 0.1 ETH |
| Chainlink Automation | ❌ | Not registered |
| Staking reward rate | ❌ | Not configured |
| LiquidityLauncher approval | ❌ | Needs 25K INQAI |
| CEX applications | ❌ | Not submitted |

---

## Priority Order

1. **Register Chainlink Automation** - Enables autonomous AI trading
2. **Configure staking reward rate** - Enables staking rewards
3. **Approve INQAI to LiquidityLauncher** - Enables presale
4. **Fund FeeDistributor** - Enables buybacks
5. **Apply to CEXs** - Enables exchange listings

---

## Token Contract

**INQAI:** `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5`

**Total Supply:** 100,000,000 INQAI (fixed)

**Tokenomics:**
- 60% buybacks → stakers
- 20% permanent burn  
- 15% treasury
- 5% Chainlink Automation

**© 2026 INQUISITIVE**
