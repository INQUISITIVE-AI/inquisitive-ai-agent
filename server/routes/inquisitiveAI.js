'use strict';
const express = require('express');
const router = express.Router();

const priceFeed      = require('../services/priceFeed');
const macroData      = require('../services/macroData');
const ohlcFeed       = require('../services/ohlcFeed');
const brain          = require('../services/inquisitiveBrain');
const tradingEngine  = require('../services/tradingEngine');
const vaultOracle    = require('../services/vaultOracle');
const { issueTicket } = require('../services/wsServer');

// Simple bearer auth for write routes using WS_API_KEY as the ops token.
function opsAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/);
  if (!m || m[1] !== process.env.WS_API_KEY) return res.status(401).json({ error: 'unauthorized' });
  next();
}

router.get('/prices',              (_req, res) => res.json(priceFeed.getAll()));
router.get('/prices/:symbol',      (req, res) => {
  const p = priceFeed.get(req.params.symbol);
  return p ? res.json(p) : res.status(404).json({ error: 'not_found' });
});
router.get('/macro',               (_req, res) => res.json(macroData.get()));
router.get('/ohlc/:symbol',        (req, res) => {
  const iv = req.query.interval || '15m';
  const n  = Math.min(Number(req.query.limit) || 200, 500);
  res.json(ohlcFeed.get(req.params.symbol, iv, n));
});
router.get('/signals',             async (_req, res, next) => {
  try { res.json(await brain.scoreAll()); } catch (e) { next(e); }
});
router.get('/vault/state',         (_req, res) => res.json(vaultOracle.get()));
router.get('/trading/status',      (_req, res) => res.json(tradingEngine.status()));
router.get('/trading/history',     (req, res) => res.json(tradingEngine.history(Number(req.query.limit) || 100)));

router.post('/trading/start',      opsAuth, async (_req, res, next) => {
  try { res.json(await tradingEngine.start()); } catch (e) { next(e); }
});
router.post('/trading/stop',       opsAuth, async (_req, res, next) => {
  try { res.json(await tradingEngine.stop()); } catch (e) { next(e); }
});

router.get('/auth/ws-ticket',      (_req, res) => {
  res.json({ ticket: issueTicket(), ttlSeconds: Number(process.env.WS_TICKET_TTL_SECONDS || 60) });
});

module.exports = router;
