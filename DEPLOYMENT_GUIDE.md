# GetInQ AI — Deployment Guide

This guide takes you from zero to a running production deployment. Follow in order.

## 0. Prerequisites

| Tool | Version | Install |
| --- | --- | --- |
| Node.js | 20.x LTS | https://nodejs.org |
| npm | >= 10.2 | ships with Node 20 |
| git | any | https://git-scm.com |

Accounts (all have free tiers):

- **Alchemy** — https://dashboard.alchemy.com
- **Reown Cloud** — https://cloud.reown.com (WalletConnect)
- **CoinGecko** — https://www.coingecko.com/en/api
- **Alpha Vantage** — https://www.alphavantage.co/support/#api-key
- **Etherscan** — https://etherscan.io/apis
- **Chainlink Automation** — https://automation.chain.link (wallet sign-in)
- **Railway or Render** — backend hosting
- **Vercel** — frontend hosting
- **Cloudflare** — DNS + TLS + DDoS

## 1. Clone and install

```bash
git clone https://github.com/INQUISITIVE-AI/inquisitive-ai-agent.git
cd inquisitive-ai-agent
cp .env.example .env
npm install
npm run compile
```

`npm install` must finish with zero `ERESOLVE` errors. If it fails, verify `.npmrc` is present and `package.json` includes the `overrides` block.

## 2. Fill in `.env`

Required to boot:
- `MAINNET_RPC_URL` — your Alchemy URL (host must be `eth-mainnet.g.alchemy.com`)
- `OPERATOR_PRIVATE_KEY` — 64-hex key for the operator EOA (see §5)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — Reown Cloud
- `ALPHA_VANTAGE_API_KEY` — Alpha Vantage
- `WS_API_KEY` — `openssl rand -hex 32`
- `RATE_LIMIT_SALT` — `openssl rand -hex 32`
- `CORS_ORIGINS` — comma-separated prod origins

Deployed contract addresses are pre-filled from `deployment-info.json`.

## 3. Wire the vault

Already done on mainnet. On testnet or a re-deploy:

```bash
npm run setup:vault
```

That script calls `setPortfolio`, `setPhase2Registry`, `setAutomationEnabled(true)`, and runs `verify-state.js`.

## 4. Register Chainlink Automation

1. Visit https://automation.chain.link — connect the vault owner wallet.
2. Register new Upkeep → Custom logic.
3. Target: `0xb99dc519c4373e5017222bbd46f42a4e12a0ec25` — Gas limit `2500000` — Starting LINK `10` — Check data `0x`.
4. Paste returned upkeep ID into `.env` as `CHAINLINK_UPKEEP_ID`.
5. Authorize the forwarder:

```bash
npm run authorize:forwarder -- <forwarderAddressFromUpkeepPage>
```

## 5. Operator wallet

```bash
node -e "const {Wallet}=require('ethers');const w=Wallet.createRandom();console.log('addr:',w.address,'\nkey:',w.privateKey);"
```

- Paste key into `.env` → `OPERATOR_PRIVATE_KEY`
- Fund with ~0.25 ETH
- On the vault, call `grantRole(SIGNAL_KEEPER_ROLE, operatorAddress)` once.

## 6. Smoke test locally

```bash
npm run server &
sleep 5
curl -s http://localhost:3002/health | jq
```

Expect `{"ready": true, "stage": "ready", ...}`. If `ready:false`, look at `stage` — it tells you exactly what failed.

## 7. Backend deploy

### Railway
1. `railway init` — pick the repo
2. Shared Variables — paste env
3. Build: `npm run compile`  Start: `npm run server`
4. Health check path `/health`, interval 15s
5. Custom domain `api.getinqai.com`

### Render
1. New Web Service, Node 20
2. Build: `npm install && npm run compile`
3. Start: `npm run server`
4. Health check `/health`

## 8. Frontend deploy (Vercel)

```bash
vercel link
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_WS_URL production
vercel env add NEXT_PUBLIC_CHAIN_ID production
vercel env add NEXT_PUBLIC_VAULT_ADDRESS production
vercel env add NEXT_PUBLIC_INQAI_TOKEN production
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID production
vercel --prod
```

Custom domains in Vercel: `getinqai.com`, `www.getinqai.com`.

## 9. DNS + Cloudflare

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| CNAME | @ | cname.vercel-dns.com | orange |
| CNAME | www | cname.vercel-dns.com | orange |
| CNAME | api | <railway cname> | orange |

Settings: SSL/TLS Full (strict), Always Use HTTPS, Bot Fight Mode on, Rate limit 100 req/min on `/api/*`.

## 10. Monitoring

- Sentry — paste DSN into `SENTRY_DSN`
- Uptime Robot — monitor `https://api.getinqai.com/health` with keyword `"ready":true`
- Chainlink UI — enable email/Slack alerts for: underfunded, paused, reverted

## 11. Post-launch checklist

- [ ] `/health` returns `ready:true`
- [ ] `/api/signals` returns ~66 rows with `source: "coingecko"`
- [ ] `POST /api/trading/start` (with `Authorization: Bearer $WS_API_KEY`) returns `{ok:true}`
- [ ] `submitSignal` tx appears on Etherscan within 30s
- [ ] Chainlink upkeep page shows `performUpkeep` executions

## 12. Rollback

```bash
railway rollback
vercel rollback
curl -sX POST https://api.getinqai.com/api/trading/stop \
  -H "Authorization: Bearer $WS_API_KEY"
cast send 0xb99dc519c4373e5017222bbd46f42a4e12a0ec25 "pause()" --private-key $MULTISIG_KEY
```
