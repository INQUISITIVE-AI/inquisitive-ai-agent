'use strict';
// ============================================================
// INQUISITIVE AI — TRADING ENGINE
// All 11 trading functions: Buy, Sell, Swap, Lend, Yield,
//   Borrow, Loop (recursive), Stake, Multiply, Earn, Rewards
// Integrates with Brain signals + Risk-first gate
// ============================================================
const EventEmitter = require('events');
const priceFeed    = require('./priceFeed');
const brain        = require('./inquisitiveBrain');
const { CT }       = require('./inquisitiveBrain');

// ── Protocol integrations (on-chain via RPC when deployed) ──
const PROTOCOLS = {
  lending: {
    AAVE:     { name: 'Aave V3',      apy: null, chain: 'ethereum' },
    COMPOUND: { name: 'Compound V3',  apy: null, chain: 'ethereum' },
    SPARK:    { name: 'SparkLend',    apy: null, chain: 'ethereum' },
    MORPHO:   { name: 'Morpho Blue',  apy: null, chain: 'ethereum' },
    MAPLE:    { name: 'Maple Finance',apy: null, chain: 'ethereum' },
  },
  dex: {
    UNISWAP:  { name: 'Uniswap V3',  chain: 'ethereum', fee: 0.003 },
    JUPITER:  { name: 'Jupiter Agg', chain: 'solana',   fee: 0.001 },
    ORCA:     { name: 'Orca',        chain: 'solana',   fee: 0.002 },
    ONEINCH:  { name: '1inch',       chain: 'ethereum', fee: 0.001 },
    RAYDIUM:  { name: 'Raydium',     chain: 'solana',   fee: 0.002 },
  },
  staking: {
    LIDO:     { name: 'Lido',        asset: 'ETH',  apy: null, chain: 'ethereum' },
    JITO:     { name: 'Jito',        asset: 'SOL',  apy: null, chain: 'solana'   },
    SANCTUM:  { name: 'Sanctum',     asset: 'SOL',  apy: null, chain: 'solana'   },
    NATIVE:   { name: 'Native',      asset: 'multi',apy: null, chain: 'multi'    },
  },
};

// ── Trade record store (in-memory; persist to DB in production) ──
const tradeHistory = [];
let activePositions = new Map(); // symbol → position
let totalPnL        = 0;
let tradingActive   = false;

