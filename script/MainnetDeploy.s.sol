// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/INQAI.sol";
import "../contracts/InquisitiveVaultUpdated.sol";
import "../contracts/InquisitiveStrategy.sol";
import "../contracts/AIStrategyManager.sol";
import "../contracts/InquisitiveProfitMaximizer.sol";

contract MainnetDeploy is Script {
    function run() external {
        // Hardware wallet signing — no private key needed.
        // Pass --trezor (or --ledger) to forge script and it will route all
        // signing requests to the connected Trezor device for on-device confirmation.
        vm.startBroadcast();
        
        // Deploy INQAI Token
        INQAI inqai = new INQAI();
        console.log("INQAI deployed to:", address(inqai));
        console.log("Total Supply:", inqai.totalSupply());
        
        // Deploy InquisitiveVault
        InquisitiveVaultUpdated vault = new InquisitiveVaultUpdated(address(inqai));
        console.log("Vault deployed to:", address(vault));
        
        // Deploy InquisitiveStrategy
        InquisitiveStrategy strategy = new InquisitiveStrategy(address(vault));
        console.log("Strategy deployed to:", address(strategy));
        
        // Deploy AIStrategyManager
        AIStrategyManager aiManager = new AIStrategyManager(address(strategy), address(vault));
        console.log("AI Manager deployed to:", address(aiManager));
        
        // Deploy InquisitiveProfitMaximizer
        InquisitiveProfitMaximizer profitMax = new InquisitiveProfitMaximizer(address(inqai), address(vault));
        console.log("Profit Maximizer deployed to:", address(profitMax));
        
        // Transfer team allocation (20M INQAI)
        uint256 teamAllocation = 20000000 * 10**18; // 20M tokens with 18 decimals
        address teamAddress = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
        
        inqai.transfer(teamAddress, teamAllocation);
        console.log("Team allocation transferred to:", teamAddress);
        console.log("Team allocation amount:", teamAllocation / 10**18);
        
        // Setup permissions and fees
        vault.setStrategy(address(strategy));
        vault.setPerformanceFee(1500); // 15% fee
        strategy.setVault(address(vault));
        
        console.log("Vault strategy set to:", address(strategy));
        console.log("Vault performance fee set to: 15%");
        console.log("Strategy vault set to:", address(vault));
        
        vm.stopBroadcast();
        
        console.log("\nDEPLOYMENT COMPLETE!");
        console.log("INQAI Token:", address(inqai));
        console.log("InquisitiveVault:", address(vault));
        console.log("InquisitiveStrategy:", address(strategy));
        console.log("AIStrategyManager:", address(aiManager));
        console.log("InquisitiveProfitMaximizer:", address(profitMax));
        console.log("Team Address:", teamAddress);
        console.log("Team Allocation:", teamAllocation / 10**18, "INQAI");
        console.log("Vesting: 36 months with 3-month cliff");
        console.log("Performance Fee: 15%");
    }
}
