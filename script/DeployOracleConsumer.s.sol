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

    /// @dev Order MUST match TRACKED_SYMBOLS in chainlink-functions/source.js and
    ///      the vault's on-chain trackedAssets array (verified via getTrackedAssets()).
    ///      All 17 addresses are live, liquid ETH-mainnet ERC-20s with Uniswap V3 pools.
    function _trackedAssets() internal pure returns (address[] memory a) {
        a = new address[](17);
        a[0]  = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599; // WBTC  -> BTC signal
        a[1]  = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // WETH  -> ETH signal
        a[2]  = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84; // stETH -> ETH signal
        a[3]  = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // USDC
        a[4]  = 0x514910771AF9Ca656af840dff83E8264EcF986CA; // LINK
        a[5]  = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984; // UNI
        a[6]  = 0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32; // LDO
        a[7]  = 0xc944E90C64B2c07662A292be6244BDf05Cda44a7; // GRT
        a[8]  = 0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1; // ARB
        a[9]  = 0x57e114B691Db790C35207b2e685D4A43181e6061; // ENA
        a[10] = 0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3; // ONDO
        a[11] = 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2; // MKR
        a[12] = 0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72; // ENS
        a[13] = 0xc00e94Cb662C3520282E6f5717214004A7f26888; // COMP
        a[14] = 0xD533a949740bb3306d119CC777fa900bA034cd52; // CRV
        a[15] = 0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B; // CVX
        a[16] = 0xba100000625a3754423978a60c9317c58a424e3D; // BAL
    }
}
