# AI → On-Chain Signal Bridge — Setup

Wires the AI brain (off-chain) to `InquisitiveVaultV2` (on-chain). Without
this, `tradingSignals[asset]` stays 0 → `checkUpkeep()` returns false → no
trades ever fire.

Two paths, pick one:

| Path | Complexity | Trust model | When to use |
|---|---|---|---|
| **A. Vercel Cron + bot wallet** (recommended) | 4 clicks | You trust Vercel's env-var encryption | Fastest unblock, no Foundry |
| **B. Chainlink Functions OracleConsumer** | Full forge deploy + Functions + Automation | Fully decentralized DON | Long-term production |

Both are supported in this repo and can coexist — if you set both up, whichever
submits first wins the cooldown, and the other becomes a no-op.

---

## Path A — Vercel Cron (4 clicks, ~5 minutes)

### 1. Generate a bot wallet (30 seconds)

Open **https://getinqai.com/bot-wallet** — a keypair is generated locally in
your browser (nothing leaves the tab). Copy both the address and the private
key.

### 2. Add env vars to Vercel (60 seconds)

In the Vercel dashboard → your project → Settings → Environment Variables:

| Name | Value | Scope |
|---|---|---|
| `INQUISITIVE_BOT_PRIVATE_KEY` | *the 0x-prefixed 64-hex key from step 1* | Production |
| `CRON_SECRET` | *any random string — `openssl rand -hex 32`* | Production |
| `MAINNET_RPC_URL` | `https://mainnet.infura.io/v3/<yours>` | Production |

Then click **Deployments → Redeploy** on the latest production deployment so
the cron job picks up the new env vars.

### 3. Point the vault at the bot (one Trezor TX)

Open **https://getinqai.com/vault-setup.html** → card 8 → paste the bot address →
click **Use this for setAIOracle →**, scroll to card 3, click
`setAIOracle(address)`, confirm on your Trezor.

### 4. Fund the bot with 0.01 ETH (one Trezor TX)

Card 8 → **Send 0.01 ETH to bot**. Covers ~100 hourly cron runs at ~5 gwei.

Done. The Vercel Cron at `/api/inquisitiveAI/cron/submit-signals` runs at
`:17 past every hour`, calls `submitSignalsBatch()` with live signals, and
Chainlink Automation's existing upkeep on the vault executes the swaps.

Verify anytime by hitting the endpoint manually:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://getinqai.com/api/inquisitiveAI/cron/submit-signals
```
A success response includes `txHash`, `blockNumber`, and
`submitted: { buys, sells, holds }`.

---

## Path B — Chainlink Functions OracleConsumer (full decentralization)

### Deploy

```bash
export MAINNET_RPC_URL="https://mainnet.infura.io/v3/<key>"
export ETHERSCAN_API_KEY="<key>"
forge script script/DeployOracleConsumer.s.sol --rpc-url $MAINNET_RPC_URL --trezor --broadcast --verify
```

Script calls `setTrackedAssets()` for the 17 ETH-mainnet assets in the order
that matches `source.js`.

## Wire

1. **Create Functions subscription** at https://functions.chain.link → add the deployed consumer.
2. **Upload the source**:
   ```bash
   SRC=$(cat chainlink-functions/source.js)
   cast send $CONSUMER "setSubscriptionId(uint64)" $SUB_ID --rpc-url $MAINNET_RPC_URL --trezor
   cast send $CONSUMER "setSource(string)" "$SRC" --rpc-url $MAINNET_RPC_URL --trezor
   ```
3. **Register the consumer** with Chainlink Automation (Custom Logic) at https://automation.chain.link/mainnet.
4. **Authorize on the vault**:
   ```bash
   cast send 0xb99dc519c4373e5017222bbd46f42a4e12a0ec25 "setAIOracle(address)" $CONSUMER --rpc-url $MAINNET_RPC_URL --trezor
   ```
5. **Register the vault** with Chainlink Automation (Custom Logic) if not already.

## Verify

```bash
cast call $CONSUMER "isReady()(bool,string)" --rpc-url $MAINNET_RPC_URL
cast send $CONSUMER "requestSignals()" --rpc-url $MAINNET_RPC_URL --trezor
# wait ~2 min
cast call $CONSUMER "lastFulfillTime()(uint256)" --rpc-url $MAINNET_RPC_URL
cast call 0xb99dc519c4373e5017222bbd46f42a4e12a0ec25 "totalTrades()(uint256)" --rpc-url $MAINNET_RPC_URL
```

## Troubleshoot

| Symptom | Cause | Fix |
|---|---|---|
| `checkUpkeep` returns false on consumer | source empty or subscriptionId=0 | re-run Wire step 2 |
| `lastError` non-empty on consumer | JS error or DON fetch failed | test with `npx @chainlink/functions-toolkit simulate` |
| `SignalsFulfilled` fires but `totalTrades` still 0 | vault automation not triggering | check upkeep status at automation.chain.link |
| Vault reverts `"Only AI oracle"` | aiOracle still = deployer | re-run Wire step 4 |
| `length mismatch` error | `trackedAssets` count ≠ `TRACKED_SYMBOLS` | keep `source.js` and `DeployOracleConsumer.s.sol` in lockstep |
