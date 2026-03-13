# INQUISITIVE — AI-Managed Asset-Backed Token

> **INQAI represents proportional ownership in a professionally managed portfolio of 65 digital assets, continuously optimized by proprietary AI systems 24/7. Fixed supply of 100,000,000 tokens. Ticker: INQAI.**

---

## ⚡ Critical Reference

| Item | Value |
|------|-------|
| **INQAI Token Contract** | `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5` |
| **Team / Treasury Wallet** | `0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746` |
| **Vault Contract** | `0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52` |
| **BTC Payment Address** | `bc1q54tccqs2z3gp74pdatfnfucrzxuv2755fq6cfg` |
| **SOL Payment Address** | `7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk` |
| **TRX Payment Address** | `TDSkgbhuMAHChDw6kGCLJmM9v7PPMJgHJA` |
| **ETH / USDC payments** | Sent directly to vault via WalletConnect |
| **Presale Price** | $8 per INQAI |
| **Target Price** | $15 per INQAI |
| **Total Supply** | 100,000,000 INQAI (fixed) |

**No private keys exist in any code, repository, or environment file. Ever.**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![AI Engines](https://img.shields.io/badge/AI-5_Intelligence_Engines-purple)](https://inquisitive.ai)
[![APY Target](https://img.shields.io/badge/APY_Target-18.5%25-green)](https://inquisitive.ai)

INQUISITIVE is an ERC-20 token representing proportional ownership in a live, AI-managed portfolio of 65 digital assets across multiple blockchains. The AI executes autonomously — token holders simply hold INQAI. No buttons, no manual steps, no private keys anywhere in the system.

---

## 📋 **Table of Contents**

1. [What is INQUISITIVE?](#overview)
2. [65-Asset Portfolio](#portfolio)
3. [AI Architecture](#ai-architecture)
4. [Token Purchase](#token-purchase)
5. [Smart Contract](#smart-contract)
6. [Vault Deployment](#vault-deployment)
7. [Vault Activation](#vault-activation)
8. [Keeper Execution](#keeper-execution)
9. [Environment Setup](#environment-setup)
10. [API Reference](#api-reference)
11. [Running Locally](#running-locally)
12. [Security](#security)

---

## Overview

### What is INQUISITIVE?

INQUISITIVE (INQAI) is an ERC-20 token on Ethereum mainnet. Each token represents proportional ownership in a live, AI-managed portfolio of **65 digital assets** across multiple blockchains. The AI executes all portfolio management autonomously — token holders simply buy and hold INQAI. There are no buttons to press, no manual steps, no private keys in any code.

**Token contract**: `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5`

### How Token Holders Benefit

- **Presale price: $8** — 47% below the $15 target
- **Self-custody** — INQAI is airdropped directly to your wallet within 24 hours of purchase
- **Asset backing** — each INQAI represents proportional ownership in the 65-asset live portfolio
- **60% of protocol fees** → systematic open-market INQAI buybacks
- **20% of protocol fees** → permanently burned (deflationary)
- **20% of protocol fees** → treasury for protocol operations

### Risk Management

- 2% max portfolio risk per trade (hard limit)
- 6% max total portfolio heat across all open positions
- 15% drawdown circuit breaker — all trading halts automatically
- 2:1 minimum risk/reward ratio required before any trade
- 70% minimum AI confidence threshold (75% in BEAR regime)

---

## 65-Asset Portfolio

All 65 assets are live, priced from native CoinGecko feeds, and allocated autonomously. The AI manages execution across three delivery mechanisms — all running from a single `performUpkeep()` call with zero private keys.

### Execution Breakdown

| Mechanism | Count | Assets | How |
|-----------|-------|--------|-----|
| **Ethereum mainnet** | 27 | BTC(WBTC), ETH(stETH), USDC, AAVE, UNI, LDO, ARB, PAXG, INJ, ENA, POL, FET(ASI), RNDR, LINK, ONDO, GRT, SKY, DBR, STRK, QNT, ZRO, CHZ, ACH, SOIL, BRZ, JPYC, XSGD | Uniswap V3 ERC-20 swap |
| **Cross-chain bridges** | 13 | SOL, JUP, JITOSOL, JUPSOL, MNDE, HONEY, HNT, PYTH (Solana) · BNB (BSC) · AVAX (Avalanche) · OP (Optimism) · TRX (TRON) · FDUSD (BSC) | deBridge DLN on-chain contract |
| **stETH yield positions** | 25 | XRP, ADA, SUI, DOT, NEAR, ICP, HYPE, TAO, ATOM, ALGO, XLM, LTC, BCH, HBAR, ZEC, XMR, ETC, XTZ, VET, FIL, AR, XDC, CC, STX, EOS | Lido stETH yield + native price tracked |

**All 65 allocations are live and deployed. No simulation. All 65 assets priced at native CoinGecko rates — zero proxy.**

For stETH yield positions: the vault holds Lido stETH for these allocations, earning staking yield, while the AI tracks the native asset price for full NAV accounting. This is the correct institutional approach for assets on chains without automated bridge support.

### Portfolio Weights (% of total)

BTC 18% · ETH 12% · SOL 8% · BNB 5% · XRP 4% · ADA 3% · AVAX 3% · SUI 2% · DOT 2% · NEAR/ICP/TRX 1% each · AAVE/UNI 2% each · LDO/ARB/PAXG 1.5% each · HYPE/FET/RNDR/TAO/POL/LINK/INJ/JUP/ENA/OP 1% each · USDC 3% · (remaining 25 assets 0.1–0.5% each)

---

## AI Architecture

### 5 Intelligence Engines

- **Pattern Engine** — Reinforcement learning action-value scoring, BULL/BEAR/NEUTRAL regime detection, volume confirmation
- **Reasoning Engine** — Fundamental analysis, Fear & Greed sentiment, category premium, yield identification
- **Portfolio Engine** — Sharpe-optimized diversification, Kelly Criterion position sizing, correlation-aware allocation
- **Learning Engine** — 7-day momentum, liquidity quality, adaptive confidence thresholds
- **Risk Engine** — Risk-first gate: all 5 checks must pass before any execution

### 11 Trading Functions

`BUY` `SELL` `SWAP` `LEND` `YIELD` `BORROW` `LOOP` `STAKE` `MULTIPLY` `EARN` `REWARDS`

### System Architecture

```
The Brain       → 5-engine AI scoring, 8-second evaluation cycles, 65 assets
The Executioner → performUpkeep(): Uniswap V3 swaps + deBridge DLN bridges in one tx
The X-Ray       → Monitor API: live allocation plan, execution status, NAV per token
The Oracle      → CoinGecko primary, CryptoCompare fallback — 65 native prices, no proxy
```

### Execution Flow

1. **Hybrid keeper** calls `performUpkeep()` every 1–5 minutes:
   - cron-job.org pings `/api/inquisitiveAI/execute/auto` every 1 minute (primary)
   - GitHub Actions vault-keeper runs every 5 minutes as redundant backup
   - Vercel cron (`vercel.json`) fires every 5 minutes as tertiary backup
2. If `vaultBalance > minDeploy`, `performUpkeep()` executes on-chain
3. **ETH → 27 ERC-20s** via Uniswap V3 (one batch)
4. **ETH → 13 native assets** via deBridge DLN `createOrder()` (one batch, including TRX on TRON)
5. **Remaining ETH → stETH** via Lido for the 25 stETH yield positions
6. All prices, NAV, signals updated in real-time via CoinGecko
7. Chainlink Automation will be added as the project scales (register at automation.chain.link)

---

## Token Purchase

INQAI is available at the presale price of **$8 per token**. Tokens are delivered to your self-custody wallet within 24 hours of confirmed payment.

### Accepted Payment Methods

| Method | Address |
|--------|---------|
| **ETH** | Via WalletConnect — sent directly to vault |
| **USDC** | Via WalletConnect — ERC-20 transfer to vault |
| **BTC** | `bc1q54tccqs2z3gp74pdatfnfucrzxuv2755fq6cfg` |
| **SOL** | `7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk` |
| **TRX** | `TDSkgbhuMAHChDw6kGCLJmM9v7PPMJgHJA` |

Each BTC, SOL, and TRX payment is assigned a unique amount for automatic on-chain identification. Payment confirmation is detected automatically.

---

## Smart Contract

### Deployed Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| **INQAI ERC-20** | `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5` | Token — 100M fixed supply |
| **InquisitiveVault** | `0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52` | Asset vault — live, fully configured |
| **InquisitiveStrategy** | `0xa2589adA4D647a9977e8e46Db5849883F2e66B3e` | Strategy manager |
| **AIStrategyManager** | `0x8431173FA9594B43E226D907E26EF68cD6B6542D` | AI execution router |
| **deBridge DLN** | `0xeF4fB24aD0916217251F553c0596F8Edc630EB66` | Cross-chain bridge (external) |

### Vault Contract Capabilities (`contracts/InquisitiveVaultUpdated.sol`)

- `receive() payable` — accepts ETH
- `performUpkeep(bytes calldata)` — keeper entry point; executes all 27 Uniswap swaps + 13 deBridge bridges in one tx
- `checkUpkeep(bytes calldata)` → `(bool upkeepNeeded, bytes memory performData)`
- `setPortfolio(address[], uint256[], uint24[])` — configures 27 ETH-mainnet tokens (owner only)
- `setPhase2Registry(Phase2Asset[])` — configures 13 cross-chain bridge targets (owner only)
- `setAutomationEnabled(bool)` — enable/disable keeper automation (owner only)
- `setAIExecutor(address)` — set optional executor address (owner only)

---

## Vault Deployment

The full vault `InquisitiveVaultUpdated` is **live on mainnet** at `0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52`. Deployment is complete — no redeployment needed.

### Deployed & Configured

```
✅ Vault deployed:           0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52
✅ setPortfolio():           26 ETH-mainnet ERC-20s configured on-chain
✅ setPhase2Registry():      13 cross-chain deBridge DLN assets configured
✅ setAutomationEnabled():   true — vault will execute on every keeper call
✅ ETH funded:               vault has deployable ETH balance
✅ Hybrid keeper running:    cron-job.org (1 min) + GitHub Actions (5 min)
```

### Re-deploy (if ever needed)

```
1. Go to https://remix.ethereum.org
2. Upload contracts/InquisitiveVaultUpdated.sol
3. Compile with Solidity 0.8.19, optimizer enabled (200 runs)
4. Connect MetaMask (team wallet 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746)
5. Deploy InquisitiveVaultUpdated with constructor arg:
      _token = 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5
6. Copy the new vault address
7. Update INQUISITIVE_VAULT_ADDRESS in .env and Vercel env vars
8. Re-run: node scripts/activate.js (generates setPortfolio + setPhase2Registry calldata)
```

---

## Vault Activation

After deployment, configure the vault via Etherscan — no private key required (sign with MetaMask as vault owner).

```bash
# Generate all calldata and print step-by-step instructions:
node scripts/activate.js
```

This prints the exact arrays to paste into Etherscan Write Contract for:
1. `setPortfolio()` — 27 ETH-mainnet tokens
2. `setPhase2Registry()` — 13 cross-chain bridge targets
3. `setAutomationEnabled(true)`

**Etherscan Write Contract URL:**
`https://etherscan.io/address/<VAULT_ADDRESS>#writeContract`

Connect MetaMask (vault owner), call each function with the printed arrays.

---

## Keeper Execution

The vault keeper runs on a redundant hybrid schedule to ensure `performUpkeep()` is called automatically.

### Primary: cron-job.org (1-Minute Interval)

```
1. Go to https://cron-job.org
2. Create new cron job:
   URL:      https://getinqai.com/api/inquisitiveAI/execute/auto
   Schedule: Every 1 minute
   Method:   GET
3. Add header:  Authorization: Bearer <CRON_SECRET>
4. Save
```

### Backup: GitHub Actions (5-Minute Interval)

Configured in `.github/workflows/vault-keeper.yml`. Runs every 5 minutes as a redundant fallback.

### Chainlink Automation

```
1. Go to https://automation.chain.link
2. Register New Upkeep → Custom Logic
3. Contract address: 0xadcfff8770a162b63693aa84433ef8b93a35eb52
4. Gas limit: 5,000,000
5. Fund with LINK
```

---

## Environment Setup

```bash
MAINNET_RPC_URL=https://mainnet.infura.io/v3/<your-key>
COINGECKO_API_KEY=<optional>
ETHERSCAN_API_KEY=<for contract verification>

# Contract addresses
INQAI_TOKEN_ADDRESS=0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5
INQUISITIVE_VAULT_ADDRESS=0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52
DEPLOYER_ADDRESS=0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746

# Payment addresses (used by create-charge.ts and check-charge.ts)
PAYMENT_BTC_ADDRESS=bc1q54tccqs2z3gp74pdatfnfucrzxuv2755fq6cfg
PAYMENT_SOL_ADDRESS=7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk

# deBridge DLN destination wallets (used by activate.js for Phase 2 setPhase2Registry)
PORTFOLIO_WALLET_SOLANA=7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk
PORTFOLIO_WALLET_BSC=0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746
PORTFOLIO_WALLET_AVALANCHE=0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746
PORTFOLIO_WALLET_OPTIMISM=0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746
PORTFOLIO_WALLET_TRON=TDSkgbhuMAHChDw6kGCLJmM9v7PPMJgHJA
```

**Never add PRIVATE_KEY to .env.** For one-time vault deployment, use Remix IDE (MetaMask signs) or add/remove key only during the single deployment command.

---

## Running Locally

```bash
npm install
npm run dev     # Next.js frontend on :3000 + Express backend on :3002
```

Frontend pages: `/` · `/buy` · `/analytics` · `/dashboard` · `/token` · `/help`

---

## API Reference

All endpoints are Next.js API routes (`pages/api/`). No authentication required for read endpoints.

### AI & Portfolio Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inquisitiveAI/assets` | All 65 assets — live native prices, AI scores, portfolio weights |
| GET | `/api/inquisitiveAI/assets/[symbol]` | Single asset — price, AI confidence, signals |
| GET | `/api/inquisitiveAI/dashboard` | Portfolio dashboard — performance, AI decisions, risk |
| GET | `/api/inquisitiveAI/signals` | Current AI signals — actions, confidence, regime |
| GET | `/api/inquisitiveAI/prices` | Live prices for all 65 assets |
| GET | `/api/inquisitiveAI/macro` | Macro indicators — Fear & Greed, regime, BTC/ETH change |
| GET | `/api/inquisitiveAI/portfolio/nav` | Live NAV — per-token value, AUM, 65-asset returns |
| GET | `/api/inquisitiveAI/portfolio/positions` | Current positions with P&L |
| GET | `/api/inquisitiveAI/portfolio/history` | Trade history |
| GET | `/api/inquisitiveAI/execute/monitor` | Full 65-asset execution plan, allocation map, calldata |
| GET | `/api/inquisitiveAI/execute/auto` | Trigger performUpkeep() — hybrid keeper (cron-job.org + GitHub Actions) |
| GET | `/api/inquisitiveAI/execute/relay` | Optional Gelato relay status (GELATO_API_KEY required) |

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/create-charge` | Create BTC/SOL charge with dust nonce amount |
| GET | `/api/payment/check-charge` | Verify BTC/SOL payment via Blockstream / Solana RPC |

---

## Security

- **Zero private keys** in any file, environment variable, or codebase
- **Vault owner** = team wallet `0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746` — configures portfolio on-chain via Etherscan
- **Hybrid keeper** (cron-job.org + GitHub Actions) executes `performUpkeep()` — zero cost, no subscription required. Chainlink Automation can be added at scale.
- **deBridge DLN** is a fully on-chain bridge — no custodian, no API key, no off-chain intermediary
- **Payment verification** uses public blockchain APIs (Blockstream, Solana public RPC) — no third-party processor
- **WalletConnect only** — no MetaMask injection, no Coinbase popup, no custodial risk

---

## Platform Status

- ✅ **65/65 live native prices** — CoinGecko primary, CryptoCompare fallback, no mock data
- ✅ **27 ETH-mainnet assets** — Uniswap V3 ERC-20 swaps ready
- ✅ **13 cross-chain assets** — deBridge DLN bridges ready (Solana × 8, BSC, Avalanche, Optimism, TRON, BSC-FDUSD)
- ✅ **25 stETH yield positions** — allocated and earning Lido yield, native prices tracked
- ✅ **5 intelligence engines** — Pattern, Reasoning, Portfolio, Learning, Risk — live
- ✅ **11 trading functions** — fully implemented in `server/services/tradingEngine.js`
- ✅ **INQAI ERC-20** — `0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5` — mainnet live
- ✅ **BTC/SOL/TRX payment verification** — on-chain, automatic confirmation
- ✅ **Token sale active** — presale $8, ETH/USDC/BTC/SOL/TRX accepted, INQAI delivered within 24h
- ✅ **Vault live** — `0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52` — 26 assets + 13 bridges configured
- ✅ **Hybrid keeper running** — cron-job.org (1 min) + GitHub Actions (5 min) — zero cost, no LINK required

---

**Built by the INQUISITIVE team**

*INQAI represents proportional ownership in a professionally managed portfolio of 65 digital assets. This is not financial advice. Digital assets carry risk. Conduct your own due diligence.*

**© 2026 INQUISITIVE · INQAI**
