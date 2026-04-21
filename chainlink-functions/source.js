// ─── INQUISITIVE Chainlink Functions Source ─────────────────────────────────
// Runs in a secure Chainlink DON off-chain runtime.
// Fetches AI signals from the INQUISITIVE oracle API and returns them as
// raw bytes (one byte per tracked asset: 0=HOLD, 1=BUY, 2=SELL).
//
// Output order MUST match the InquisitiveOracleConsumer.trackedAssets order.
// ─────────────────────────────────────────────────────────────────────────────

// The exact, ordered list of asset symbols the consumer expects signals for.
// IMPORTANT: Keep this in lockstep with InquisitiveOracleConsumer.trackedAssets.
const TRACKED_SYMBOLS = [
  "BTC",  "ETH",  "USDC", "LINK", "UNI",  "AAVE", "LDO",  "GRT",
  "ARB",  "ENA",  "POL",  "SKY",  "FET",  "RNDR", "INJ",  "PAXG",
  "ONDO", "QNT",  "ZRO",  "CHZ",  "ACH",  "STRK", "DBR",  "XSGD",
  "BRZ",  "JPYC", "OP",   "FIL",  "BNB",  "AVAX"
];

// Call the INQUISITIVE oracle API (computes 5-engine AI scores server-side).
const response = await Functions.makeHttpRequest({
  url: "https://getinqai.com/api/inquisitiveAI/cron/oracle",
  method: "GET",
  timeout: 9000,
  headers: { "Accept": "application/json" },
});

if (response.error) {
  throw Error("Oracle API request failed: " + (response.error.message || "unknown"));
}

const body = response.data;
if (!body || !body.success || !Array.isArray(body.signals)) {
  throw Error("Oracle API returned malformed response");
}

// Build symbol -> signal map from the API response.
// SIGNAL_MAP (server-side): BUY=1, SELL/REDUCE=2, HOLD/SKIP=0
const signalBySymbol = Object.create(null);
for (const s of body.signals) {
  if (typeof s.symbol === "string") {
    const v = Number(s.signal);
    signalBySymbol[s.symbol] = (v === 1 || v === 2) ? v : 0;
  }
}

// Build ordered output buffer: one byte per tracked asset.
const out = new Uint8Array(TRACKED_SYMBOLS.length);
for (let i = 0; i < TRACKED_SYMBOLS.length; i++) {
  const sym = TRACKED_SYMBOLS[i];
  out[i] = signalBySymbol[sym] !== undefined ? signalBySymbol[sym] : 0;
}

// Return raw bytes. The consumer decodes `response.length == trackedAssets.length`
// with `response[i]` == signal for trackedAssets[i].
return out;
