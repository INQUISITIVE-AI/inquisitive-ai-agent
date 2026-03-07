# INQUISITIVE — AI-Managed Asset-Backed Token

> **INQAI represents proportional ownership in a professionally managed portfolio of 65 digital assets, continuously optimized by proprietary AI systems 24/7. Fixed supply of 100,000,000 tokens. Ticker: INQAI.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Built with Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Smart Contracts](https://img.shields.io/badge/Solidity-0.8.19-blue)](https://soliditylang.org/)
[![AI Architecture](https://img.shields.io/badge/AI-5_Intelligence_Engines-purple)](https://github.com/inquisitive-ai)
[![Performance](https://img.shields.io/badge/Performance-18.5%25_APY_Target-green)](https://inquisitive.ai)

INQUISITIVE is a digital asset representing proportional ownership in a diversified portfolio of 65 digital assets, continuously managed by proprietary AI systems. Five intelligence engines execute 11 trading strategies to optimize portfolio composition and risk-adjusted returns. Token value accrues through portfolio performance, systematic buybacks, token burns, and staking rewards.

---

## 📋 **Table of Contents**

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Development](#development)
5. [Deployment](#deployment)
6. [Token Launch](#token-launch)
7. [API Reference](#api-reference)
8. [Security](#security)
9. [Advanced Integration](#advanced-integration)
10. [Contributing](#contributing)
11. [License](#license)
12. [Support](#support)

---

## 📋 **Overview**

### **What is INQUISITIVE?**

INQUISITIVE is a digital asset representing proportional ownership in a diversified portfolio of 65 digital assets, professionally managed by proprietary AI systems 24/7. Five intelligence engines and 11 trading strategies continuously optimize portfolio composition and risk-adjusted returns. Token value is underpinned by real digital assets, with additional accrual mechanisms including systematic buybacks, permanent burns, and staking rewards.

#### **🧠 5 Intelligence Engines**
- **Pattern Engine**: Reinforcement learning action-value scoring, regime detection (BULL/BEAR/NEUTRAL), volume confirmation
- **Reasoning Engine**: Fundamental market analysis, Fear & Greed sentiment, category premium scoring, yield identification
- **Portfolio Engine**: Sharpe-optimized diversification, Kelly Criterion position sizing, correlation-aware allocation
- **Learning Engine**: 7-day trend momentum, liquidity quality scoring, adaptive confidence thresholds, meta-cognitive self-awareness
- **Risk Engine**: Risk-first execution gate — all 5 risk checks must pass before any trade executes

#### **🚀 Core Capabilities**
- **65-Asset Portfolio**: Real live prices from CoinGecko API + CryptoCompare fallback. No mock data.
- **11 Trading Functions**: BUY, SELL, SWAP, LEND, YIELD, BORROW, LOOP, STAKE, MULTIPLY, EARN, REWARDS
- **Borrowing Engine**: Capital-efficient borrowing against blue-chip collateral — positive spread required, max 65% LTV, health factor ≥ 1.5
- **18.5% Target APY**: Multi-strategy yield from staking, lending, LP, and borrowing arbitrage
- **8-Second Cycles**: AI re-evaluates all 65 assets every 8 seconds, 24/7
- **5 Paper Trade Cycles**: AI validates signals in paper-trade mode before going live

#### **� How Token Holders Benefit**
- **Presale price: $8** — 47% below the $15 target price
- **Self-custody** — tokens delivered directly to your wallet; no exchange, no counterparty risk
- **Asset backing** — each INQAI represents proportional ownership in the 65-asset managed portfolio
- **60% of protocol fees** — deployed for systematic open-market INQAI buybacks
- **20% of protocol fees** — permanently burned, creating deflationary supply pressure
- **20% to treasury** — protocol development, ecosystem growth, and operational reserves

#### **🛡️ Risk Management (Risk-First Methodology)**
- 2% max portfolio risk per single trade (hard limit)
- 6% max total portfolio heat across all open positions
- 15% drawdown circuit breaker — all trading halts automatically
- 2:1 minimum risk-reward ratio required before entry
- Technical stop loss: 2× ATR below entry price
- 70% minimum AI confidence threshold to execute
- BEAR regime raises threshold to 75%

---

## 🏗️ **Architecture**

### **Five-Component Architecture**

```
The Brain       → 5-engine AI scoring: Pattern + Reasoning + Portfolio + Learning + Risk
                  Borrowing engine evaluates capital-efficient borrow opportunities each cycle
The Executioner → Trading Engine: 11 trading functions (BUY/SELL/SWAP/LEND/YIELD/BORROW/LOOP/STAKE/MULTIPLY/EARN/REWARDS)
The X-Ray       → Performance monitor: attribution, risk metrics, P&L tracking
The Guardian    → Multi-layer security: multi-sig + time-locks + circuit breakers
The Oracle      → Price feeds: CoinGecko (primary) + CryptoCompare (fallback)
```

### **System Components**

#### **Frontend (Next.js 14)**
- Pages: Home (`/`), Buy (`/buy`), Analytics (`/analytics`), Dashboard (`/dashboard`), Portfolio (`/token`), Docs (`/help`)
- Real-time WebSocket updates; wallet connection via WalletConnect only (no MetaMask/Coinbase popups)
- Pulsing INQUISITIVE brand name in top-left of every page

#### **Backend (Node.js/Express + WebSocket)**
- REST API at `http://localhost:3002/api/inquisitiveAI/`
- WebSocket at `ws://localhost:3002` for live price/signal streaming
- Services: `priceFeed.js`, `inquisitiveBrain.js`, `tradingEngine.js`, `macroData.js`

#### **Data Sources (Real Live — No Mock Data)**
- **CoinGecko API**: Primary price source, 65 assets in 2 batches, 30-second polling
- **CryptoCompare API**: Fallback for assets not in CoinGecko batch
- **Yahoo Finance**: Macro indicators (BTC futures, DXY, S&P500, gold, oil)
- **Alternative.me**: Fear & Greed Index

#### **Smart Contracts (Ethereum Mainnet)**
- INQAI ERC-20 token — 100M fixed supply, deployed at `0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746`
- Asset-backed vault contract with AI-managed portfolio execution
- Buyback and burn contract — 60% buybacks, 20% permanent burns, 20% treasury
- Multi-sig treasury with 48-hour timelocks
- Chainlink oracle integration for on-chain price verification

---

## ⚙️ **Installation**

### **Prerequisites**
- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL >= 14.0
- Git

### **Quick Start**

```bash
# Clone the repository
git clone https://github.com/inquisitive-ai/inquisitive-vault.git
cd inquisitive-vault

# Install dependencies
npm install

# Start the development environment
./deploy.sh dev

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3002
# WebSocket: ws://localhost:3003
```

### **Environment Setup**

1. **Clone Repository**
```bash
git clone https://github.com/inquisitive-ai/inquisitive-vault.git
cd inquisitive-vault
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Database Setup**
```bash
# Create PostgreSQL database
createdb inquisitive_vault

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

5. **Smart Contract Deployment**
```bash
# Compile contracts
npm run compile

# Deploy to local network
npm run deploy:local

# Or deploy to mainnet
npm run deploy:mainnet
```

### **Configuration**

#### **Environment Variables**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/inquisitive_vault

# Blockchain
PRIVATE_KEY=your_private_key
RPC_URL=https://mainnet.infura.io/v3/your_project_id
CHAIN_ID=1

# API Keys
COINGECKO_API_KEY=your_coingecko_key
CHAINLINK_API_KEY=your_chainlink_key

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Services
REDIS_URL=redis://localhost:6379
WEBSOCKET_PORT=3003
```

---

## 🔧 **Development**

### **Development Workflow**

1. **Start Development Environment**
```bash
# Start all services
./deploy.sh dev

# Or start individually
npm run dev:frontend
npm run dev:backend
npm run dev:blockchain
```

2. **Run Tests**
```bash
# Run all tests
./deploy.sh test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

3. **Code Quality**
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### **Project Structure**

```
inquisitive-vault/
├── contracts/              # Smart contracts
├── pages/                  # Next.js pages
├── public/                 # Static assets
├── server/                 # Backend services
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── middleware/        # Express middleware
├── src/                    # Frontend components
├── tests/                  # Test files
└── typechain-types/        # Type definitions
```

### **Development Guidelines**

#### **Code Standards**
- **TypeScript**: Strict type checking enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality control

#### **Testing Strategy**
- **Unit Tests**: Jest for isolated component testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Cypress for full user flows
- **Smart Contract Tests**: Hardhat for contract testing

#### **Security Practices**
- **Code Reviews**: All changes require review
- **Security Audits**: Regular third-party audits
- **Dependency Updates**: Automated vulnerability scanning
- **Access Control**: Principle of least privilege

---

## 🚀 **Deployment**

### **Production Deployment**

#### **Automated Deployment**
```bash
# Run the complete deployment script
./deploy.sh deploy --env production
```

#### **Manual Deployment**
```bash
# Build frontend
npm run build:frontend

# Build backend
npm run build:backend

# Deploy smart contracts
npm run deploy:mainnet

# Start services
npm run start:production
```

### **Infrastructure Requirements**

#### **Minimum Specifications**
- **CPU**: 4 cores
- **Memory**: 8GB RAM
- **Storage**: 100GB SSD
- **Network**: 1Gbps
- **Database**: PostgreSQL 14+

#### **Recommended Specifications**
- **CPU**: 8 cores
- **Memory**: 16GB RAM
- **Storage**: 500GB SSD
- **Network**: 10Gbps
- **Database**: PostgreSQL 15+ with replication

### **Monitoring and Maintenance**

#### **Health Checks**
```bash
# API health check
curl http://localhost:3001/health

# WebSocket health check
curl http://localhost:3001/health/ws

# Database health check
npm run health:database
```

#### **Logging**
```bash
# View application logs
npm run logs

# View error logs
npm run logs:errors

# View performance logs
npm run logs:performance
```

#### **Backup Procedures**
```bash
# Database backup
npm run backup:database

# Configuration backup
npm run backup:config

# Full system backup
npm run backup:full
```

---

## 🪙 **Token Launch**

### **Token Overview**

**Token Name**: INQUISITIVE  
**Token Symbol**: INQAI  
**Token Standard**: ERC-20  
**Total Supply**: 100,000,000 INQAI (fixed, non-inflationary)  
**Target Price**: $15 per token  
**Target Market Cap**: $1.5 billion  
**Target APY**: 18.5%  
**Contract Address**: `0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746`  

### **Institutional-Grade Tokenomics**

#### **Optimized Supply Structure**
- **Total Supply**: 100M tokens (reduced from 1B for premium positioning)
- **Fixed Supply**: 0% inflation (deflationary bias)
- **Target Price**: $15 (institutional-grade valuation)
- **Market Cap Goal**: $1.5B (positioned between AAVE and UNI)

#### **Distribution Breakdown**
| Category | Allocation | Amount | Vesting | Purpose |
|----------|------------|---------|---------|---------|
| **Ecosystem Growth** | 35% | 35M | 36mo | AI R&D, partnerships |
| **Team & Advisors** | 20% | 20M | 36mo (3mo mini-cliff) | Long-term alignment |
| **Foundation** | 15% | 15M | 48mo | Protocol R&D, operations |
| **Liquidity** | 15% | 15M | Immediate | DEX liquidity |
| **Community** | 10% | 10M | Immediate | Airdrop, incentives |
| **Strategic Reserve** | 5% | 5M | 48mo | Opportunities, AI control plane |

#### **Portfolio Management**
- **Continuous Optimization**: AI re-evaluates all 65 assets every 8 seconds, 24/7
- **Risk-First Methodology**: All trades require 2:1 R:R minimum, 70% AI confidence threshold
- **Circuit Breakers**: 15% drawdown halt, 6% max portfolio heat, 2% max per-trade risk
- **Multi-Strategy Execution**: 11 trading functions including lending, staking, LP, and borrowing
- **No Human Intervention**: Fully autonomous execution from signal generation to settlement

#### **Value Accrual Mechanisms**
- **Performance Fee**: 15% flat on protocol yields — no management fee, no deposit/withdrawal fee
- **Fee Distribution**: 60% buybacks · 20% permanent burn · 20% treasury
- **Systematic Buybacks**: 60% of all protocol fees deployed for open-market INQAI purchases
- **Deflationary Burns**: 20% of protocol fees permanently removed from circulating supply
- **Staking Rewards**: Token holders earn protocol yield through staking
- **Portfolio Appreciation**: Underlying 65-asset portfolio value accrues to token holders

#### **Institutional Market Positioning**

**Competitive Advantages:**
- **Proprietary AI Management**: Five intelligence engines with 11 trading strategies — no comparable on-chain equivalent
- **Asset-Backed Foundation**: Token value underpinned by a diversified 65-asset portfolio, not protocol speculation
- **Fixed Supply with Deflationary Bias**: 100M cap with systematic burns reducing circulating supply over time
- **Self-Custody Architecture**: Tokens held directly by holders — no exchange or custodial counterparty risk
- **Institutional Risk Controls**: 2% per-trade limits, 15% drawdown circuit breaker, 70% confidence threshold

**Target Metrics:**
| Metric | Target | Industry Comparison |
|--------|---------|---------------------|
| **TVL Goal** | $500M – $1B | Top 20 DeFi protocols |
| **APY Target** | 18.5% | Competitive with leading yield protocols |
| **Presale Price** | $8 | 47% below $15 target |
| **Target Price** | $15 | Based on portfolio and fee model |
| **Target Market Cap** | $1.5B | Positioned between AAVE and UNI |

**Value Proposition:**
- **Diversified Exposure**: Single token providing proportional ownership across 65 digital assets
- **Professional Management**: Proprietary AI systems managing the portfolio continuously, without human intervention
- **Transparent Operations**: Real-time analytics, on-chain verification, and live portfolio visibility
- **Compounding Mechanics**: Buybacks, burns, and staking rewards work simultaneously to appreciate token value

### **Launch Checklist**

#### **Pre-Launch Requirements**
- [ ] Smart contracts audited and verified
- [ ] Frontend and backend deployed
- [ ] Database seeded with 65 assets
- [ ] AI models trained and tested
- [ ] Security measures implemented
- [ ] Monitoring and alerting configured

#### **Launch Commands**
```bash
# 1. Deploy to production
./deploy.sh deploy --env production

# 2. Deploy smart contracts to mainnet
./deploy.sh deploy --env production --network mainnet

# 3. Verify deployment
./deploy.sh health

# 4. Seed vault with initial assets
npm run db:seed-vault

# 5. Start AI services
npm run start:all
```

#### **Token Contract Deployment**
```bash
# Deploy INQAI Vault Contract
npx hardhat run scripts/deploy-vault.js --network mainnet

# Deploy AI Strategy Manager
npx hardhat run scripts/deploy-strategy.js --network mainnet

# Verify contracts on Etherscan
npx hardhat verify --network mainnet <CONTRACT_ADDRESS>
```

#### **Initial Liquidity Setup**
```bash
# Add initial liquidity to vault
npm run vault:add-liquidity --amount 1000000 --asset USDC

# Set initial asset allocations
npm run vault:set-allocations

# Start AI rebalancing
npm run ai:start-rebalancing
```

### **Launch Verification**

#### **Health Checks**
```bash
# Check all systems
./deploy.sh health

# Verify token contract
npm run verify:token

# Check AI services
npm run health:ai

# Test deposit/withdraw
npm run test:vault-operations
```

#### **Performance Monitoring**
```bash
# Monitor APY performance
npm run monitor:apy

# Track AI performance
npm run monitor:ai

# Check risk metrics
npm run monitor:risk
```

---

## 📚 **API Reference**

### **Authentication**
All API endpoints require authentication using JWT tokens:

```bash
# Get access token
POST /api/auth/login
{
  "wallet": "0x...",
  "signature": "0x..."
}

# Use token in requests
Authorization: Bearer <jwt_token>
```

### **Core Endpoints**

#### **Vault Operations**
```bash
# Get vault overview
GET /api/vault/overview

# Deposit assets
POST /api/vault/deposit
{
  "asset": "ETH",
  "amount": "1.0"
}

# Withdraw assets
POST /api/vault/withdraw
{
  "asset": "ETH",
  "amount": "0.5",
  "recipient": "0x..."
}
```

#### **AI Signals**
```bash
# Get current signals
GET /api/signals/status

# Get ensemble prediction
GET /api/signals/ensemble

# Get signal history
GET /api/signals/history
```

#### **Trading Strategy**
```bash
# Get current strategy
GET /api/trading/strategy/status

# Execute manual trade
POST /api/trading/strategy/execute
{
  "action": "BUY",
  "asset": "BTC",
  "amount": "0.1"
}
```

#### **Crypto Lending**
```bash
# Get lending status
GET /api/lending/status

# Create lending position
POST /api/lending/lend
{
  "protocol": "aave",
  "asset": "USDC",
  "amount": "1000"
}
```

### **WebSocket Events**

#### **Real-Time Updates**
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3003');

// Subscribe to price updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'prices'
}));

// Receive updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Price update:', data);

---

## 🏆 **Project Status**

### ✅ **Platform Status — All Phases Operational**

- ✅ **65/65 live prices** — CoinGecko primary + CryptoCompare fallback, no mock data
- ✅ **5 intelligence engines** — Pattern, Reasoning, Portfolio, Learning, Risk
- ✅ **11 trading functions** — BUY, SELL, SWAP, LEND, YIELD, BORROW, LOOP, STAKE, MULTIPLY, EARN, REWARDS
- ✅ **Smart contracts deployed** — INQAI ERC-20 live at `0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746`
- ✅ **Buyback + burn contract** — 60% buybacks, 20% permanent burns, 20% treasury
- ✅ **Self-custody architecture** — WalletConnect only, tokens delivered directly to holder wallets
- ✅ **Risk-first methodology** — 2% max per trade, 6% heat, 15% drawdown circuit breaker
- ✅ **Live DeFi execution** — Aave V3, Uniswap V3, Jupiter, Lido, Morpho all operational
- ✅ **Real-time analytics** — portfolio value, AI signals, macro indicators, live
- ✅ **Token sale active** — presale at $8, ETH/BTC/SOL/USDC accepted

### 🚀 **Quick Start**
```bash
npm install
npm run dev        # starts both frontend (3001) and backend (3002)
```

---

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

---

## 📚 **API Reference**

**Base URL**: `http://localhost:3002/api/inquisitiveAI/`

**Note**: All trading operations are fully automated. Token holders acquire INQAI and the AI manages the portfolio continuously without manual intervention.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | System status — AI engines, live data feeds, portfolio metrics, risk assessment |
| GET | `/assets` | Complete asset inventory — 65 digital assets with real-time pricing and AI signal analysis |
| GET | `/assets/:symbol` | Individual asset analysis — pricing, AI confidence scores, risk metrics |
| GET | `/dashboard` | Portfolio monitor — comprehensive performance data, AI decisions, risk indicators |
| GET | `/signals` | AI intelligence output — trading signals, confidence levels, risk gate status |
| GET | `/analyze/:symbol` | Deep intelligence analysis — five-engine consensus scoring with rationale |
| GET | `/prices` | Real-time price data — live market prices across all portfolio assets |
| GET | `/prices/:symbol` | Single asset pricing — current price, 24h performance, volume metrics |
| GET | `/macro` | Market intelligence — macro indicators, Fear & Greed Index, market regime |
| GET | `/portfolio/positions` | Current positions — active holdings with unrealized P&L and risk metrics |
| GET | `/portfolio/history` | Historical performance — executed trades with realized P&L attribution |
| POST | `/initialize` | System initialization — restart AI engines and data feeds |


---

---

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

---

## � **Support**

- **Documentation**: [docs.inquisitive.ai](https://docs.inquisitive.ai)
- **Discord**: [Join our community](https://discord.gg/inquisitive)
- **Twitter**: [@InquisitiveAI](https://twitter.com/InquisitiveAI)
- **Email**: support@inquisitive.ai

---

**Built by the INQUISITIVE team**

*INQAI represents proportional ownership in a professionally managed portfolio of 65 digital assets. This is not financial advice. Digital assets carry risk. Conduct your own due diligence.*

**© 2026 INQUISITIVE · INQAI**