function genTxId() {
  return '0x' + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

function computePositionSize(portfolioValue, riskPct, entryPrice, stopPrice) {
  // Position sizing: position$ = (portfolio × maxRisk%) / (entry - stop) × entry
  const riskAmount  = portfolioValue * riskPct;
  const priceDelta  = Math.abs(entryPrice - stopPrice);
  if (priceDelta === 0) return 0;
  return riskAmount / (priceDelta / entryPrice);
}

// ═══════════════════════════════════════════════════════════
// 1. BUY
// ═══════════════════════════════════════════════════════════
async function buy({ symbol, amount, portfolioValue = 100_000, slippage = 0.005 }) {
  const asset  = priceFeed.getPrice(symbol);
  if (!asset)  throw new Error(`No live price for ${symbol}`);
  const signal = brain.getSignal(symbol);
  const risk   = brain.getRiskAssessment();

  // Risk gate
  if (risk.portfolioHeat >= CT.MAX_PORTFOLIO_HEAT) {
    return { success: false, reason: `Portfolio heat ${(risk.portfolioHeat*100).toFixed(1)}% — no new buys`, risk };
  }
  if (risk.drawdown >= CT.MAX_DRAWDOWN) {
    return { success: false, reason: `Emergency stop: drawdown ${(risk.drawdown*100).toFixed(1)}%`, risk };
  }

  const entryPrice = asset.priceUsd * (1 + slippage);
  const stopPrice  = entryPrice * (1 - CT.STOP_LOSS_ATR_MULT * Math.abs(asset.change24h || 0.02));
  const posSize    = computePositionSize(portfolioValue, CT.MAX_RISK_PER_TRADE, entryPrice, stopPrice);
  const actualSize = Math.min(amount || posSize, posSize);

  const trade = {
    id:          genTxId(),
    type:        'BUY',
    symbol,
    name:        asset.name,
    entryPrice,
    stopPrice,
    targetPrice: entryPrice * (1 + CT.RISK_REWARD_MIN * CT.STOP_LOSS_ATR_MULT * Math.abs(asset.change24h || 0.02)),
    amount:      actualSize,
    units:       actualSize / entryPrice,
    slippage,
    timestamp:   new Date().toISOString(),
    signal:      signal?.action || 'MANUAL',
    confidence:  signal?.finalScore || 0,
    protocol:    'MARKET',
    status:      'EXECUTED',
    pnl:         0,
    riskGate: {
      riskPerTrade: CT.MAX_RISK_PER_TRADE,
      stopLoss:     stopPrice,
      target:       entryPrice * 1.06,
      riskReward:   CT.RISK_REWARD_MIN,
    },
  };

  tradeHistory.push(trade);
  activePositions.set(symbol, trade);
  brain.portfolioHeat = Math.min(brain.portfolioHeat + CT.MAX_RISK_PER_TRADE, CT.MAX_PORTFOLIO_HEAT);

  return { success: true, trade };
}

// ═══════════════════════════════════════════════════════════
// 2. SELL
// ═══════════════════════════════════════════════════════════
async function sell({ symbol, amount, reason = 'MANUAL' }) {
  const asset    = priceFeed.getPrice(symbol);
  if (!asset)    throw new Error(`No live price for ${symbol}`);
  const position = activePositions.get(symbol);

  const exitPrice = asset.priceUsd * 0.9995; // 0.05% slippage
  let pnl = 0;

  if (position) {
    pnl = (exitPrice - position.entryPrice) * (position.units || 1);
    totalPnL += pnl;
    brain.portfolioHeat = Math.max(0, brain.portfolioHeat - CT.MAX_RISK_PER_TRADE);
    if (pnl < 0 && totalPnL < 0) {
      brain.drawdown = Math.abs(totalPnL) / 100_000;
    }
    activePositions.delete(symbol);
  }

  const trade = {
    id:         genTxId(),
    type:       'SELL',
    symbol,
    name:       asset.name,
    exitPrice,
    amount:     amount || (position?.amount || 0),
    units:      position?.units || 0,
    pnl,
    reason,
    timestamp:  new Date().toISOString(),
    status:     'EXECUTED',
    entryRef:   position?.id || null,
  };

  tradeHistory.push(trade);
  return { success: true, trade, pnl, totalPnL };
}

// ═══════════════════════════════════════════════════════════
// 3. SWAP
// ═══════════════════════════════════════════════════════════
async function swap({ fromSymbol, toSymbol, amount, preferDex = 'auto' }) {
  const from = priceFeed.getPrice(fromSymbol);
  const to   = priceFeed.getPrice(toSymbol);
  if (!from) throw new Error(`No live price for ${fromSymbol}`);
  if (!to)   throw new Error(`No live price for ${toSymbol}`);

  // Select optimal DEX based on chain
  const chain = from.category === 'major' && fromSymbol === 'SOL' ? 'solana' : 'ethereum';
  const dex   = chain === 'solana' ? PROTOCOLS.dex.JUPITER : PROTOCOLS.dex.UNISWAP;
  const fee   = dex.fee;

  const fromUsd  = from.priceUsd * amount;
  const toAmount = (fromUsd * (1 - fee)) / to.priceUsd;
  const slippage = 0.003; // 0.3% estimated
  const toAmountMin = toAmount * (1 - slippage);

  const trade = {
    id:          genTxId(),
    type:        'SWAP',
    fromSymbol,
    toSymbol,
    fromAmount:  amount,
    toAmount,
    toAmountMin,
    fromPriceUsd: from.priceUsd,
    toPriceUsd:   to.priceUsd,
    fromUsdValue: fromUsd,
    toUsdValue:   toAmount * to.priceUsd,
    dex:          dex.name,
    fee,
    slippage,
    timestamp:    new Date().toISOString(),
    status:       'EXECUTED',
  };

  tradeHistory.push(trade);
  return { success: true, trade };
}

// ═══════════════════════════════════════════════════════════
// 4. LEND
// ═══════════════════════════════════════════════════════════
async function lend({ symbol, amount, protocol = 'AAVE' }) {
  const asset = priceFeed.getPrice(symbol);
  if (!asset)       throw new Error(`No live price for ${symbol}`);
  if (!asset.lendable) throw new Error(`${symbol} is not lendable`);

  const proto = PROTOCOLS.lending[protocol.toUpperCase()] || PROTOCOLS.lending.AAVE;

  // APY from Aave V3 rates (would be fetched from contract in production)
  const estimatedAPY = {
    USDC: 0.0480, USDT: 0.0450, DAI: 0.0430, ETH: 0.0180, BTC: 0.0025,
    BNB: 0.0060, AAVE: 0.0100, LINK: 0.0045, UNI: 0.0040, ARB: 0.0055,
  };
  const apy = estimatedAPY[symbol] || 0.0150;

  const trade = {
    id:          genTxId(),
    type:        'LEND',
    symbol,
    name:        asset.name,
    amount,
    amountUsd:   amount * asset.priceUsd,
    protocol:    proto.name,
    apy,
    estimatedDailyYield:  (amount * apy) / 365,
    estimatedAnnualYield: amount * apy,
    estimatedDailyUsd:    (amount * asset.priceUsd * apy) / 365,
    timestamp:   new Date().toISOString(),
    status:      'ACTIVE',
  };

  tradeHistory.push(trade);
  return { success: true, trade };
}

// ═══════════════════════════════════════════════════════════
// 5. YIELD (liquidity provision / yield farming)
// ═══════════════════════════════════════════════════════════
async function yield_({ symbol, amount, poolType = 'stable' }) {
  const asset = priceFeed.getPrice(symbol);
  if (!asset)        throw new Error(`No live price for ${symbol}`);
  if (!asset.yieldable) throw new Error(`${symbol} is not yield-bearing`);

  // Estimated yields by pool type
  const yields = {
    stable:    { apy: 0.0480, protocol: 'Aave Stable Pool',    risk: 'LOW' },
    volatile:  { apy: 0.1200, protocol: 'Uniswap V3 Range',   risk: 'MEDIUM' },
    leveraged: { apy: 0.2500, protocol: 'Morpho Optimizer',   risk: 'HIGH' },
    lsd:       { apy: 0.0420, protocol: 'Lido / Jito Staking', risk: 'LOW' },
  };
  const pool = yields[poolType] || yields.stable;

  const trade = {
    id:          genTxId(),
    type:        'YIELD',
    symbol,
    name:        asset.name,
    amount,
    amountUsd:   amount * asset.priceUsd,
    poolType,
    protocol:    pool.protocol,
    apy:         pool.apy,
    risk:        pool.risk,
    estimatedDailyYield:  (amount * pool.apy) / 365,
    estimatedAnnualYield: amount * pool.apy,
    estimatedDailyUsd:    (amount * asset.priceUsd * pool.apy) / 365,
    timestamp:   new Date().toISOString(),
    status:      'ACTIVE',
  };

  tradeHistory.push(trade);
  return { success: true, trade };
}

// ═══════════════════════════════════════════════════════════
// 6. BORROW (capital-efficient borrowing against collateral)
// ═══════════════════════════════════════════════════════════
async function borrow({ collateralSymbol, borrowSymbol = 'USDC', amount, protocol = 'AAVE', ltv = 0.65 }) {
  const collateral = priceFeed.getPrice(collateralSymbol);
  if (!collateral) throw new Error(`No live price for ${collateralSymbol}`);
  if (!collateral.lendable) throw new Error(`${collateralSymbol} is not accepted as collateral`);

  const safeLtv       = Math.min(ltv, 0.65);         // Hard cap: 65% LTV max
  const healthFloor   = 1.5;                          // Minimum health factor
  const collateralUsd = amount * collateral.priceUsd; // USD value of collateral
  const borrowApr     = { USDC: 0.058, USDT: 0.062, DAI: 0.055 }[borrowSymbol] || 0.06;
  const deployApy     = 0.048;                        // Conservative: lending pool APY for borrowed stablecoins
  const spread        = deployApy - borrowApr;

  if (spread <= 0) throw new Error(`No positive spread: deploy ${(deployApy*100).toFixed(1)}% vs borrow ${(borrowApr*100).toFixed(1)}%`);

  const borrowAmountUsd = collateralUsd * safeLtv;
  const healthFactor    = (collateralUsd * 0.80) / borrowAmountUsd; // Aave ETH liquidation threshold 80%
  if (healthFactor < healthFloor) throw new Error(`Health factor ${healthFactor.toFixed(2)} < ${healthFloor} floor`);

  const protocolName = { AAVE: 'Aave V3', MORPHO: 'Morpho Blue', COMPOUND: 'Compound V3' }[protocol.toUpperCase()] || 'Aave V3';
  const dailyInterest = borrowAmountUsd * (borrowApr / 365);
  const dailyYield    = borrowAmountUsd * (deployApy / 365);

  const trade = {
    id:              `borrow_${Date.now()}`,
    type:            'BORROW',
    collateral:      collateralSymbol,
    borrowAsset:     borrowSymbol,
    collateralUsd:   parseFloat(collateralUsd.toFixed(2)),
    borrowAmountUsd: parseFloat(borrowAmountUsd.toFixed(2)),
    ltv:             parseFloat((safeLtv * 100).toFixed(1)) + '%',
    healthFactor:    parseFloat(healthFactor.toFixed(2)),
    borrowApr:       parseFloat((borrowApr * 100).toFixed(2)) + '%',
    deployApy:       parseFloat((deployApy * 100).toFixed(2)) + '%',
    netSpread:       parseFloat((spread * 100).toFixed(2)) + '%',
    dailyInterest:   parseFloat(dailyInterest.toFixed(4)),
    dailyYield:      parseFloat(dailyYield.toFixed(4)),
    dailyNet:        parseFloat((dailyYield - dailyInterest).toFixed(4)),
    protocol:        protocolName,
    timestamp:       new Date().toISOString(),
    status:          'ACTIVE',
  };

  tradeHistory.push(trade);
  return { success: true, trade };
}

// ═══════════════════════════════════════════════════════════
// 7. LOOP (recursive yield — advanced compounding strategy)
// ═══════════════════════════════════════════════════════════
async function loop({ symbol, amount, maxLoops = 3, ltv = 0.75 }) {
  const asset = priceFeed.getPrice(symbol);
  if (!asset)        throw new Error(`No live price for ${symbol}`);
  if (!asset.lendable) throw new Error(`${symbol} cannot be used in yield loop`);

  // Safety cap per risk-first methodology
  const safeMaxLoops = Math.min(maxLoops, 5);
  const safeLtv      = Math.min(ltv, 0.80); // Never exceed 80% LTV

  let loops       = [];
  let totalDeposit = amount * asset.priceUsd;
  let loopAmount   = amount;
  let cumulativeAPY = 0;

  const supplyAPY  = { USDC: 0.048, ETH: 0.018, BTC: 0.0025, DEFAULT: 0.015 };
  const borrowAPY  = { USDC: 0.060, ETH: 0.025, BTC: 0.0035, DEFAULT: 0.022 };
  const sAPY = supplyAPY[symbol] || supplyAPY.DEFAULT;
  const bAPY = borrowAPY[symbol] || borrowAPY.DEFAULT;
  const netLoopAPY = (sAPY * safeLtv) - bAPY * (1 - safeLtv);

  for (let i = 0; i < safeMaxLoops; i++) {
    const depositUsd = loopAmount * asset.priceUsd;
    const borrowAmt  = loopAmount * safeLtv;
    const borrowUsd  = borrowAmt * asset.priceUsd;
    const netYield   = depositUsd * sAPY - borrowUsd * bAPY;

    loops.push({
      loop:       i + 1,
      deposit:    loopAmount,
      depositUsd,
      borrow:     borrowAmt,
      borrowUsd,
      ltv:        safeLtv,
      netYieldUsd: netYield,
      supplyAPY:  sAPY,
      borrowAPY:  bAPY,
    });

    cumulativeAPY += netLoopAPY;
    loopAmount     = borrowAmt;
    totalDeposit  += depositUsd;
  }

  const totalNetAPY     = cumulativeAPY;
  const healthFactor    = 1 / safeLtv;  // min HF maintained

  const trade = {
    id:            genTxId(),
    type:          'LOOP',
    symbol,
    name:          asset.name,
    initialAmount: amount,
    amountUsd:     amount * asset.priceUsd,
    maxLoops:      safeMaxLoops,
    ltv:           safeLtv,
    loops,
    totalDeployedUsd: totalDeposit,
    totalNetAPY,
    estimatedAnnualYieldUsd: amount * asset.priceUsd * totalNetAPY,
    healthFactor,
    protocol:      'Aave V3 + Morpho',
    timestamp:     new Date().toISOString(),
    status:        'ACTIVE',
    warning:       safeLtv > 0.70 ? 'LTV above 70% — monitor health factor closely' : null,
  };

  tradeHistory.push(trade);
  return { success: true, trade };
}

// ═══════════════════════════════════════════════════════════
// 7. STAKE
// ═══════════════════════════════════════════════════════════
async function stake({ symbol, amount, protocol = 'auto' }) {
  const asset = priceFeed.getPrice(symbol);
  if (!asset)        throw new Error(`No live price for ${symbol}`);
  if (!asset.stakeable) throw new Error(`${symbol} is not stakeable`);

  // Real staking APYs by asset
  const stakingAPYs = {
    ETH:     { apy: 0.0380, protocol: 'Lido (stETH)',       derivative: 'stETH'   },
    SOL:     { apy: 0.0680, protocol: 'Jito (JitoSOL)',     derivative: 'JitoSOL' },
    JITOSOL: { apy: 0.0720, protocol: 'Jito Liquid Staking',derivative: 'JITOSOL' },
    JUPSOL:  { apy: 0.0700, protocol: 'Jupiter Staking',    derivative: 'JUPSOL'  },
    mSOL:    { apy: 0.0750, protocol: 'Marinade Finance',   derivative: 'mSOL'    },
    BNB:     { apy: 0.0350, protocol: 'BNB Beacon Chain',   derivative: 'BNB'     },
    ADA:     { apy: 0.0350, protocol: 'Cardano Staking',    derivative: 'ADA'     },
    DOT:     { apy: 0.1200, protocol: 'Polkadot Nomination',derivative: 'DOT'     },
    ATOM:    { apy: 0.1500, protocol: 'Cosmos Delegation',  derivative: 'ATOM'    },
    ALGO:    { apy: 0.0550, protocol: 'Algorand Governance',derivative: 'ALGO'    },
    EOS:     { apy: 0.0450, protocol: 'Vaulta Staking',     derivative: 'EOS'     },
    NEAR:    { apy: 0.0900, protocol: 'NEAR Staking',       derivative: 'NEAR'    },
    INJ:     { apy: 0.1100, protocol: 'Injective Staking',  derivative: 'INJ'     },
    JUP:     { apy: 0.0800, protocol: 'Jupiter DAO',        derivative: 'JUP'     },
    TAO:     { apy: 0.1200, protocol: 'Bittensor Subnet',   derivative: 'TAO'     },
    STRK:    { apy: 0.0450, protocol: 'Starknet Staking',   derivative: 'STRK'    },
    VET:     { apy: 0.0320, protocol: 'VeChain VTHO Gen',   derivative: 'VTHO'    },
    HNT:     { apy: 0.0680, protocol: 'Helium Mining',      derivative: 'HNT'     },
    GRT:     { apy: 0.0900, protocol: 'The Graph Indexing', derivative: 'GRT'     },
    FET:     { apy: 0.0700, protocol: 'ASI Staking',        derivative: 'FET'     },
    POL:     { apy: 0.0550, protocol: 'Polygon Staking',    derivative: 'POL'     },
    ENA:     { apy: 0.2700, protocol: 'Ethena sENA',        derivative: 'sENA'    },
    DBR:     { apy: 0.0600, protocol: 'deBridge Staking',   derivative: 'DBR'     },
    XDC:     { apy: 0.0700, protocol: 'XDC Masternode',     derivative: 'XDC'     },
    LINK:    { apy: 0.0450, protocol: 'Chainlink Staking',  derivative: 'LINK'    },
    XTZ:     { apy: 0.0580, protocol: 'Tezos Baking',       derivative: 'XTZ'     },
    TRX:     { apy: 0.0480, protocol: 'TRON Energy Staking',derivative: 'TRX'     },
    HBAR:    { apy: 0.0650, protocol: 'Hedera Staking',     derivative: 'HBAR'    },
    AAVE:    { apy: 0.0680, protocol: 'Aave Safety Module', derivative: 'stkAAVE' },
    LDO:     { apy: 0.0450, protocol: 'Lido DAO Staking',   derivative: 'LDO'     },
    SOIL:    { apy: 0.1200, protocol: 'Soil Finance Staking',derivative: 'xSOIL'  },
    HONEY:   { apy: 0.0800, protocol: 'Hivemapper Network', derivative: 'HONEY'   },
  };

  const stakeInfo = stakingAPYs[symbol] || { apy: 0.0400, protocol: 'Native Staking', derivative: symbol };

  const trade = {
    id:          genTxId(),
    type:        'STAKE',
    symbol,
    name:        asset.name,
    amount,
    amountUsd:   amount * asset.priceUsd,
    protocol:    stakeInfo.protocol,
    apy:         stakeInfo.apy,
    derivative:  stakeInfo.derivative,
    estimatedDailyYield:   (amount * stakeInfo.apy) / 365,
    estimatedAnnualYield:  amount * stakeInfo.apy,
    estimatedDailyUsd:     (amount * asset.priceUsd * stakeInfo.apy) / 365,
    estimatedAnnualUsd:    amount * asset.priceUsd * stakeInfo.apy,
    lockupPeriod:          symbol === 'DOT' ? '28 days' : symbol === 'ATOM' ? '21 days' : 'flexible',
    timestamp:   new Date().toISOString(),
    status:      'ACTIVE',
  };

  tradeHistory.push(trade);
  return { success: true, trade };
}

// ═══════════════════════════════════════════════════════════
// 8. MULTIPLY (leveraged long)
// ═══════════════════════════════════════════════════════════
async function multiply({ symbol, amount, leverage = 2 }) {
  const asset = priceFeed.getPrice(symbol);
  if (!asset) throw new Error(`No live price for ${symbol}`);

  // Risk gate — max 3× leverage for volatile assets
  const maxLev = asset.category === 'stablecoin' ? 5 : asset.category === 'major' ? 3 : 2;
  const safeLev = Math.min(leverage, maxLev);
  const risk    = brain.getRiskAssessment();

  if (risk.portfolioHeat >= CT.MAX_PORTFOLIO_HEAT) {
    return { success: false, reason: 'Portfolio heat too high for leveraged position' };
  }

  const notional     = amount * safeLev;
  const notionalUsd  = notional * asset.priceUsd;
  const borrowAmount = notional - amount;
  const borrowUsd    = borrowAmount * asset.priceUsd;
  const borrowAPY    = 0.025;
  const dailyCost    = (borrowUsd * borrowAPY) / 365;

  // Required price move to break even
  const breakEven1pct = notionalUsd * 0.01;
  const liqPrice      = asset.priceUsd * (1 - (1 / safeLev) * 0.85); // 85% margin call

  const trade = {
    id:           genTxId(),
    type:         'MULTIPLY',
    symbol,
    name:         asset.name,
    collateral:   amount,
    collateralUsd: amount * asset.priceUsd,
    leverage:     safeLev,
    notional,
    notionalUsd,
    borrowAmount,
    borrowUsd,
    borrowAPY,
    dailyBorrowCostUsd: dailyCost,
    entryPrice:   asset.priceUsd,
    liquidationPrice: liqPrice,
    breakEvenMove: (dailyCost / notionalUsd) * 100,
    protocol:     'Aave V3 / Morpho',
    timestamp:    new Date().toISOString(),
    status:       'ACTIVE',
    warning:      safeLev < leverage ? `Leverage capped at ${safeLev}× (risk engine limit)` : null,
  };

  tradeHistory.push(trade);
  brain.portfolioHeat = Math.min(brain.portfolioHeat + CT.MAX_RISK_PER_TRADE * safeLev, CT.MAX_PORTFOLIO_HEAT);
  return { success: true, trade };
}

// ═══════════════════════════════════════════════════════════
// 9. EARN (passive income — best APY finder)
// ═══════════════════════════════════════════════════════════
async function earn({ symbol, amount }) {
  const asset = priceFeed.getPrice(symbol);
  if (!asset) throw new Error(`No live price for ${symbol}`);

  // Find best earning strategy for this asset
  const strategies = [];

  if (asset.lendable) {
    strategies.push({ strategy: 'LEND', protocol: 'Aave V3', apy: 0.048, risk: 'LOW', type: 'lending' });
    strategies.push({ strategy: 'LEND', protocol: 'Compound V3', apy: 0.045, risk: 'LOW', type: 'lending' });
  }
  if (asset.stakeable) {
    const sAPY = { ETH: 0.038, SOL: 0.068, BNB: 0.035, ADA: 0.035, DOT: 0.12, ATOM: 0.15 };
    strategies.push({ strategy: 'STAKE', protocol: 'Native Staking', apy: sAPY[symbol] || 0.04, risk: 'LOW', type: 'staking' });
  }
  if (asset.yieldable) {
    strategies.push({ strategy: 'YIELD', protocol: 'Uniswap V3 LP', apy: 0.08, risk: 'MEDIUM', type: 'lp' });
    strategies.push({ strategy: 'LOOP',  protocol: 'Aave Recursive', apy: 0.12, risk: 'MEDIUM', type: 'loop' });
  }

  if (!strategies.length) {
    strategies.push({ strategy: 'HOLD', protocol: 'Vault', apy: 0.0, risk: 'NONE', type: 'hold' });
  }

  // Select highest risk-adjusted APY (risk-adjusted scoring, not just highest APY)
  const best = strategies.reduce((a, b) => {
    const riskPenalty = { LOW: 0, MEDIUM: 0.01, HIGH: 0.03, NONE: 0.05 };
    const aAdj = a.apy - (riskPenalty[a.risk] || 0);
    const bAdj = b.apy - (riskPenalty[b.risk] || 0);
    return bAdj > aAdj ? b : a;
  });

  const trade = {
    id:              genTxId(),
    type:            'EARN',
    symbol,
    name:            asset.name,
    amount,
    amountUsd:       amount * asset.priceUsd,
    selectedStrategy: best,
    allStrategies:   strategies,
    estimatedDailyYieldUsd:  (amount * asset.priceUsd * best.apy) / 365,
    estimatedAnnualYieldUsd: amount * asset.priceUsd * best.apy,
    estimatedAnnualTokens:   amount * best.apy,
    timestamp:       new Date().toISOString(),
    status:          'ACTIVE',
  };

  tradeHistory.push(trade);
  return { success: true, trade };
}

// ═══════════════════════════════════════════════════════════
// 10. REWARDS (claim + auto-compound protocol rewards)
// ═══════════════════════════════════════════════════════════
async function rewards({ symbol, action = 'CLAIM' }) {
  const asset = priceFeed.getPrice(symbol);
  if (!asset) throw new Error(`No live price for ${symbol}`);

  // Protocol rewards available by asset
  const rewardMap = {
    AAVE:    { protocol: 'Aave',     tokenReward: 'AAVE',  estimatedPct: 0.02 },
    LDO:     { protocol: 'Lido',     tokenReward: 'LDO',   estimatedPct: 0.04 },
    CRV:     { protocol: 'Curve',    tokenReward: 'CRV',   estimatedPct: 0.08 },
    BAL:     { protocol: 'Balancer', tokenReward: 'BAL',   estimatedPct: 0.06 },
    JUP:     { protocol: 'Jupiter',  tokenReward: 'JUP',   estimatedPct: 0.05 },
    INJ:     { protocol: 'Injective',tokenReward: 'INJ',   estimatedPct: 0.07 },
    ATOM:    { protocol: 'Cosmos',   tokenReward: 'ATOM',  estimatedPct: 0.15 },
    DOT:     { protocol: 'Polkadot', tokenReward: 'DOT',   estimatedPct: 0.12 },
    HONEY:   { protocol: 'Hivemapper',tokenReward: 'HONEY',estimatedPct: 0.08 },
    GRT:     { protocol: 'The Graph',tokenReward: 'GRT',   estimatedPct: 0.09 },
    ENA:     { protocol: 'Ethena',   tokenReward: 'sENA',  estimatedPct: 0.27 },
    SOIL:    { protocol: 'Soil',     tokenReward: 'SOIL',  estimatedPct: 0.12 },
  };

  const reward = rewardMap[symbol] || { protocol: 'Native Protocol', tokenReward: symbol, estimatedPct: 0.03 };

  const position = activePositions.get(symbol);
  const baseAmount = position ? position.units || 1 : 1;
  const claimable  = baseAmount * reward.estimatedPct * (1 / 365); // daily accrual

  const trade = {
    id:            genTxId(),
    type:          'REWARDS',
    action,
    symbol,
    name:          asset.name,
    protocol:      reward.protocol,
    tokenReward:   reward.tokenReward,
    claimableAmount: claimable,
    claimableUsd:  claimable * asset.priceUsd,
    autoCompound:  action === 'COMPOUND',
    compoundedBack: action === 'COMPOUND' ? claimable : 0,
    timestamp:     new Date().toISOString(),
    status:        'CLAIMED',
  };

  tradeHistory.push(trade);
  return { success: true, trade };
}

// ═══════════════════════════════════════════════════════════
// AUTO-TRADING: Brain-driven execution loop
// ═══════════════════════════════════════════════════════════
let autoTradingInterval = null;

function startAutoTrading() {
  if (autoTradingInterval) return { success: false, reason: 'Already running' };
  tradingActive = true;

  // Start brain cycles if not already running
  if (!brain.running) {
    brain._startCycles();
  }

  brain.on('cycle', async (cycleData) => {
    if (!tradingActive) return;
    const risk = brain.getRiskAssessment();
    if (risk.drawdown >= CT.MAX_DRAWDOWN) {
      console.warn('🛑 [Trading] Emergency stop — drawdown limit reached');
      tradingActive = false;
      return;
    }

    // Execute top buys
    for (const signal of (cycleData.topBuys || []).slice(0, 3)) {
      if (signal.confidence >= CT.CONFIDENCE_THRESHOLD && signal.riskGate?.pass) {
        try {
          await buy({ symbol: signal.symbol, amount: 1000, portfolioValue: 100_000 });
        } catch (e) {
          console.warn(`⚠️  [AutoTrade] Buy ${signal.symbol}: ${e.message}`);
        }
      }
    }
  });

  return { success: true, message: 'Auto-trading started with risk-first management' };
}

function stopAutoTrading() {
  tradingActive = false;
  if (autoTradingInterval) { clearInterval(autoTradingInterval); autoTradingInterval = null; }
  return { success: true, message: 'Auto-trading stopped' };
}

class TradingEngine extends EventEmitter {
  constructor() {
    super();
    this.buy     = buy;
    this.sell    = sell;
    this.swap    = swap;
    this.lend    = lend;
    this.yield   = yield_;
    this.borrow  = borrow;
    this.loop    = loop;
    this.stake   = stake;
    this.multiply = multiply;
    this.earn    = earn;
    this.rewards = rewards;
    this.startAutoTrading = startAutoTrading;
    this.stopAutoTrading  = stopAutoTrading;
  }

  getHistory(limit = 50)   { return tradeHistory.slice(-limit).reverse(); }
  getPositions()           { return Array.from(activePositions.values()); }
  getTotalPnL()            { return totalPnL; }
  isActive()               { return tradingActive; }

  getStats() {
    const wins   = tradeHistory.filter(t => t.type === 'SELL' && (t.pnl || 0) > 0).length;
    const losses = tradeHistory.filter(t => t.type === 'SELL' && (t.pnl || 0) < 0).length;
    const total  = wins + losses;
    return {
      totalTrades:     tradeHistory.length,
      openPositions:   activePositions.size,
      totalPnL,
      winRate:         total > 0 ? wins / total : 0,
      wins,
      losses,
      tradingActive,
      portfolioHeat:   brain.portfolioHeat,
      drawdown:        brain.drawdown,
    };
  }
}

const tradingEngine = new TradingEngine();
module.exports = tradingEngine;
