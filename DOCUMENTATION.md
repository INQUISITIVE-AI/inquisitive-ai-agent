# INQUISITIVE

> AI-Managed Asset-Backed Token — 100M Fixed Supply, 66 Assets, Fully Autonomous

---

## Deployed Contracts — All Live on Ethereum Mainnet

| Contract | Address | Purpose |
|----------|---------|---------|
| `INQAI Token` | `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5` | ERC-20 token |
| `InquisitiveVault` | `0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb` | 66-asset AI portfolio |
| `InquisitiveStrategy` | `0xa2589adA4D647a9977e8e46Db5849883F2e66B3e` | Strategy logic |
| `AIStrategyManager` | `0x8431173FA9594B43E226D907E26EF68cD6B6542D` | Strategy orchestration |
| `InquisitiveProfitMaximizer` | `0x23a033c08e3562786068cB163967626234A45E37` | Profit optimization |
| `INQAIStaking` | `0x46625868a36c11310fb988a69100e87519558e59` | Staking rewards |
| `FeeDistributor` | `0x0d6aed33e80bc541904906d73ba4bfe18c730a09` | 60/20/15/5 fee split |
| `ReferralTracker` | `0xa9a851b9659de281bfad8c5c81fe0b55aa23727a` | 5%+5% referral bonuses |
| `LiquidityLauncher` | `0x617664c7dab0462c50780564f9554413c729830d` | $10K auto-launch presale |
| `INQAITimelock` | `0x972b7f40d1837f0b8bf003d7147de7b9fcfc601e` | 2-day delay on critical ops |
| `INQAIInsurance` | `0xa0486fc0b9e4a282eca0435bae141be6982e502e` | Protocol insurance fund |
| Team Wallet | `0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746` | Owner / deployer |

---

## Platform APIs

| Endpoint | Data |
|----------|------|
| `/api/inquisitiveAI/assets` | 66 assets + live prices + AI signals |
| `/api/inquisitiveAI/dashboard` | Portfolio NAV, performance, risk regime |
| `/api/inquisitiveAI/staking` | Staking stats and APY |
| `/api/inquisitiveAI/referral` | Referral tracking |
| `/api/inquisitiveAI/fees` | Buyback/burn data |
| `/api/inquisitiveAI/proof-of-reserves` | Vault backing verification |
| `/api/inquisitiveAI/execute/auto` | Automated AI execution cycle |
| `/api/inquisitiveAI/execute/queue` | Pending execution queue |
| `/api/inquisitiveAI/execute/monitor` | Live execution monitor |
| `/api/health` | System health check |

---

## Tokenomics

- **Total Supply:** 100,000,000 INQAI (fixed, no mint function)
- **Presale Price:** $8 per INQAI — Target: $15
- **Ecosystem:** 35M (35%)
- **Team:** 20M (20%)
- **Foundation:** 15M (15%)
- **Liquidity:** 15M (15%)
- **Community:** 10M (10%)
- **Reserve:** 5M (5%)

**Fee Split:** 60% buybacks → stakers · 20% permanent burn · 15% treasury · 5% Chainlink Automation

---

## AI Architecture — 5 Engines

| Engine | Role |
|--------|------|
| **The Brain** | 5-engine consensus scoring — minimum 70% agreement to execute |
| **The Executioner** | 11 trading functions: BUY, SELL, SWAP, LEND, YIELD, BORROW, LOOP, STAKE, MULTIPLY, EARN, REWARDS |
| **The X-Ray** | Real-time P&L, risk metrics, drawdown tracking, AI decision transparency |
| **The Guardian** | 48h timelocks, 15% drawdown circuit breaker, AI safety checks |
| **The Oracle** | CoinGecko (primary, 30s polling) + CryptoCompare (fallback) + Alternative.me Fear & Greed |

---

## Portfolio — 66 Assets

32 ETH-mainnet ERC-20s traded via Uniswap V3 on-chain. 34 cross-chain assets managed via deBridge DLN. Categories: major, DeFi, AI, L2, stablecoin, RWA, liquid-stake, interop, privacy, payment, storage, oracle, gaming, IoT, data.

---

## Security

- Zero private keys in code or environment variables
- Chainlink Automation for fully decentralized AI execution (no servers required)
- INQAITimelock — 2-day delay on all critical protocol operations
- 15% drawdown circuit breaker via INQAIEmergencyBreak logic in Vault
- INQAIInsurance fund for black swan event protection
- Non-custodial: INQAI tokens delivered directly to self-custody wallet

---

## Frontend Pages

| Page | Path | Description |
|------|------|-------------|
| Home | `/` | Landing page, live stats, architecture overview |
| Portfolio | `/analytics` | Real-time AI portfolio dashboard |
| Token | `/token` | INQAI token details, tokenomics, asset list |
| Buy | `/token` | Purchase INQAI (ETH, BTC, SOL, TRX, USDC) |
| Staking | `/staking` | Stake INQAI, earn protocol fees |
| Referral | `/referral` | Referral tracking and bonus claims |
| Reserves | `/proof-of-reserves` | On-chain vault backing verification |
| Burns | `/burns` | Buyback and burn tracker |
| Docs | `/help` | Full documentation and FAQ |
| Terms | `/terms` | Terms of Service |
| Privacy | `/privacy` | Privacy Policy |

---

## Post-Deployment Checklist

- [x] All 11 contracts deployed and verified on Etherscan
- [x] Staking ↔ FeeDistributor wired
- [x] ReferralTracker ↔ LiquidityLauncher wired
- [x] Frontend `.env` updated with all contract addresses
- [ ] Fund FeeDistributor with 0.1+ ETH for buybacks
- [ ] Fund Vault with 0.5+ ETH for AI trade execution
- [ ] Register Chainlink Automation at automation.chain.link (target: FeeDistributor, function: distributeFees(), gas: 500K, fund: 50+ LINK)
- [ ] Configure staking reward rate (100 basis points = 1% per epoch recommended)
- [ ] Approve 25K INQAI to LiquidityLauncher for presale pool
- [ ] Apply to CEXs: Gate.io, MEXC, Bitget

---

## CEX Exchange Applications

```bash
node scripts/deploy.js --cex
```

Generates applications for Gate.io, MEXC, Bitget, Binance, and Coinbase.

---

**© 2026 INQUISITIVE · INQAI: `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5`**
