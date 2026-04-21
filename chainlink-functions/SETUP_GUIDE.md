# Chainlink Functions Oracle — Setup Guide

This guide wires the missing link between the INQUISITIVE AI brain and the on-chain VaultV2.
Without this, the vault has signals always = 0 → `checkUpkeep()` returns false → **zero trades execute**.

## Architecture

```
 Chainlink Automation ── calls ──► OracleConsumer.performUpkeep()
                                          │
                                          ▼
                          Chainlink Functions DON (off-chain)
                                          │
                                          ▼
            HTTP GET https://getinqai.com/api/inquisitiveAI/cron/oracle
                                          │
                                          ▼ (bytes: 1 byte per asset)
                          OracleConsumer.fulfillRequest()
                                          │
                                          ▼
                          VaultV2.submitSignalsBatch(assets, signals)
                                          │
                                          ▼
                 Chainlink Automation #2 ── calls ──► VaultV2.performUpkeep()
                                          │
                                          ▼
                          Uniswap V3 swap executed on-chain
```

## Prerequisites

- Deployer wallet (Trezor or equivalent) with ETH for gas
- LINK available for Functions subscription + the two Automation upkeeps (you already have these funded)
- `MAINNET_RPC_URL` and `ETHERSCAN_API_KEY` env vars

## Step 1 — Deploy the Consumer

```bash
export MAINNET_RPC_URL="https://mainnet.infura.io/v3/<key>"
export ETHERSCAN_API_KEY="<key>"

forge script script/DeployOracleConsumer.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --trezor \
  --broadcast \
  --verify
```

Save the deployed `OracleConsumer` address. The script already calls `setTrackedAssets()` for the 17 on-chain assets in the exact order the vault has them.

## Step 2 — Create Chainlink Functions Subscription

1. Go to https://functions.chain.link → **Create Subscription** (Ethereum Mainnet)
2. Add consumer: paste the `OracleConsumer` address
3. Copy the **Subscription ID** (uint64)
4. Fund the subscription with LINK

## Step 3 — Configure the Consumer

Use Etherscan *Write Contract* as the deployer, or call via cast:

```bash
# Set subscription id
cast send $CONSUMER \
  "setSubscriptionId(uint64)" $SUB_ID \
  --rpc-url $MAINNET_RPC_URL --trezor

# Set Functions JavaScript source (one-liner it from source.js)
SRC=$(cat chainlink-functions/source.js)
cast send $CONSUMER \
  "setSource(string)" "$SRC" \
  --rpc-url $MAINNET_RPC_URL --trezor

# Verify readiness
cast call $CONSUMER "isReady()(bool,string)" --rpc-url $MAINNET_RPC_URL
```

## Step 4 — Register Consumer with Chainlink Automation

1. Go to https://automation.chain.link/mainnet → **Register New Upkeep**
2. Trigger: **Custom Logic**
3. Target contract: `OracleConsumer` address
4. Gas limit: `500000`
5. Check data: `0x`
6. Fund with LINK
7. The upkeep polls `checkUpkeep()` on the consumer and calls `performUpkeep()` every 10 minutes, which triggers a new Functions request.

## Step 5 — Authorize Consumer on the Vault

The vault's `aiOracle` must be the consumer so `submitSignalsBatch()` is accepted:

```bash
cast send 0xb99dc519c4373e5017222bbd46f42a4e12a0ec25 \
  "setAIOracle(address)" $CONSUMER \
  --rpc-url $MAINNET_RPC_URL --trezor
```

## Step 6 — Register Vault with Chainlink Automation (if not already)

1. Go to https://automation.chain.link/mainnet → **Register New Upkeep**
2. Trigger: **Custom Logic**
3. Target contract: `0xb99dc519c4373e5017222bbd46f42a4e12a0ec25` (VaultV2)
4. Gas limit: `500000`
5. Check data: `0x`
6. Fund with LINK

## Step 7 — Smoke Test

Manually trigger one Functions request from the deployer:

```bash
cast send $CONSUMER "requestSignals()" --rpc-url $MAINNET_RPC_URL --trezor
```

Then wait 1–2 minutes and inspect events:

```bash
# Last request id
cast call $CONSUMER "lastRequestId()(bytes32)" --rpc-url $MAINNET_RPC_URL

# Last successful fulfill timestamp (non-zero = success)
cast call $CONSUMER "lastFulfillTime()(uint256)" --rpc-url $MAINNET_RPC_URL

# Last error (should be 0x if healthy)
cast call $CONSUMER "lastError()(bytes)" --rpc-url $MAINNET_RPC_URL

# Signal on WBTC (0=HOLD, 1=BUY, 2=SELL)
cast call 0xb99dc519c4373e5017222bbd46f42a4e12a0ec25 \
  "getSignal(address)(uint8,uint256)" \
  0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599 \
  --rpc-url $MAINNET_RPC_URL
```

Within 2–5 minutes after signals are submitted, Chainlink Automation will call `performUpkeep()` on the vault and execute the first on-chain Uniswap V3 swap.

Verify with:
```bash
cast call 0xb99dc519c4373e5017222bbd46f42a4e12a0ec25 \
  "totalTrades()(uint256)" --rpc-url $MAINNET_RPC_URL
```

## Maintenance

- **LINK drain monitoring**: Functions + Automation subscriptions drain over time. Set a balance-low alert at functions.chain.link and automation.chain.link.
- **Source updates**: To change the Functions JavaScript (e.g., adjust asset list), call `setSource()` and `setTrackedAssets()` with matching order. Updates take effect on the next Automation-triggered request.
- **Asset changes**: If you add/remove assets on the vault, update both:
  1. `vault.addTrackedAsset` / `removeTrackedAsset` — on-chain portfolio
  2. `consumer.setTrackedAssets` + `consumer.setSource` — keep order synced with `TRACKED_SYMBOLS` in `source.js`

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `checkUpkeep` on consumer returns false | `source` empty or `subscriptionId=0` | Re-run Step 3 |
| Functions request sent but `lastError` non-empty | JavaScript syntax error or DON fetch failed | Test source locally with `npx @chainlink/functions-toolkit simulate` |
| `SignalsFulfilled` events fire but vault `totalTrades` still 0 | Vault automation not active | Check upkeep status at automation.chain.link |
| Vault reverts `"Only AI oracle"` | `aiOracle` still points to deployer | Re-run Step 5 |
| `length mismatch` in `RequestErrored` | `trackedAssets` count ≠ `TRACKED_SYMBOLS` count | Make both lists identical and same order |
