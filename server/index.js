'use strict';
require('dotenv').config();
const crypto = require('crypto');

const REQUIRED_ENV = [
  'NODE_ENV',
  'MAINNET_RPC_URL',
  'INQUISITIVE_VAULT_ADDRESS',
  'INQAI_TOKEN_ADDRESS',
  'OPERATOR_PRIVATE_KEY',
  'WS_API_KEY',
  'RATE_LIMIT_SALT',
  'CORS_ORIGINS',
  'ALPHA_VANTAGE_API_KEY',
];
const missing = REQUIRED_ENV.filter(k => !process.env[k] || /^replace_with|^change_me/i.test(process.env[k]));
if (missing.length) {
  console.error(`FATAL: missing or placeholder env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const express     = require('express');
const helmet      = require('helmet');
const compression = require('compression');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const { createServer } = require('http');
const pino        = require('pino');
const pinoHttp    = require('pino-http');

const db            = require('./services/db');
const priceFeed     = require('./services/priceFeed');
const macroData     = require('./services/macroData');
const ohlcFeed      = require('./services/ohlcFeed');
const brain         = require('./services/inquisitiveBrain');
const tradingEngine = require('./services/tradingEngine');
const vaultOracle   = require('./services/vaultOracle');
const routes        = require('./routes/inquisitiveAI');
const { initWsServer, broadcast } = require('./services/wsServer');

const log = pino({ name: 'server', level: process.env.LOG_LEVEL || 'info' });
const app = express();
const server = createServer(app);
const PORT = Number(process.env.PORT) || 3002;

const state = { ready: false, stage: 'booting', bootedAt: null, errors: [] };

const origins = process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
if (origins.includes('*')) throw new Error('CORS_ORIGINS="*" is forbidden in production');

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { useDefaults: true, directives: {
  'default-src': ["'self'"],
  'connect-src': ["'self'", ...origins, 'ws:', 'wss:'],
  'img-src':     ["'self'", 'data:'],
}}}));
app.use(compression());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '128kb' }));
app.use(pinoHttp({ logger: log, redact: ['req.headers.authorization'] }));

const hashIp = (req) => crypto.createHash('sha256')
  .update((req.ip || '') + process.env.RATE_LIMIT_SALT).digest('hex');
app.use('/api/', rateLimit({
  windowMs: 60_000, max: 120, keyGenerator: hashIp, standardHeaders: true, legacyHeaders: false,
}));

// Readiness gate
app.use('/api/', (req, res, next) => {
  if (state.ready || req.path === '/health') return next();
  res.status(503).json({ error: 'not_ready', stage: state.stage });
});

app.get('/health', (_req, res) => {
  res.status(state.ready ? 200 : 503).json({
    ready: state.ready,
    stage: state.stage,
    bootedAt: state.bootedAt,
    prices: { fresh: priceFeed.isReady(), lastGoodFetchAt: priceFeed.lastGoodFetchAt },
    ohlc:   { btcSample: ohlcFeed.get('BTC', '15m', 1).length },
    trading: tradingEngine.status(),
    vault: vaultOracle.get(),
    uptimeSec: process.uptime(),
  });
});

app.use('/api', routes);

app.use((err, _req, res, _next) => {
  log.error({ err: err.message, stack: err.stack }, 'unhandled route error');
  res.status(500).json({ error: 'internal_error' });
});

async function boot() {
  try {
    state.stage = 'db';           db.init();
    state.stage = 'priceFeed';    await priceFeed.initialize();
    state.stage = 'ohlcFeed';     await ohlcFeed.initialize();
    if (process.env.OHLC_STREAM === 'true') ohlcFeed.enableStream();
    state.stage = 'macroData';    await macroData.initialize();
    state.stage = 'vaultOracle';  await vaultOracle.initialize();
    state.stage = 'wsServer';     initWsServer(server);

    priceFeed.on('prices:update', (meta) => broadcast('prices', { meta, prices: priceFeed.getAll() }));
    tradingEngine.on('tx:submitted', (p) => broadcast('trade', { status: 'pending', ...p }));
    tradingEngine.on('tx:confirmed', (p) => broadcast('trade', { status: 'confirmed', ...p }));
    tradingEngine.on('tx:reverted',  (p) => broadcast('trade', { status: 'reverted',  ...p }));

    state.stage = 'listening';
    await new Promise((r) => server.listen(PORT, r));
    log.info({ port: PORT, origins }, 'HTTP + WS listening');

    if (process.env.AUTO_START_TRADING === 'true') {
      state.stage = 'tradingEngine';
      await tradingEngine.start();
    }

    state.ready = true;
    state.stage = 'ready';
    state.bootedAt = new Date().toISOString();
    log.info('server ready');
  } catch (err) {
    log.fatal({ err: err.message, stack: err.stack }, `boot failed at stage=${state.stage}`);
    state.errors.push({ stage: state.stage, msg: err.message });
    try { await new Promise((r) => server.listen(PORT, r)); } catch {}
    state.ready = false;
  }
}

function shutdown(signal) {
  log.warn({ signal }, 'shutting down');
  state.ready = false;
  tradingEngine.stop().catch(() => {});
  priceFeed.shutdown?.();
  ohlcFeed.shutdown?.();
  macroData.shutdown?.();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 15_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  (e) => { log.fatal({ err: e.message, stack: e.stack }, 'uncaughtException'); shutdown('uncaughtException'); });
process.on('unhandledRejection', (e) => { log.fatal({ err: String(e) }, 'unhandledRejection'); shutdown('unhandledRejection'); });

boot();

module.exports = { app, server, state };
