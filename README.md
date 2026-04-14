# INQUISITIVE AI (INQAI)

> **Institutional-grade AI portfolio management should not be a privilege — it should be a public right.**
> INQUISITIVE is the first open, on-chain AI fund that manages a 66-asset crypto portfolio autonomously, transparently, and without gatekeepers.

**Live platform:** [getinqai.com](https://getinqai.com) · **Token:** `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5`

---

## Why INQUISITIVE Exists

Wall Street has had algorithmic trading since the 1980s. Crypto gave everyone access to the market — but not to the tools. INQAI closes that gap: a 5-engine AI brain running 24/7, managing a diversified portfolio of 66 assets across 11 strategies, fully on-chain and fully transparent.

No hedge fund fees. No black box. Every signal, every weight, every decision — verifiable on-chain.

---

## Token Distribution (Transparent)

**Total Supply: 100,000,000 INQAI — Fixed. No inflation. No minting.**

| Allocation | % | Amount | Vesting |
|---|---|---|---|
| Ecosystem Growth | 35% | 35M | 36-month linear |
| Team & Advisors | 20% | 20M | 3-month cliff · 36-month linear |
| Foundation | 15% | 15M | 36-month linear |
| Liquidity | 15% | 15M | Locked — DEX provisioning |
| Community | 10% | 10M | 36-month linear |
| Strategic Reserve | 5% | 5M | 36-month linear |

> No premine for insiders. No hidden allocations. No surprise unlocks.
> Presale price: **$8/INQAI** · Target: **$15/INQAI** · All vesting enforced on-chain.

---

## Current Status

| Component | Status |
|---|---|
| AI Brain (5 engines, 66 assets) | ✅ Live |
| Platform frontend (getinqai.com) | ✅ Live |
| INQAI Token (ERC-20) | ✅ Deployed · `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5` |
| InquisitiveVaultV2 (active vault) | ✅ Deployed · `0xb99dc519c4373e5017222bbd46f42a4e12a0ec25` |
| INQAIStaking | ✅ Deployed · `0x46625868a36c11310fb988a69100e87519558e59` |
| FeeDistributor | ✅ Deployed · `0x0d6aed33e80bc541904906d73ba4bfe18c730a09` |
| ReferralTracker | ✅ Deployed · `0xa9a851b9659de281bfad8c5c81fe0b55aa23727a` |
| LiquidityLauncher | ✅ Deployed · `0x617664c7dab0462c50780564f9554413c729830d` |
| INQAITimelock | ✅ Deployed · `0x972b7f40d1837f0b8bf003d7147de7b9fcfc601e` |
| INQAIInsurance | ✅ Deployed · `0xa0486fc0b9e4a282eca0435bae141be6982e502e` |
| Contract wiring (3 TXs) | ✅ Complete |
| Fund migration (legacy → VaultV2) | ✅ Complete |
| Chainlink Automation | ⏳ Registration pending — [automation.chain.link](https://automation.chain.link) |
| DEX Liquidity + CEX listings | ⏳ Pending Chainlink Automation go-live |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js Frontend (Vercel)                                      │
│  pages/ · components/ · styles/                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST + WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│  Express + WebSocket Backend  (server/)                         │
│  priceFeed · macroData · inquisitiveBrain · tradingEngine       │
└────────┬──────────────────────────────────────────┬────────────┘
         │ CoinGecko / Yahoo Finance                │ Ethereum RPC
┌────────▼──────────────────────────────────────────▼────────────┐
│  Smart Contracts (Ethereum Mainnet) — 12 deployed              │
│  INQAIToken · InquisitiveVaultV2 (active) · AIStrategyManager  │
│  INQAIStaking · FeeDistributor · ReferralTracker               │
│  LiquidityLauncher · INQAITimelock · INQAIInsurance            │
└────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| npm | 10+ |
| Foundry | latest |
| Docker | 24+ (optional) |

---

## Local Setup

```bash
# 1. Clone
git clone https://github.com/INQUISITIVE-AI/inquisitive-ai-agent
cd inquisitive-ai-agent

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in all YOUR_*_HERE placeholders in .env

# 4. Run the Next.js frontend
npm run dev          # http://localhost:3000

# 5. Run the Express backend (separate terminal)
node server/index.js # http://localhost:3002
```

---

## Docker (Backend)

```bash
# Build image
docker build -t inqai-backend .

# Run with env file
docker compose up -d

# View logs
docker compose logs -f backend
```

---

## Smart Contracts

**Deployed:** Ethereum Mainnet — 12 contracts, fully wired

| Contract | Address | Role |
|----------|---------|------|
| `INQAIToken` | `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5` | ERC-20 token (100M fixed supply) |
| `InquisitiveVaultV2` | `0xb99dc519c4373e5017222bbd46f42a4e12a0ec25` | **Active vault** — signal-based, UUPS upgradeable |
| `INQAIStaking` | `0x46625868a36c11310fb988a69100e87519558e59` | Token staking rewards |
| `FeeDistributor` | `0x0d6aed33e80bc541904906d73ba4bfe18c730a09` | Fee collection and buyback distribution |
| `ReferralTracker` | `0xa9a851b9659de281bfad8c5c81fe0b55aa23727a` | Referral bonus tracking |
| `LiquidityLauncher` | `0x617664c7dab0462c50780564f9554413c729830d` | Presale and liquidity provisioning |
| `INQAITimelock` | `0x972b7f40d1837f0b8bf003d7147de7b9fcfc601e` | 2-day governance delay |
| `INQAIInsurance` | `0xa0486fc0b9e4a282eca0435bae141be6982e502e` | Protocol insurance reserve |
| `AIStrategyManager` | `0x8431173FA9594B43E226D907E26EF68cD6B6542D` | Strategy coordination layer |
| `InquisitiveStrategy` | `0xa2589adA4D647a9977e8e46Db5849883F2e66B3e` | Trading strategy execution |
| `InquisitiveProfitMaximizer` | `0x23a033c08e3562786068cB163967626234A45E37` | Yield optimization |
| `InquisitiveVault` *(legacy)* | `0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb` | Legacy vault — funds migrated out Apr 14 2026 |

### Run Tests

```bash
forge test -vv
```

---

## Environment Variables

See `.env.example` for the full list. Required in production:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `WS_API_KEY` | WebSocket auth key — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `COINGECKO_API_KEY` | CoinGecko Demo API key |
| `MAINNET_RPC_URL` | Ethereum mainnet RPC (Infura/Alchemy) |
| `NEXT_PUBLIC_VAULT_ADDRESS` | Deployed vault proxy address |
| `NEXT_PUBLIC_INQAI_TOKEN_ADDRESS` | INQAI token address |

---

## AI Brain — 5 Engines

| Engine | Role |
|--------|------|
| **Pattern Engine** | Cryptoteacher + NakedForexNow trend-following methodology |
| **Reasoning Engine** | Fundamental & narrative scoring |
| **Portfolio Engine** | Weight-based allocation optimization |
| **Risk Engine** | Drawdown, portfolio heat, regime gate |
| **Learning Engine** | Momentum & signal confidence adjustment |

Target: **70–90% win rate** via strict trend alignment and pullback entries only.

---

## Security

- `performUpkeep()` restricted to Chainlink Registry, Gelato Relay, AI oracle, and owner
- Emergency `pause()` / `emergencyWithdraw()` on both vault contracts
- WebSocket authentication via `?apiKey=` parameter
- CORS restricted to `getinqai.com`
- JSON body limit: 100kb
- Tiered rate limiting: 500 / 60 / 20 req per 15 min by endpoint class
- No private keys in codebase — all execution is keyless via Chainlink Automation

**Report vulnerabilities** by opening a GitHub issue marked `[SECURITY]`.

Interested in a community audit? See [Code4rena](https://code4rena.com) and [Sherlock](https://www.sherlock.xyz) — we are open to contest-based audits. Bug bounty details coming via Immunefi.

---

## Community & Get Involved

INQUISITIVE is built in public. We believe open development compounds faster than closed development.

- **[ROADMAP.md](ROADMAP.md)** — Where we're going and what needs building
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — How to jump in (good first issues labeled)
- **GitHub Issues** — Feature requests, bug reports, contract proposals
- **Weekly dev updates** — Follow commits for progress (we show up every week)

### Free Infrastructure Used

| Service | Purpose |
|---|---|
| Vercel | Frontend hosting + edge functions |
| GitHub Actions | CI/CD — lint, audit, Foundry tests, Slither |
| CoinGecko API | Live price feeds (66 assets) |
| Chainlink | Automation + price oracles (planned) |

### Ways to Contribute Without Code

- Test the platform and file issues
- Peer review the Solidity contracts (see `contracts/`)
- Translate documentation
- Spread the mission: AI democratization is worth fighting for

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).
