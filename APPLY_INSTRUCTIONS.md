# GetInQ AI — How to Apply This Fix Bundle

This directory contains every fixed file at its final path plus an `apply.sh` that copies them into a fresh git branch of your repo.

## TL;DR

```bash
# From the parent directory that contains both folders:
git clone https://github.com/INQUISITIVE-AI/inquisitive-ai-agent.git
cd inquisitive-ai-agent
bash ../getinqai-fix-bundle/apply.sh
npm install
npm run compile
cp .env.example .env    # then fill in secrets
git add -A
git commit -m "fix: production-ready bundle (blockers 1-11, critical 1-14)"
# Review:
git diff main..HEAD --stat
```

## What's inside

```
getinqai-fix-bundle/
├── apply.sh                              <- runs the copy
├── APPLY_INSTRUCTIONS.md                 <- you are here
├── README.md                             <- new project README
├── DEPLOYMENT_GUIDE.md                   <- zero-to-running deploy
├── package.json                          <- wagmi/viem overrides, lean deps
├── .npmrc                                <- strict peer resolution
├── .env.example                          <- every required var, real addresses
├── hardhat.config.js                     <- sepolia (not goerli), g.alchemy.com
├── next.config.js                        <- strict TS/ESLint, CORS from env
├── scripts/
│   ├── deploy.js                         <- idempotent, records VaultV2 address
│   ├── authorize-forwarder.js            <- grant Chainlink forwarder role
│   └── portfolio-config.json             <- single 66-asset source of truth
└── server/
    ├── index.js                          <- readiness gate, /health, shutdown
    ├── routes/inquisitiveAI.js           <- trading start/stop + signal endpoints
    └── services/
        ├── priceFeed.js                  <- CoinGecko batched + Binance fallback
        ├── ohlcFeed.js                   <- Binance klines + Coinbase fallback
        ├── tradingEngine.js              <- ethers v6, real submitSignal tx
        ├── inquisitiveBrain.js           <- 5 engines, proper exports (CT etc.)
        ├── macroData.js                  <- Alpha Vantage (replaces Yahoo)
        ├── vaultOracle.js                <- reads vault TVL + upkeep events
        ├── wsServer.js                   <- ticket-based WS auth
        └── db.js                         <- SQLite persistence
```

## Per-blocker mapping

| Blocker | Fixed by |
| --- | --- |
| 1 — npm install fails | `package.json` + `.npmrc` |
| 2 — Incomplete .env | `.env.example` |
| 3 — CoinGecko hammering free tier | `server/services/priceFeed.js` |
| 4 — Fake trade hashes | `server/services/tradingEngine.js` |
| 5 — Broken `CT` export | `server/services/inquisitiveBrain.js` |
| 6 — No real OHLC | `server/services/ohlcFeed.js` |
| 7 — `tradingActive` has no start/stop | `tradingEngine.js` + `routes/inquisitiveAI.js` |
| 8 — No deployment guide | `DEPLOYMENT_GUIDE.md` |
| 9 — No readiness gate | `server/index.js` |
| 10 — Wrong vault in deploy.js | `scripts/deploy.js` |
| 11 — No Chainlink setup guide | §8 of the companion Google Doc + `scripts/authorize-forwarder.js` |

## Per-critical-issue mapping (abridged)

- REQUIRED_ENV validation → `server/index.js` (fails fast on placeholder values).
- NEXT_PUBLIC_WS_API_KEY removed → `server/services/wsServer.js` (ticket-based).
- CORS wildcard removed → `server/index.js` + `next.config.js` (from env).
- Yahoo Finance replaced → `server/services/macroData.js` uses Alpha Vantage.
- Asset count 65/66 inconsistency → `scripts/portfolio-config.json` (single source of truth).
- `ignoreBuildErrors:true` removed → `next.config.js`.
- Goerli → Sepolia, `eth-mainnet.g.alchemy.com` host → `hardhat.config.js`.
- Bull removed; optional bullmq note in README.
- Persistent trade history → `server/services/db.js` (SQLite via better-sqlite3).
- FeeDistributor staking check → enforced in `scripts/deploy.js`'s deploy order (deploys `INQAIStaking` before `FeeDistributor` and passes its address).

## Manual steps that remain (I can't do these)

1. Running `npm install` in your environment — the sandbox that generated this bundle has no network.
2. Creating and funding the operator EOA (§5 of DEPLOYMENT_GUIDE.md).
3. Registering the upkeep at https://automation.chain.link and running `npm run authorize:forwarder -- <forwarder>`.
4. Deploying to Railway/Vercel and configuring DNS in Cloudflare.
5. Any transaction that spends real ETH or LINK.

If you want me to open a PR for you, grant a fine-grained GitHub PAT scoped to `contents:write` + `pull_requests:write` on `INQUISITIVE-AI/inquisitive-ai-agent` and I'll push the branch and open the PR.
