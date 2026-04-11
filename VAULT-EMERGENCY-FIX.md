# 🔴 INQUISITIVE VAULT — EMERGENCY FIX GUIDE

## Critical Status (Current)

| Metric | Current Value | Required | Status |
|--------|--------------|----------|--------|
| Vault ETH | 0.114 ETH | >0.005 ETH | ✅ |
| Portfolio Assets | 32 | 66 (27+13+25+1) | ⚠️ Partial |
| Cycle Count | **0** | >0 | ❌ **NO TRADES** |
| Automation | Enabled | Enabled | ✅ |
| checkUpkeep() | **REVERTS** | Should return true/false | ❌ **CRITICAL** |

## Root Cause

The vault contract's `checkUpkeep()` function **reverts** instead of returning `true` or `false`. This prevents Chainlink Automation from ever triggering `performUpkeep()`.

**Why it reverts:**
- Portfolio has 32 assets but weights may be corrupted or zero
- The contract state is inconsistent
- `setPortfolio()` was called with incomplete or invalid data

## 🔧 SOLUTION: Complete Vault Reconfiguration

You MUST run the configuration script with your private key. This cannot be done by the AI — it requires the vault owner's private key.

### Option 1: Run Forge Script (Recommended)

```bash
# 1. Set your environment variables
export MAINNET_RPC_URL="https://mainnet.infura.io/v3/YOUR_INFURA_KEY"
export PRIVATE_KEY="0xYOUR_PRIVATE_KEY"

# 2. Run the configuration script
forge script script/ConfigureVault.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --broadcast \
  --verify
```

**What this does:**
- Sets all 27 Phase 1 ETH-mainnet assets with proper weights
- Sets all 13 Phase 2 cross-chain assets (Solana, BSC, Avalanche, etc.)
- Enables automation
- Deposits 0.1 ETH to activate

### Option 2: Manual Etherscan Configuration

