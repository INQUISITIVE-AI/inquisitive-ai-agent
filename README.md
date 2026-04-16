# INQUISITIVE AI (INQAI)

> On-chain AI fund on Ethereum Mainnet. Node.js off-chain brain + Chainlink Automation on-chain execution. 66 digital assets. No premine, no KYC, self-custody.

[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![node](https://img.shields.io/badge/node-20.x-brightgreen)](https://nodejs.org)
[![chain](https://img.shields.io/badge/chain-ethereum%20mainnet-lightgrey)](https://etherscan.io)
[![vault](https://img.shields.io/badge/vault-v2-informational)](https://etherscan.io/address/0xb99dc519c4373e5017222bbd46f42a4e12a0ec25)

## What this actually is

INQUISITIVE is a two-sided system:

1. **Off-chain brain (this repo's Node.js server).** Fetches live prices and real OHLC candles, runs a five-engine scoring loop every 8 seconds, and emits actionable trade signals.
2. **On-chain execution (Ethereum Mainnet).** A Chainlink Automation upkeep periodically calls `InquisitiveVaultV2.performUpkeep`, which consumes queued signals and executes trades through the vault's own routers.

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Node.js server (Railway / Render)                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│  │ priceFeed    │ │ ohlcFeed     │ │ macroData            │  │
│  │ CoinGecko    │ │ Binance REST │ │ Alpha Vantage        │  │
│  │ 1 call / 30s │ │ + Coinbase   │ │ + CoinGecko global   │  │
│  └──────┬───────┘ └──────┬───────┘ └──────────┬───────────┘  │
│         └────────────────┼────────────────────┘              │
│                          ▼                                   │
│              ┌──────────────────────┐                        │
│              │ inquisitiveBrain.js  │ 5 engines, 8s loop     │
│              │ Pattern/Reason/…     │                        │
│              └──────────┬───────────┘                        │
│                         ▼                                    │
│              ┌──────────────────────┐                        │
│              │ tradingEngine.js     │ ethers v6, NonceManager│
│              └──────────┬───────────┘                        │
└─────────────────────────┼────────────────────────────────────┘
                          │ submitSignal(bytes)  (operator EOA)
                          ▼
        ┌──────────────────────────────────────┐
        │ InquisitiveVaultV2 (mainnet)         │
        │ 0xb99dc519c4373e5017222bbd46f42a4e12a0ec25 │
        └──────────────┬───────────────────────┘
                       │ performUpkeep(bytes)
                       ▼
        ┌──────────────────────────────────────┐
        │ Chainlink Automation (forwarder)     │
        │ time-gated by checkUpkeep()          │
        └──────────────────────────────────────┘
```

## Deployed contracts (Ethereum Mainnet)

| Contract | Address |
| --- | --- |
| InquisitiveVaultV2 (active) | `0xb99dc519c4373e5017222bbd46f42a4e12a0ec25` |
| INQAI token | `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5` |
| INQAIStaking | `0x46625868a36c11310fb988a69100e87519558e59` |
| FeeDistributor | `0x0d6aed33e80bc541904906d73ba4bfe18c730a09` |
| ReferralTracker | `0xa9a851b9659de281bfad8c5c81fe0b55aa23727a` |
| LiquidityLauncher | `0x617664c7dab0462c50780564f9554413c729830d` |
| INQAITimelock | `0x972b7f40d1837f0b8bf003d7147de7b9fcfc601e` |
| INQAIInsurance | `0xa0486fc0b9e4a282eca0435bae141be6982e502e` |

## Data sources (honest list)

- **Prices:** CoinGecko free tier is primary (1 batched `/coins/markets` call for all 66 assets every 30s). Binance public `/ticker/24hr` is the fallback. CoinMarketCap is tertiary if a key is set.
- **OHLC:** Binance REST `/klines` primary, Coinbase `/products/{id}/candles` fallback. Six intervals (1m–1d). Optional WebSocket stream behind `OHLC_STREAM=true`.
- **Macro:** Alpha Vantage (DXY, VIX, SPX), CoinGecko Global (BTC dominance), alternative.me (Fear & Greed).
- **Vault state:** direct JSON-RPC reads against `InquisitiveVaultV2`.

Nothing in this repo simulates market data. Nothing fabricates transaction hashes.

## 5 AI engines

| Engine | Input | What it scores |
| --- | --- | --- |
| Pattern | Real 15m/1h OHLC candles | Trend structure (SMA20/50), engulfing, wicks, volume confirm |
| Reasoning | 24h/7d change, macro, fear & greed | Narrative/sentiment bias |
| Portfolio | Target weights, ATH distance | Rebalance pressure |
| Learning | Momentum proxy | Adaptive confidence |
| Risk | Freshness, candle history | Blocking gate (pass/veto) |

Combined score (weighted): `BUY ≥ 0.72`, `SELL ≤ 0.30`, else `HOLD`. Risk gate can veto any BUY.

## Quick start

```bash
git clone https://github.com/INQUISITIVE-AI/inquisitive-ai-agent
cd inquisitive-ai-agent
cp .env.example .env
# fill in .env — see DEPLOYMENT_GUIDE.md §2
npm install
npm run compile
npm run server   # starts the Node backend at :3002
npm run dev      # starts the Next frontend at :3001
```

## Run tests

```bash
npm run test
npm run test:contracts   # foundry tests — requires forge
```

## Documentation

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — zero-to-running production deploy
- [CONTRIBUTING.md](CONTRIBUTING.md) — PR process, style, commit conventions
- [SECURITY.md](SECURITY.md) — responsible disclosure

## License

MIT. See [LICENSE](LICENSE).
