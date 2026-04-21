// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/InquisitiveOracleConsumer.sol";

/// @title Deploy InquisitiveOracleConsumer (Chainlink Functions)
/// @notice Deploys the oracle consumer and wires the tracked asset list that
///         matches the JavaScript source in chainlink-functions/source.js.
///
/// Run:
///   forge script script/DeployOracleConsumer.s.sol \
///     --rpc-url $MAINNET_RPC_URL \
///     --trezor \
///     --broadcast \
///     --verify
///
/// AFTER DEPLOY (manual steps):
///   1. Open https://functions.chain.link and create a new Subscription
///   2. Fund subscription with at least 10 LINK
///   3. Add the deployed consumer address to the subscription
///   4. On the consumer contract:
///        - setSubscriptionId(<yourSubId>)
///        - setSource(<contents of chainlink-functions/source.js>)
///   5. Register consumer with Chainlink Automation (Custom Logic) at
///      https://automation.chain.link/mainnet  (fund with 5+ LINK)
///   6. Vault owner: call vault.setAIOracle(<consumerAddress>)
contract DeployOracleConsumer is Script {
    // ── Chainlink Ethereum mainnet addresses ───────────────────────────────
    address public constant FUNCTIONS_ROUTER_MAINNET = 0x65Dcc24F8ff9e51F10DCc7Ed1e4e2A61e6E14bd6;
    bytes32 public constant DON_ID_MAINNET = 0x66756e2d657468657265756d2d6d61696e6e65742d3100000000000000000000; // fun-ethereum-mainnet-1

    // ── INQUISITIVE addresses ──────────────────────────────────────────────
    address public constant VAULT_V2 = 0xb99DC519c4373e5017222BBD46F42a4e12a0Ec25;

    function run() external returns (address consumer) {
        // Deploy with placeholder subscriptionId=0; owner sets after subscription creation.
        uint64 initialSubId = uint64(vm.envOr("FUNCTIONS_SUB_ID", uint256(0)));

        vm.startBroadcast();

        InquisitiveOracleConsumer oc = new InquisitiveOracleConsumer(
            FUNCTIONS_ROUTER_MAINNET,
            VAULT_V2,
            DON_ID_MAINNET,
            initialSubId
        );
        consumer = address(oc);
        console.log("OracleConsumer:", consumer);

        // Set tracked assets in the SAME ORDER as chainlink-functions/source.js TRACKED_SYMBOLS.
        address[] memory assets = _trackedAssets();
        oc.setTrackedAssets(assets);
        console.log("TrackedAssets set:", assets.length);

        vm.stopBroadcast();

        console.log("==================================================");
        console.log("NEXT STEPS (manual, at functions.chain.link):");
        console.log("  1. Create subscription");
        console.log("  2. Fund with at least 10 LINK");
        console.log("  3. Add consumer:", consumer);
        console.log("Then on the consumer:");
        console.log("  4. setSubscriptionId(<id>)");
        console.log("  5. setSource(<contents of chainlink-functions/source.js>)");
        console.log("Then:");
        console.log("  6. Register consumer with Automation at automation.chain.link (5+ LINK)");
        console.log("  7. vault.setAIOracle(<consumer address above>)");
        console.log("==================================================");
    }

    /// @dev Order MUST match TRACKED_SYMBOLS in chainlink-functions/source.js.
    function _trackedAssets() internal pure returns (address[] memory a) {
        a = new address[](30);
        a[0]  = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599; // BTC  → WBTC
        a[1]  = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84; // ETH  → stETH
        a[2]  = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // USDC
        a[3]  = 0x514910771AF9Ca656af840dff83E8264EcF986CA; // LINK
        a[4]  = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984; // UNI
        a[5]  = 0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9; // AAVE
        a[6]  = 0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32; // LDO
        a[7]  = 0xc944E90C64B2c07662A292be6244BDf05Cda44a7; // GRT
        a[8]  = 0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1; // ARB
        a[9]  = 0x57e114B691Db790C35207b2e685D4A43181e6061; // ENA
        a[10] = 0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6; // POL
        a[11] = 0x56072C95FAA701256059aa122697B133aDEd9279; // SKY
        a[12] = 0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85; // FET (ASI)
        a[13] = 0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24; // RNDR
        a[14] = 0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30; // INJ
        a[15] = 0x45804880De22913dAFE09f4980848ECE6EcbAf78; // PAXG
        a[16] = 0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3; // ONDO
        a[17] = 0x4a220E6096B25EADb88358cb44068A3248254675; // QNT
        a[18] = 0x6985884C4392D348587B19cb9eAAf157F13271cd; // ZRO
        a[19] = 0x3506424F91fD33084466F402d5D97f05F8e3b4AF; // CHZ
        a[20] = 0x4E15361FD6b4BB609Fa63C81A2be19d873717870; // ACH
        a[21] = 0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766; // STRK
        a[22] = 0xdBe2C93A4e82a177617F4a43Ee1A69c69Ee8e7E6; // DBR
        a[23] = 0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96; // XSGD
        a[24] = 0x420412E765BFa6d85aaaC94b4f7b708C89be2e2B; // BRZ
        a[25] = 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB; // JPYC
        a[26] = 0x4200000000000000000000000000000000000042; // OP
        a[27] = 0x0D8775F648430679A709E98d2b0Cb6250d2887EF; // FIL (Filecoin ETH wrapper placeholder)
        a[28] = 0xB8c77482e45F1F44dE1745F52C74426C631bDD52; // BNB (WBNB on ETH)
        a[29] = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7; // AVAX (WAVAX on ETH)
    }
}
