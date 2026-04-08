// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

// ─────────────────────────────────────────────────────────────────────────────
// CHAINLINK AUTOMATION SETUP HELPER
//
// This script prepares the vault for Chainlink Automation registration.
// It checks performUpkeep() compatibility and simulates execution.
//
// To actually register:
//   1. Visit https://automation.chain.link/
//   2. Connect wallet (team wallet)
//   3. Click "Register New Upkeep"
//   4. Select "Custom Log Trigger" or "Time-based"
//   5. Enter vault address: 0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb
//   6. Enter performUpkeep() calldata: 0x (empty bytes)
//   7. Set gas limit: 2,000,000
//   8. Fund with LINK: 50 LINK minimum
//
// Run this script with: forge script script/ChainlinkAutomationSetup.s.sol --rpc-url $MAINNET_RPC
// ─────────────────────────────────────────────────────────────────────────────

interface IAutomationRegistry {
    function registerUpkeep(
        address target,
        uint32 gasLimit,
        address admin,
        bytes calldata checkData,
        bytes calldata performData
    ) external returns (uint256 upkeepID);
    
    function getUpkeep(uint256 upkeepID) external view returns (
        address target,
        uint32 executeGas,
        bytes memory checkData,
        uint256 balance,
        address lastKeeper,
        address admin,
        uint64 maxValidBlocknumber
    );
}

interface IInquisitiveVault {
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
    function automationEnabled() external view returns (bool);
    function owner() external view returns (address);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract ChainlinkAutomationSetup is Script {
    
    // Contract addresses
    address constant VAULT = 0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb;
    address constant LINK_TOKEN = 0x514910771AF9Ca656af840dff83E8264EcF986CA;
    
    // Chainlink Automation Registry v2.1 (Mainnet)
    address constant AUTOMATION_REGISTRY = 0x6593c7De001fC8542bB1703532EE1E5aA0D458fD;
    address constant AUTOMATION_REGISTRAR = 0x6B0B154A5b4C90202bA6B46862E81e5F7a995e23;
    
    address constant TEAM_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    
    function run() external {
        console.log("=== CHAINLINK AUTOMATION SETUP ===");
        console.log("");
        
        IInquisitiveVault vault = IInquisitiveVault(VAULT);
        
        // 1. Check vault status
        console.log("1. Checking vault status...");
        bool automationEnabled = vault.automationEnabled();
        console.log("   Automation enabled:", automationEnabled ? "YES" : "NO");
        require(automationEnabled, "Automation must be enabled via setAutomationEnabled(true)");
        console.log("   Vault owner:", vault.owner());
        console.log("   Team wallet:", TEAM_WALLET);
        console.log("");
        
        // 2. Test checkUpkeep()
        console.log("2. Testing checkUpkeep()...");
        try vault.checkUpkeep("") returns (bool upkeepNeeded, bytes memory performData) {
            console.log("   checkUpkeep() result:");
            console.log("   - Upkeep needed:", upkeepNeeded ? "YES" : "NO");
            console.log("   - Perform data length:", performData.length);
            if (!upkeepNeeded) {
                console.log("   WARNING: Upkeep not needed right now. This is normal if:");
                console.log("     a) Vault balance < MIN_DEPLOY (0.005 ETH)");
                console.log("     b) No rebalancing opportunities detected");
                console.log("     c) Cooldown period active");
            }
        } catch Error(string memory reason) {
            console.log("   checkUpkeep() FAILED:", reason);
            console.log("   This usually means the vault is not properly configured.");
            console.log("   Run ConfigureVault.s.sol first.");
            revert(reason);
        } catch {
            console.log("   checkUpkeep() FAILED with unknown error");
            revert("checkUpkeep failed");
        }
        console.log("");
        
        // 3. Check LINK balance
        console.log("3. Checking LINK balance...");
        uint256 linkBalance = IERC20(LINK_TOKEN).balanceOf(TEAM_WALLET);
        console.log("   Team wallet LINK balance:", linkBalance / 1e18, "LINK");
        if (linkBalance < 50e18) {
            console.log("   WARNING: Need at least 50 LINK to fund Automation upkeep");
            console.log("   Purchase LINK from: https://app.uniswap.org/#/swap?outputCurrency=0x514910771AF9Ca656af840dff83E8264EcF986CA");
        }
        console.log("");
        
        // 4. Output registration instructions
        console.log("=== REGISTRATION INSTRUCTIONS ===");
        console.log("");
        console.log("To register Chainlink Automation manually:");
        console.log("");
        console.log("Step 1: Visit https://automation.chain.link/");
        console.log("Step 2: Connect your wallet (Team wallet: 0x4e7d...9E746)");
        console.log("Step 3: Click 'Register New Upkeep'");
        console.log("Step 4: Choose 'Custom Logic' trigger type");
        console.log("Step 5: Enter these details:");
        console.log("");
        console.log("  Target Contract Address: 0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb");
        console.log("  Gas Limit: 2,000,000");
        console.log("  Check Data: 0x (empty)");
        console.log("  Admin Address: 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746");
        console.log("");
        console.log("Step 6: Fund with at least 50 LINK");
        console.log("Step 7: Submit registration");
        console.log("");
        console.log("The Automation will then:");
        console.log("  - Call checkUpkeep() every block");
        console.log("  - Execute performUpkeep() when vault needs rebalancing");
        console.log("  - Deduct LINK fees from your upkeep balance");
        console.log("");
        
        // 5. Output performUpkeep() test instructions
        console.log("=== MANUAL TESTING ===");
        console.log("");
        console.log("To test performUpkeep() manually via Etherscan:");
        console.log("  1. Visit https://etherscan.io/address/0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb#writeContract");
        console.log("  2. Connect your wallet");
        console.log("  3. Find 'performUpkeep' function");
        console.log("  4. Enter performData: 0x (empty bytes)");
        console.log("  5. Click Write");
        console.log("");
        console.log("Note: performUpkeep() can be called by ANYONE (zero private key),");
        console.log("      but Chainlink Automation makes it autonomous.");
        console.log("");
        
        // 6. Check if we should attempt performUpkeep()
        (bool upkeepNeeded, ) = vault.checkUpkeep("");
        if (upkeepNeeded) {
            console.log("=== PERFORMING UPKEEP NOW ===");
            console.log("Upkeep is needed. Attempting to execute performUpkeep()...");
            console.log("(This requires PRIVATE_KEY to be set and will spend gas)");
            console.log("");
            
            // Note: We don't actually execute here to avoid accidental gas spend
            console.log("To execute performUpkeep() via script, run:");
            console.log("  forge script script/ExecuteUpkeep.s.sol --rpc-url $MAINNET_RPC --broadcast");
        } else {
            console.log("=== UPKEEP STATUS ===");
            console.log("Upkeep not needed right now.");
            console.log("Deposit more ETH to the vault (minimum 0.005) to trigger rebalancing.");
        }
        
        console.log("");
        console.log("=== SETUP COMPLETE ===");
    }
}
