# INQUISITIVE AI — Public Roadmap

> This roadmap is public. Every item is a potential contribution. If you want to build something here, open an issue.

---

## Legend

| Badge | Meaning |
|---|---|
| ✅ Done | Shipped and live |
| 🔨 In Progress | Active development |
| ⏳ Planned | Scoped, not started |
| 💡 Idea | Community proposal, not committed |

---

## Phase 1 — Foundation ✅

**Status: Complete**

- ✅ 66-asset portfolio with live CoinGecko prices (30s polling)
- ✅ 5-engine AI brain — Pattern, Reasoning, Portfolio, Learning, Risk
- ✅ 11 trading signal types — BUY, SELL, SWAP, LEND, YIELD, BORROW, LOOP, STAKE, MULTIPLY, EARN, REWARDS
- ✅ Express backend with REST API (18 endpoints) + WebSocket broadcaster
- ✅ Next.js 14 frontend — homepage, analytics, docs, buy page, legal pages
- ✅ Macro data layer — Fear & Greed + BTC/ETH/SOL regime signals
- ✅ Security hardening — CORS, rate limiting, WebSocket auth, body size limits
- ✅ Emergency pause/unpause + emergencyWithdraw on vault contracts
- ✅ GitHub Actions CI/CD — lint, audit, Foundry tests, Slither
- ✅ Legal pages — Terms, Privacy, Risk Disclosure

---

## Phase 2 — Smart Contract Completion 🔨

**Status: In Progress (5/11 contracts deployed)**

### Deployed ✅
- ✅ INQAI Token — `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5`
- ✅ InquisitiveVault (legacy) — `0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb`
- ✅ AIStrategyManager — `0x8431173FA9594B43E226D907E26EF68cD6B6542D`
- ✅ InquisitiveStrategy — `0xa2589adA4D647a9977e8e46Db5849883F2e66B3e`
- ✅ InquisitiveProfitMaximizer — `0x23a033c08e3562786068cB163967626234A45E37`

### Pending Deployment ⏳
- ⏳ **InquisitiveVaultV2** — Signal-based AI vault (UUPS upgradeable). Contract code complete. Needs deployment + Chainlink Automation registration.
- ⏳ **FeeDistributor** — Collects 15% performance fees, routes 60% to buybacks, 20% to burn, 20% to treasury.
- ⏳ **INQAIStaking** — Token staking with protocol yield distribution.
- ⏳ **ReferralTracker** — On-chain referral bonus system.
- ⏳ **LiquidityLauncher** — Presale contract + DEX liquidity seeding.
- ⏳ **INQAITimelock** — 48-hour governance delay for critical operations.

### Security ⏳
- ⏳ Code4rena / Sherlock community audit contest
- ⏳ Immunefi bug bounty program setup
- ⏳ Certora formal verification of vault invariants

---

## Phase 3 — Live DeFi Execution ⏳

**Blocker: VaultV2 + Chainlink Automation must be deployed first.**

- ⏳ Register Chainlink Automation — fund upkeep with 50 LINK
- ⏳ Set portfolio weights for all 66 assets in VaultV2
- ⏳ Aave V3 lending integration (USDC, ETH, BTC positions)
- ⏳ Morpho Blue isolated market integration
- ⏳ Uniswap V3 LP management for ETH/USDC, ETH/USDT
- ⏳ Lido staking — ETH → stETH auto-rebalancing
- ⏳ Jito + Sanctum — SOL liquid staking
- ⏳ Jupiter Aggregator — Solana swap routing
- ⏳ 1inch / Uniswap V3 — Ethereum swap routing with MEV protection
- ⏳ On-chain P&L reconciliation per cycle

---

## Phase 4 — Token Ecosystem ⏳

**Partial: Token deployed. Ecosystem pending Phase 3.**

- ⏳ Uniswap V3 INQAI/USDC + INQAI/ETH pools (requires LiquidityLauncher)
- ⏳ Community staking launch (requires INQAIStaking)
- ⏳ Referral programme (requires ReferralTracker)
- ⏳ DEX listings — Uniswap, then Tier 2 CEX applications
- ⏳ Gitcoin Grants — apply for public goods funding round
- ⏳ Community Crowdfunding System (CCS) — multisig-based task funding
- ⏳ Open Collective setup for transparent community treasury

---

## Phase 5 — Advanced AI & Cross-Chain ⏳

- ⏳ On-chain execution via VaultV2 (live signals → real trades)
- ⏳ Cross-chain execution via deBridge DLN (13 assets)
- ⏳ Sentry integration — error monitoring
- ⏳ Uptime Robot — 50-monitor health checks
- ⏳ Cloudflare CDN + DDoS protection
- ⏳ Performance dashboard — live win rate, profit factor, Sharpe ratio
- 💡 AI model versioning — publish model weights / scoring changes as commits
- 💡 Community signal proposals — token holders vote on strategy parameters
- 💡 Mobile app — PWA with push notifications for high-confidence signals

---

## Open Issues for Community Contributors

Want to help? These are well-scoped tasks:

| Issue | Difficulty | Area |
|---|---|---|
| Add Uptime Robot health check endpoint | Easy | Backend |
| Integrate Sentry error tracking | Easy | Backend |
| Add Cloudflare Workers rate limiting | Medium | DevOps |
| Write integration tests for trading engine | Medium | Testing |
| Peer review `contracts/InquisitiveVaultV2.sol` | Medium | Security |
| Implement CCS multisig funding proposal template | Medium | Governance |
| Translate README/docs to Spanish, Chinese, Portuguese | Easy | Community |

> Open an issue to claim a task. Label it `help wanted` or `good first issue`.

---

## What We Won't Build

To keep scope honest:

- ❌ Centralized custody of user funds — ever
- ❌ Trading signals that require trusting our word (everything on-chain)
- ❌ Paid tiers that gate core functionality
- ❌ VC-controlled governance (community-first, always)
