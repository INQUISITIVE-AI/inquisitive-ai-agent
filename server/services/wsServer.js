'use strict';
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const pino = require('pino');
const log = pino({ name: 'ws', level: process.env.LOG_LEVEL || 'info' });

const TICKETS = new Map();
const TTL = Number(process.env.WS_TICKET_TTL_SECONDS || 60) * 1000;

function issueTicket() {
  const t = crypto.randomBytes(16).toString('hex');
  TICKETS.set(t, Date.now() + TTL);
  return t;
}
function verifyTicket(t) {
  const exp = TICKETS.get(t);
  if (!exp) return false;
  if (exp < Date.now()) { TICKETS.delete(t); return false; }
  TICKETS.delete(t);
  return true;
}

let wss = null;
function initWsServer(httpServer) {
  wss = new WebSocketServer({ noServer: true, path: '/ws' });
  httpServer.on('upgrade', (req, socket, head) => {
    if (!req.url.startsWith('/ws')) return;
    const url = new URL(req.url, 'http://x');
    const ticket = url.searchParams.get('ticket');
    if (!ticket || !verifyTicket(ticket)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); socket.destroy(); return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });
  wss.on('connection', (ws) => {
    ws.on('error', (e) => log.warn({ err: e.message }, 'ws error'));
  });
  log.info('ws server ready at /ws');
}

function broadcast(type, payload) {
  if (!wss) return;
  const msg = JSON.stringify({ type, payload, at: Date.now() });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

module.exports = { initWsServer, broadcast, issueTicket };
