# INQUISITIVE AI (INQAI)

**The First Open, On-Chain AI Fund.**

Wall Street has had algorithmic trading since the 1980s. Crypto gave everyone access to the market — but not to the tools. INQUISITIVE closes that gap: a five-engine AI brain running 24/7, managing a diversified portfolio of 66 assets across 11 strategies, fully on-chain and fully transparent.

No hedge fund fees. No black box. Every signal, every weight, every decision — verifiable on-chain.

🌐 **Live platform:** [getinqai.com](https://getinqai.com)  
🪙 **Token:** `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5`

---

## What INQUISITIVE Does

| Feature | Details |
|---|---|
| **Portfolio** | 66 assets across 11 categories (Major, DeFi, L2, AI, RWA, Privacy, Stablecoin…) |
| **AI Engines** | Pattern · Reasoning · Portfolio · Risk · Learning |
| **Execution** | 11 strategies: BUY, SELL, STAKE, LEND, YIELD, BORROW, LOOP, MULTIPLY, EARN, REWARDS, SWAP |
| **Fees** | 15% performance-only. Zero AUM. Zero entry/exit. |
| **Tokenomics** | 100M fixed supply. 60% of fees → buybacks. 20% → permanent burn. |
| **Transparency** | Every signal published on-chain via Chainlink Automation |

---

## Deployed Contracts (Ethereum Mainnet)

| Contract | Address | Role |
|---|---|---|
| **INQAIToken** | `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5` | ERC-20, 100M fixed supply |
| **InquisitiveVaultV2** | `0xb99dc519c4373e5017222bbd46f42a4e12a0ec25` | Active vault — signal-based, UUPS upgradeable |
| **INQAIStaking** | `0x46625868a36c11310fb988a69100e87519558e59` | Token staking + yield distribution |
| **FeeDistributor** | `0x0d6aed33e80bc541904906d73ba4bfe18c730a09` | Fee collection, buyback, burn |
| **ReferralTracker** | `0xa9a851b9659de281bfad8c5c81fe0b55aa23727a` | Referral rewards |
| **LiquidityLauncher** | `0x617664c7dab0462c50780564f9554413c729830d` | Presale + DEX liquidity provisioning |
| **INQAITimelock** | `0x972b7f40d1837f0b8bf003d7147de7b9fcfc601e` | 2-day governance delay |
| **INQAIInsurance** | `0xa0486fc0b9e4a282eca0435bae141be6982e502e` | Protocol insurance reserve |
| **AIStrategyManager** | `0x8431173FA9594B43E226D907E26EF68cD6B6542D` | Strategy coordination |
| **InquisitiveStrategy** | `0xa2589adA4D647a9977e8e46Db5849883F2e66B3e` | Trading strategy execution |
| **InquisitiveProfitMaximizer** | `0x23a033c08e3562786068cB163967626234A45E37` | Yield optimization |
| **InquisitiveVault (legacy)** | `0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb` | Legacy — funds migrated Apr 14 2026 |

All contracts verified on [Etherscan](https://etherscan.io).

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js Frontend (Vercel)                              │
│  pages/ · src/components/ · styles/                     │
└───────────────────┬─────────────────────────────────────┘
                    │ REST API (Next.js API routes)
┌───────────────────▼─────────────────────────────────────┐
│  API Routes (pages/api/inquisitiveAI/)                  │
│  dashboard · assets · signals · token/sales             │
│  portfolio/nav · portfolio/positions · portfolio/treasury│
│  staking · fees · referral · proof-of-reserves          │
└────────┬───────────────────────────────────┬────────────┘
         │ CoinGecko / Fear & Greed           │ Ethereum RPC
┌────────▼───────────────────────────────────▼────────────┐
│  Ethereum Mainnet — 12 deployed contracts               │
│  INQAIToken · InquisitiveVaultV2 · INQAIStaking         │
│  FeeDistributor · ReferralTracker · LiquidityLauncher   │
│  INQAITimelock · INQAIInsurance · AIStrategyManager     │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| npm | 10+ |
| Foundry | latest (for contract tests) |

### Local Setup

```bash
# 1. Clone
git clone https://github.com/INQUISITIVE-AI/inquisitive-ai-agent
cd inquisitive-ai-agent

# 2. Install
npm install --legacy-peer-deps

# 3. Configure environment
cp .env.example .env
# Fill in your API keys and RPC URL (see Environment Variables below)

# 4. Run frontend
npm run dev          # http://localhost:3000
```

### Environment Variables

The minimum required to get real data:

| Variable | Where to get it |
|---|---|
| `MAINNET_RPC_URL` | [Infura](https://infura.io) or [Alchemy](https://alchemy.com) — free tier works |
| `COINGECKO_API_KEY` | [coingecko.com/en/api](https://www.coingecko.com/en/api/pricing) — free Demo key |
| `ETHERSCAN_API_KEY` | [etherscan.io/apis](https://etherscan.io/apis) — free |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | [cloud.walletconnect.com](https://cloud.walletconnect.com) — free |

All contract addresses are pre-filled with defaults in the code. You do NOT need to deploy anything.

### Docker (optional)

```bash
docker build -t inqai-backend .
docker compose up -d
docker compose logs -f backend
```

---

## AI Brain — 5 Engines

| Engine | Role |
|---|---|
| **Pattern Engine** | Cryptoteacher + NakedForexNow trend-following methodology |
| **Reasoning Engine** | Fundamental & narrative scoring |
| **Portfolio Engine** | Weight-based allocation optimization |
| **Risk Engine** | Drawdown, portfolio heat, regime gate |
| **Learning Engine** | Momentum & signal confidence adjustment |

**Target:** 70–90% win rate via strict trend alignment and pullback entries only.

**Execution threshold:** All 5 engines must reach 70% consensus before any action is taken.

---

## Token Distribution

| Allocation | % | Amount | Vesting |
|---|---|---|---|
| Ecosystem Growth | 35% | 35M | 36-month linear |
| Team & Advisors | 20% | 20M | 3-month cliff · 36-month linear |
| Foundation | 15% | 15M | 36-month linear |
| Liquidity | 15% | 15M | Locked — DEX provisioning |
| Community | 10% | 10M | 36-month linear |
| Strategic Reserve | 5% | 5M | 36-month linear |

Presale price: **$8/INQAI** · Target: **$15/INQAI** · All vesting enforced on-chain.

---

## Security

- `performUpkeep()` restricted to Chainlink Registry, Gelato Relay, AI oracle, and owner
- Emergency `pause()` / `emergencyWithdraw()` on both vault contracts
- WebSocket auth via `?apiKey=` parameter
- CORS restricted to `getinqai.com`
- Tiered rate limiting: 500 / 60 / 20 req per 15 min
- No private keys in codebase — all execution is keyless via Chainlink Automation
- 2-day governance timelock on all parameter changes

Vulnerabilities: open a GitHub issue marked `[SECURITY]`.  
Community audit interest: [Code4rena](https://code4rena.com) / [Sherlock](https://sherlock.xyz) — we are open to contest-based audits.

---

## Run Tests

```bash
# Smart contract tests (Foundry)
forge test -vv

# Frontend linting
npm run lint

# Type check
npm run build
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues are labeled.  
See [ROADMAP.md](ROADMAP.md) for what's being built next.

**Ways to help without code:**
- Test the platform and file issues
- Peer review Solidity contracts (see `contracts/`)
- Translate documentation
- Spread the mission: AI democratization is worth fighting for

---

## Free Infrastructure

| Service | Purpose |
|---|---|
| Vercel | Frontend hosting + API routes |
| GitHub Actions | CI/CD — lint, Foundry tests, Slither |
| CoinGecko API | Live price feeds (66 assets) |
| eth.llamarpc.com | Fallback public Ethereum RPC |
| Chainlink | Automation + price oracles |

---

## License

MIT — see [LICENSE](LICENSE).
