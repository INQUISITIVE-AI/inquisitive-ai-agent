// ─── INQUISITIVE Chainlink Functions Source ─────────────────────────────────
// Runs in a secure Chainlink DON off-chain runtime.
// Fetches AI signals from the INQUISITIVE oracle API and returns them as
// raw bytes (one byte per tracked asset: 0=HOLD, 1=BUY, 2=SELL).
//
// Output order MUST match InquisitiveOracleConsumer.trackedAssets order,
// which in turn matches the vault's on-chain tracked asset list.
// ─────────────────────────────────────────────────────────────────────────────

// Brain symbol for each tracked on-chain asset (indexed 0..16).
// Index 2 maps stETH -> ETH (same underlying, ~100% correlated).
const TRACKED_SYMBOLS = [
  "BTC",   // [0]  WBTC   0x2260FAC5...2C599
  "ETH",   // [1]  WETH   0xC02aaA39...56Cc2
  "ETH",   // [2]  stETH  0xae7ab965...7fE84
  "USDC",  // [3]  USDC   0xA0b86991...6eB48
  "LINK",  // [4]  LINK   0x51491077...86CA
  "UNI",   // [5]  UNI    0x1f9840a8...F984
  "LDO",   // [6]  LDO    0x5A98FcBE...1B32
  "GRT",   // [7]  GRT    0xc944E90C...44a7
  "ARB",   // [8]  ARB    0xB50721BC...4ad1
  "ENA",   // [9]  ENA    0x57e114B6...6061
  "ONDO",  // [10] ONDO   0xfAbA6f8E...9BE3
  "MKR",   // [11] MKR    0x9f8F72aA...79A2
  "ENS",   // [12] ENS    0xC1836021...9D72
  "COMP",  // [13] COMP   0xc00e94Cb...6888
  "CRV",   // [14] CRV    0xD533a949...cd52
  "CVX",   // [15] CVX    0x4e3FBD56...9D2B
  "BAL",   // [16] BAL    0xba100000...4E3D
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
// Server mapping: BUY=1, SELL/REDUCE=2, HOLD/SKIP=0.
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
// and `response[i]` == signal for trackedAssets[i].
return out;
