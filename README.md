# INQUISITIVE AI (INQAI)

> The World's Most Advanced AI Crypto Trading Agent — 66 assets, 5 AI engines, zero private keys.

**Live platform:** [getinqai.com](https://getinqai.com)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js Frontend (Vercel / Netlify)                            │
│  pages/ · components/ · styles/                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST + WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│  Express + WebSocket Backend  (server/)                         │
│  priceFeed · macroData · inquisitiveBrain · tradingEngine       │
└────────┬──────────────────────────────────────────┬────────────┘
         │ CoinGecko / Yahoo Finance                │ Ethereum RPC
┌────────▼──────────────────────────────────────────▼────────────┐
│  Smart Contracts (Ethereum Mainnet)                             │
│  InquisitiveVaultV2 (UUPS proxy) · INQAIToken · FeeDistributor │
│  Chainlink Automation → performUpkeep()                        │
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

**Deployed:** Ethereum Mainnet

| Contract | Role |
|----------|------|
| `InquisitiveVaultV2` | Signal-based AI trading vault (UUPS upgradeable) |
| `InquisitiveVaultUpdated` | Legacy bulk-rebalance vault |
| `INQAIToken` | ERC-20 governance/utility token |
| `FeeDistributor` | 15% performance fee collection |
| `INQAIStaking` | Token staking + rewards |
| `INQAIAirdrop` | Community airdrop distribution |

### Deploy Vault V2

```bash
# Via Foundry (requires Trezor or hardware wallet)
forge script script/Deploy.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --trezor \
  --broadcast

# Or via MetaMask UI
open inqai-deployer/deploy.html
```

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

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).
