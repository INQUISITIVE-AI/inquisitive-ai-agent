# INQUISITIVE

> AI-Managed Asset-Backed Token — 100M Fixed Supply, 66 Assets, Fully Autonomous

| Contract | Address |
|----------|---------|
| INQAI Token | `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5` |
| Vault | `0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb` |
| Team | `0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746` |

---

## Quick Start

```bash
npm install
npx hardhat compile
npx hardhat node
# Connect MetaMask to localhost:8545, switch to team wallet
npx hardhat run scripts/deploy.js --network localhost
```

---

## Contracts

| Contract | Purpose | Status |
|----------|---------|--------|
| `InquisitiveVault` | 66-asset portfolio | Live |
| `INQAI` | ERC-20 token | Live |
| `LiquidityLauncher` | $10K auto-launch presale | Deploy |
| `FeeDistributor` | 60/20/20 fee split | Deploy |
| `INQAIStaking` | Staking rewards | Deploy |
| `ReferralTracker` | 5%+5% referral bonuses | Deploy |
| `INQAIGovernance` | DAO voting | Deploy |
| `INQAIEmergencyBreak` | Circuit breaker | Deploy |
| `INQAIInsurance` | Loss protection | Deploy |
| `INQAITimelock` | 2-of-3 + 48h delay | Deploy |
| `INQAIAirdrop` | Vesting distribution | Deploy |

---

## Deployment

**Zero private keys required.**

### MetaMask + Hardhat
1. `npx hardhat node --fork https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY`
2. Connect MetaMask to `http://127.0.0.1:8545`, Chain ID 31337
3. Switch to team wallet `0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746`
4. `npx hardhat run scripts/deploy.js --network localhost`
5. MetaMask prompts for each signature

### Post-Deploy
1. Approve 25K INQAI to LiquidityLauncher via Etherscan
2. Fund 5K INQAI to ReferralTracker
3. Update .env with new addresses (no private keys)
4. Register Chainlink Automation

---

## APIs

| Endpoint | Data |
|----------|------|
| `/api/inquisitiveAI/assets` | 66 assets + prices |
| `/api/inquisitiveAI/staking` | Staking stats |
| `/api/inquisitiveAI/referral` | Referral tracking |
| `/api/inquisitiveAI/fees` | Buyback/burn data |
| `/api/inquisitiveAI/proof-of-reserves` | Vault backing |

---

## Tokenomics

- **Total:** 100M INQAI (fixed, no mint)
- **Presale:** $8 → Target: $15
- **Ecosystem:** 35M (35%)
- **Team:** 20M (20%, 36mo vest)
- **Foundation:** 15M (15%)
- **Liquidity:** 15M (15%)
- **Community:** 10M (10%)
- **Reserve:** 5M (5%)

**Fee Split:** 60% buybacks → stakers, 20% burn, 20% treasury

---

## Security

- Zero private keys in code/env
- Chainlink Automation (no servers)
- 2-of-3 multi-sig timelock
- 15% drawdown circuit breaker
- Insurance fund
- DAO governance

---

## CEX Pipeline

```bash
node scripts/deploy.js --cex
```

Generates applications for Gate.io, MEXC, Bitget, Binance, Coinbase.

---

## Frontend Components

- `LiquidityLauncher` — Presale UI
- `StakingDashboard` — Stake INQAI
- `ReferralTracker` — Share & earn
- `ProofOfReserves` — Verify backing
- `BuybackBurnTracker` — Track burns
- `TokenomicsDashboard` — Supply viz
- `LandingHero` — Landing page

---

## Launch Sequence

1. Deploy contracts (MetaMask)
2. Approve 25K INQAI to launcher
3. Community deposits ETH to reach $10K
4. Auto-launch creates Uniswap pool
5. Activate staking + referrals
6. Apply to CEXs (Gate.io, MEXC)

---

**© 2026 INQUISITIVE**
