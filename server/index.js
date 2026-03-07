'use strict';
// ============================================================
// INQUISITIVE AI — MAIN SERVER
// Backend: Express + WebSocket + Real Live Data
// ============================================================
require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');

const priceFeed     = require('./services/priceFeed');
const macroData     = require('./services/macroData');
const brain         = require('./services/inquisitiveBrain');
const tradingEngine = require('./services/tradingEngine');
const inquisitiveAI = require('./routes/inquisitiveAI');

const app  = express();
const PORT = process.env.PORT || 3002;

// ── Security ─────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      scriptSrc:  ["'self'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
    },
  },
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://inquisitive.ai', 'https://www.inquisitive.ai']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:    'healthy',
    service:   'INQUISITIVE · INQAI',
    version:   '1.0.0',
    uptime:    process.uptime(),
    prices:    priceFeed.getStatus(),
    macro:     macroData.getStatus(),
    brain:     brain.getStatus(),
    trading:   tradingEngine.getStats(),
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────
app.use('/api/inquisitiveAI', inquisitiveAI);

// ── Root ──────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name:    'INQUISITIVE Agent API',
    ticker:  'INQAI',
    version: '1.0.0',
    status:  'LIVE — REAL DATA ONLY',
    endpoints: {
      status:    'GET  /api/inquisitiveAI/status',
      assets:    'GET  /api/inquisitiveAI/assets',
      dashboard: 'GET  /api/inquisitiveAI/dashboard',
      analyze:   'GET  /api/inquisitiveAI/analyze/:symbol',
      signals:   'GET  /api/inquisitiveAI/signals',
      macro:     'GET  /api/inquisitiveAI/macro',
      prices:    'GET  /api/inquisitiveAI/prices',
      positions: 'GET  /api/inquisitiveAI/portfolio/positions',
      history:   'GET  /api/inquisitiveAI/portfolio/history',
      init:      'POST /api/inquisitiveAI/initialize',
      trade:     'POST /api/inquisitiveAI/trade',
      start:     'POST /api/inquisitiveAI/trading/start',
      stop:      'POST /api/inquisitiveAI/trading/stop',
    },
    dataSources: ['CoinGecko', 'Yahoo Finance', 'Alternative.me Fear & Greed'],
    aiEngines:   ['Pattern Engine', 'Reasoning Engine', 'Portfolio Engine', 'Learning Engine', 'Risk Engine'],
    timestamp:   new Date().toISOString(),
  });
});

// ── 404 ────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// ── Error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

// ── HTTP + WebSocket ──────────────────────────────────────
const server = createServer(app);
const wss    = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('🔌 [WS] Client connected');
  ws.send(JSON.stringify({ type: 'connected', message: 'INQUISITIVE WebSocket — REAL LIVE DATA', timestamp: new Date().toISOString() }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
    } catch {}
  });

  ws.on('close', () => console.log('🔌 [WS] Client disconnected'));
  ws.on('error', (e) => console.error('❌ [WS] Error:', e.message));
});

// Broadcast real-time price + signal updates to all WS clients
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  wss.clients.forEach(ws => {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  });
}

// Listen for brain cycles and price updates
brain.on('cycle', (cycleData) => {
  broadcast('brainCycle', {
    cycleCount:  cycleData.cycleCount,
    regime:      cycleData.regime,
    topBuys:     cycleData.topBuys?.slice(0, 5),
    fearGreed:   cycleData.fearGreed,
  });
});

priceFeed.on('update', (prices) => {
  // Send top 20 assets to keep WS message size reasonable
  const top20 = Object.values(prices).slice(0, 20).map(p => ({
    symbol: p.symbol, price: p.priceUsd, change24h: p.change24h, volume24h: p.volume24h,
  }));
  broadcast('priceUpdate', { count: Object.keys(prices).length, sample: top20 });
});

macroData.on('update', (summary) => {
  broadcast('macroUpdate', { regime: summary.regime?.regime, fearGreed: summary.fearGreed });
});

// ── Bootstrap all services then start ─────────────────────
async function bootstrap() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║            INQUISITIVE · INQAI TOKEN SYSTEM               ║');
  console.log('║  The World\'s Most Advanced AI Crypto Trading Agent       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('🧠 Engines: Pattern | Reasoning | Portfolio | Learning | Risk');
  console.log('🛡️ Risk Engine: Risk-first execution gate');
  console.log('📈 65 Assets: Full portfolio automated management');
  console.log('⚡ Functions: Buy | Sell | Swap | Lend | Yield | Borrow | Loop | Stake | Multiply | Earn | Rewards');
  console.log('');

  console.log('📊 [Boot] Starting price feed (CoinGecko REAL LIVE API)…');
  await priceFeed.initialize();

  console.log('📈 [Boot] Starting macro data (Yahoo Finance + Alternative.me REAL LIVE)…');
  await macroData.initialize();

  console.log('🧠 [Boot] Starting AI Brain (8-second decision cycles)…');
  await brain.initialize();

  server.listen(PORT, () => {
    console.log('');
    console.log(`✅ INQUISITIVE backend running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log(`📡 API: http://localhost:${PORT}/api/inquisitiveAI/status`);
    console.log('');
    console.log('🚀 REAL LIVE DATA ONLY — NO MOCK DATA — READY FOR LAUNCH');
    console.log('');
  });
}

bootstrap().catch(err => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT',  () => { server.close(() => process.exit(0)); });

module.exports = { app, server, broadcast };