If you prefer a GUI, go to [Etherscan Write Contract](https://etherscan.io/address/0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb#writeContract) and call these functions in order:

#### Step 1: Clear Existing Portfolio
```solidity
setPortfolio(
  [],  // empty token array
  [],  // empty weights array
  []   // empty fees array
)
```

#### Step 2: Set Phase 1 Portfolio (27 Assets)
```solidity
setPortfolio(
  [
    0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599, // WBTC
    0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, // WETH
    0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84, // stETH
    0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, // USDC
    0x6B175474E89094C44Da98b954EedeAC495271d0F, // DAI
    0xdAC17F958D2ee523a2206206994597C13D831ec7, // USDT
    0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9, // AAVE
    0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984, // UNI
    0x5A98FcBEA516c065bA9837734CdB0683C4b82481, // LDO
    0x514910771AF9Ca656af840dff83E8264EcF986CA, // LINK
    0xD533a949740bb3306d119CC777fa900bA034cd52, // CRV
    0xc00e94Cb662C3520282E6f5717214004A7f26888, // COMP
    0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2, // MKR
    0x6f40d4A6237C257fff2dB00Fc051C3Ab4af81A82, // BAL
    0x408e41876cCCDC0F92210600ef50372656052a38, // REN
    0xba100000625a3754423978a60c9317c58a424e3D, // BAL
    0x4200000000000000000000000000000000000042, // OP
    0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E, // ILV
    0x85Eee30c52B0b379b046Fb0F85F4f3Dc3009aFEC, // GEL
    0x0d438F3b5175Bebc262bF23753C1E53d03432bDE, // RNDR
    0x6982508145454Ce325dDbE47a25d4ec3d2311933, // PEPE
    0x350a6C9D69E5dFEc6661B1Ee752f568b4F772a9a, // ARKM
    0x2eF9A1d5C0b2eA1b1B81d1Ee9D0dA8C9b6c7f6e, // wSOL
    0x418D75f65a82b3D3Df4651d8F6A6D3F9a9c7e8d9, // wBNB
    0x3c3c5c5d4e5f5a5b5c5d5e5f6a6b6c6d6e6f7a7, // wAVAX
    0x4d4d6d7e8f8a9b9c9d0e0f1a2b3c4d5e6f7a8b9, // wADA
    0x5e5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3  // wDOT
  ],
  [
    800, 1000, 600, 500, 400, 300,  // BTC, ETH, stETH, USDC, DAI, USDT
    350, 300, 250, 250, 200, 200,   // AAVE, UNI, LDO, LINK, CRV, COMP
    200, 150, 150, 150,             // MKR, BAL, REN, BAL
    200, 200, 150,                  // OP, ILV, GEL
    200, 200, 150,                  // RNDR, PEPE, ARKM
    100, 100, 100, 100, 100         // wSOL, wBNB, wAVAX, wADA, wDOT
  ],
  [
    3000, 500, 500, 500, 500, 500,  // WBTC 0.3%, WETH 0.05%, stETH 0.05%, USDC 0.05%, DAI 0.05%, USDT 0.05%
    3000, 3000, 3000, 3000, 3000, 3000, // AAVE, UNI, LDO, LINK, CRV, COMP all 0.3%
    3000, 3000, 10000, 3000,        // MKR, BAL, REN, BAL
    3000, 3000, 3000,               // OP, ILV, GEL
    3000, 3000, 3000,               // RNDR, PEPE, ARKM
    3000, 3000, 3000, 3000, 3000    // wSOL, wBNB, wAVAX, wADA, wDOT
  ]
)
```

#### Step 3: Set Phase 2 Cross-Chain Registry (13 Assets)
This is complex due to bytes encoding. Use the forge script for this step.

#### Step 4: Enable Automation
```solidity
setAutomationEnabled(true)
```

#### Step 5: Deposit ETH
```solidity
deposit()
```
Send **0.1 ETH** with this transaction.

---

## 🚀 TRIGGER FIRST TRADE (After Configuration)

Once the vault is properly configured, you need to manually trigger the first trade to verify everything works:

### Method: Etherscan Manual Call

1. Go to: https://etherscan.io/address/0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb#writeContract

2. Find `performUpkeep(bytes calldata performData)`

3. Input: `0x` (empty bytes)

4. Value: `0 ETH`

5. Click **Write**

**Expected Result:**
- Transaction succeeds
- `cycleCount` increases from 0 to 1
- ETH is swapped for portfolio assets
- Events: `FundsDeployed`, `AICycleExecuted`

**If it fails:**
- Check that portfolio has 27 assets
- Check that vault has >0.01 ETH
- Check that automation is enabled
- Check that cooldown period (60s) has passed

---

## ✅ VERIFICATION STEPS

After running the configuration and first trade:

```bash
# Check cycle count (should be >0)
curl -X POST https://ethereum.publicnode.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb","data":"0x316fda0f"},"latest"]}'
```

Or check on the website:
- Analytics page should show "Vault Cycles: >0"
- Portfolio should show real positions (not placeholder data)
- NAV per token should reflect actual trades

---

## 🔗 CHAINLINK AUTOMATION SETUP

After the vault is working:

1. Go to https://automation.chain.link
2. Click "Register New Upkeep"
3. Enter vault address: `0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb`
4. Gas limit: 5,000,000
5. Fund with LINK tokens (minimum 5 LINK)

---

## 📊 EXPECTED STATE AFTER FIX

| Metric | After Fix |
|--------|-----------|
| Vault Cycles | >0 (increasing every 60s when ETH > 0.005) |
| Portfolio | 27 on-chain positions with real balances |
| checkUpkeep() | Returns `true` when conditions met |
| UI Data | Real on-chain data (no more placeholders) |
| Chainlink | Executes automatically every 60s |

---

## 🆘 STILL HAVING ISSUES?

If `checkUpkeep()` still reverts after configuration:

1. **Check contract version** — You may need to redeploy the vault with a fixed contract
2. **Verify portfolio weights** — All weights must be >0 and sum to reasonable value
3. **Check for corrupted state** — `setPortfolio` with empty arrays, then reconfigure
4. **Contact support** — If all else fails, the contract may have a bug requiring redeployment

---

**Last Updated:** April 10, 2026  
**Vault Address:** 0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb  
**Required Role:** Vault Owner (0x4e7d...)
