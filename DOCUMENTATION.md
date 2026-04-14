# INQUISITIVE

> AI-Managed Asset-Backed Token — 100M Fixed Supply, Signal-Based Trading, Fully Autonomous

---

## Deployed Contracts — All Live on Ethereum Mainnet

| Contract | Address | Purpose |
|----------|---------|---------|
| `INQAI Token` | `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5` | ERC-20 token |
| `InquisitiveVaultV2` | *(deploy via `script/Deploy.s.sol`)* | Signal-based AI vault (UUPS upgradeable) |
| `INQAIStaking` | `0x46625868a36c11310fb988a69100e87519558e59` | Staking rewards |
| `FeeDistributor` | `0x0d6aed33e80bc541904906d73ba4bfe18c730a09` | 60/20/15/5 fee split |
| `ReferralTracker` | `0xa9a851b9659de281bfad8c5c81fe0b55aa23727a` | 5%+5% referral bonuses |
| `LiquidityLauncher` | `0x617664c7dab0462c50780564f9554413c729830d` | $10K auto-launch presale |
| `INQAITimelock` | `0x972b7f40d1837f0b8bf003d7147de7b9fcfc601e` | 2-day delay on critical ops |
| `INQAIInsurance` | `0xa0486fc0b9e4a282eca0435bae141be6982e502e` | Protocol insurance fund |
| Team Wallet | `0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746` | Owner / deployer |

> **Old vault** `0x721B0c1fcf28646D6e0f608A15495F7227cB6CFb` — retired. Funds migrated to VaultV2 on deploy.

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

## Vault V2 — Signal-Based Trading

**How it works:**
1. **The Brain** scores each asset using 5 engines (pattern, reasoning, regime, liquidity, sentiment)
2. Assets scoring above threshold emit `BUY` signal; below threshold emit `SELL`
3. AI oracle submits signals on-chain via `submitSignal(asset, signal)` or `submitSignalsBatch()`
4. **Chainlink Automation** calls `performUpkeep()` — executes the trade via Uniswap V3
5. Only assets with active signals are traded — no bulk rebalancing of all 66 at once

**Key difference from V1:** Old vault rebalanced all 66 assets every cycle. V2 only acts when the AI brain says BUY or SELL on a specific asset.

**Upgradeability:** UUPS proxy pattern — if bugs are found, owner calls `upgradeTo(newImpl)`.

## Portfolio — ETH-Mainnet ERC-20s (Uniswap V3)

20 tracked assets on launch. Add more via `addTrackedAsset(address)`. Categories: major, DeFi, AI, L2, stablecoin, liquid-stake, meme.

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

## Deployment — Single Script

```bash
# Deploy VaultV2 + migrate funds from old vault (uses hardware wallet, no private key)
export MAINNET_RPC_URL=https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868
forge script script/Deploy.s.sol --rpc-url $MAINNET_RPC_URL --trezor --broadcast

# Or via MetaMask using the deploy UI
open http://localhost:3333/deploy.html
```

## Post-Deployment Checklist

- [x] INQAI Token deployed
- [x] Staking, FeeDistributor, ReferralTracker, LiquidityLauncher deployed & wired
- [ ] Deploy VaultV2 via `script/Deploy.s.sol` (ETH migrates automatically)
- [ ] Update `deployment-info.json` with new VaultV2 proxy address
- [ ] Update Chainlink Automation target to VaultV2 proxy address
- [ ] Update frontend `.env`: `NEXT_PUBLIC_VAULT_V2=<proxy_address>`
- [ ] Set AI oracle to the signals API wallet: `vault.setAIOracle(<oracle_address>)`

---

## CEX Exchange Applications

```bash
node scripts/deploy.js --cex
```

Generates applications for Gate.io, MEXC, Bitget, Binance, and Coinbase.

---

**© 2026 INQUISITIVE · INQAI: `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5`**
