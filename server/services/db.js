'use strict';
// ============================================================
// INQUISITIVE AI — Persistent store (SQLite via better-sqlite3)
// Tables: trades, vault_upkeep_events, engine_runs
// ============================================================
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const pino = require('pino');

const log = pino({ name: 'db', level: process.env.LOG_LEVEL || 'info' });

const DB_URL = process.env.DATABASE_URL || 'file:./data/inquisitive.db';
const DB_PATH = DB_URL.replace(/^file:/, '');

let db = null;

function init() {
  if (db) return db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      hash              TEXT PRIMARY KEY,
      type              TEXT NOT NULL,
      signals           TEXT,
      status            TEXT NOT NULL,
      block_number      INTEGER,
      gas_used          TEXT,
      submitted_at      INTEGER NOT NULL,
      confirmed_at      INTEGER,
      error_message     TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_trades_submitted_at ON trades(submitted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_trades_status       ON trades(status);

    CREATE TABLE IF NOT EXISTS vault_upkeep_events (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      upkeep_id         TEXT,
      success           INTEGER NOT NULL,
      total_payment     TEXT,
      gas_used          TEXT,
      tx_hash           TEXT,
      block_number      INTEGER,
      observed_at       INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS engine_runs (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      run_at            INTEGER NOT NULL,
      signals_count     INTEGER,
      actionable_count  INTEGER,
      tx_hash           TEXT
    );
  `);
  log.info({ path: DB_PATH }, 'db initialized');
  return db;
}

function insertTrade({ hash, type, signals, status, submittedAt, errorMessage = null }) {
  if (!db) init();
  db.prepare(`INSERT OR REPLACE INTO trades (hash,type,signals,status,submitted_at,error_message)
              VALUES (?,?,?,?,?,?)`)
    .run(hash, type, signals, status, submittedAt, errorMessage);
}

function updateTradeStatus(hash, status, blockNumber, gasUsed, errorMessage = null) {
  if (!db) init();
  db.prepare(`UPDATE trades SET status=?, block_number=?, gas_used=?, confirmed_at=?, error_message=?
              WHERE hash=?`)
    .run(status, blockNumber || null, gasUsed || null, Date.now(), errorMessage, hash);
}

function listRecentTrades(limit = 100) {
  if (!db) init();
  return db.prepare(`SELECT * FROM trades ORDER BY submitted_at DESC LIMIT ?`).all(limit);
}

function recordUpkeepEvent(ev) {
  if (!db) init();
  db.prepare(`INSERT INTO vault_upkeep_events
    (upkeep_id,success,total_payment,gas_used,tx_hash,block_number,observed_at)
    VALUES (?,?,?,?,?,?,?)`)
    .run(ev.upkeepId || null, ev.success ? 1 : 0, ev.totalPayment || null,
         ev.gasUsed || null, ev.txHash || null, ev.blockNumber || null, Date.now());
}

function recordEngineRun(signalsCount, actionableCount, txHash) {
  if (!db) init();
  db.prepare(`INSERT INTO engine_runs (run_at,signals_count,actionable_count,tx_hash)
              VALUES (?,?,?,?)`)
    .run(Date.now(), signalsCount, actionableCount, txHash || null);
}

module.exports = { init, insertTrade, updateTradeStatus, listRecentTrades, recordUpkeepEvent, recordEngineRun };
