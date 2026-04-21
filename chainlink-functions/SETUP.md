# Chainlink Functions Oracle — Setup

Wires the AI brain (off-chain) to VaultV2 (on-chain) with **zero private keys**.

Without this, `tradingSignals[asset]` stays 0 → `checkUpkeep()` returns false → no trades ever fire.

## Flow

```
Chainlink Automation → OracleConsumer.performUpkeep()
        → Chainlink Functions DON → GET /api/inquisitiveAI/cron/oracle
        → OracleConsumer.fulfillRequest() → vault.submitSignalsBatch()
Chainlink Automation → vault.performUpkeep() → Uniswap V3 swap
```

## Deploy

```bash
export MAINNET_RPC_URL="https://mainnet.infura.io/v3/<key>"
export ETHERSCAN_API_KEY="<key>"
forge script script/DeployOracleConsumer.s.sol --rpc-url $MAINNET_RPC_URL --trezor --broadcast --verify
```

Script calls `setTrackedAssets()` for the 30 ETH-mainnet assets in the order that matches `source.js`.

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
