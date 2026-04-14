// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../contracts/InquisitiveVaultV2.sol";

/// @notice Deploy InquisitiveVaultV2 (signal-based, upgradeable) and migrate from old vault
/// @dev Run with: forge script script/Deploy.s.sol --rpc-url $MAINNET_RPC_URL --trezor --broadcast
contract Deploy is Script {

    address constant TEAM_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    address constant OLD_VAULT   = 0x721B0c1fcf28646D6e0f608A15495F7227cB6CFb;

    function run() external {
        vm.startBroadcast();

        // 1. Deploy implementation
        InquisitiveVaultV2 impl = new InquisitiveVaultV2();
        console.log("Implementation:", address(impl));

        // 2. Deploy proxy with initializer
        bytes memory init = abi.encodeCall(
            InquisitiveVaultV2.initialize,
            (TEAM_WALLET, TEAM_WALLET) // owner, aiOracle (team wallet submits signals initially)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);
        console.log("Proxy (USE THIS):", address(proxy));

        InquisitiveVaultV2 vault = InquisitiveVaultV2(payable(address(proxy)));

        // 3. Register tracked assets (32 ETH-mainnet ERC-20s via Uniswap V3)
        _registerAssets(vault);

        // 4. Migrate ETH from old vault
        uint256 oldBalance = OLD_VAULT.balance;
        if (oldBalance > 0) {
            console.log("Migrating from old vault:", oldBalance);
            (bool ok,) = OLD_VAULT.call(abi.encodeWithSignature("emergencyWithdraw()"));
            if (ok && address(this).balance > 0) {
                vault.deposit{value: address(this).balance}();
                console.log("Migrated ETH to new vault");
            }
        }

        vm.stopBroadcast();

        console.log("========================================");
        console.log("VAULT V2 DEPLOYED");
        console.log("Proxy:         ", address(proxy));
        console.log("Implementation:", address(impl));
        console.log("ETH Balance:   ", vault.getETHBalance());
        console.log("NEXT: Update Chainlink Automation target to proxy address above");
        console.log("========================================");
    }

    function _registerAssets(InquisitiveVaultV2 vault) internal {
        vault.addTrackedAsset(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599); // WBTC
        vault.addTrackedAsset(0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0); // wstETH
        vault.addTrackedAsset(0xae78736Cd615f374D3085123A210448E74Fc6393); // rETH
        vault.addTrackedAsset(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48); // USDC
        vault.addTrackedAsset(0xdAC17F958D2ee523a2206206994597C13D831ec7); // USDT
        vault.addTrackedAsset(0x6B175474E89094C44Da98b954EedeAC495271d0F); // DAI
        vault.addTrackedAsset(0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984); // UNI
        vault.addTrackedAsset(0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9); // AAVE
        vault.addTrackedAsset(0x514910771AF9Ca656af840dff83E8264EcF986CA); // LINK
        vault.addTrackedAsset(0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1); // ARB
        vault.addTrackedAsset(0x4200000000000000000000000000000000000042); // OP
        vault.addTrackedAsset(0x0f2D719407FdBeFF09D87557AbB7232601FD9F29); // SYN
        vault.addTrackedAsset(0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72); // ENS
        vault.addTrackedAsset(0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32); // LDO
        vault.addTrackedAsset(0x111111111117dC0aa78b770fA6A738034120C302); // 1INCH
        vault.addTrackedAsset(0xD31a59c85aE9D8edEFeC411D448f90841571b89c); // SOL (wrapped)
        vault.addTrackedAsset(0x4d224452801ACEd8B2F0aebE155379bb5D594381); // APE
        vault.addTrackedAsset(0xFe2e637202056d30016725477c5da089Ab0A043A); // sETH2
        vault.addTrackedAsset(0x6982508145454Ce325dDbE47a25d4ec3d2311933); // PEPE
        vault.addTrackedAsset(0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE); // SHIB
    }
}
