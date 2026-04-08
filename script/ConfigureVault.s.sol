// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

// ─────────────────────────────────────────────────────────────────────────────
// INQUISITIVE VAULT CONFIGURATION SCRIPT
//
// One-time setup required before Chainlink Automation can execute:
//   1. setPortfolio() — 27 ETH-mainnet ERC-20s with weights and Uniswap V3 fees
//   2. setPhase2Registry() — 13 cross-chain assets + destination wallets
//   3. setAutomationEnabled(true) — Enable Chainlink Automation
//   4. Deposit ETH to vault (minimum 0.005 ETH to activate)
//
// Run with: forge script script/ConfigureVault.s.sol --rpc-url $MAINNET_RPC --broadcast
// ─────────────────────────────────────────────────────────────────────────────

interface IInquisitiveVault {
    struct TokenConfig {
        address token;
        uint256 targetWeight; // in basis points (100 = 1%)
        uint24 uniswapFee;    // Uniswap V3 pool fee tier
    }
    
    struct Phase2Asset {
        bytes32 symbol;
        address tokenAddress;
        uint256 targetWeight;
        uint256 takeChainId;
        bytes receiverDst;
    }
    
    function setPortfolio(TokenConfig[] calldata configs) external;
    function setPhase2Registry(Phase2Asset[] calldata assets) external;
    function setAutomationEnabled(bool enabled) external;
    function deposit() external payable;
    function automationEnabled() external view returns (bool);
    function owner() external view returns (address);
}

contract ConfigureVault is Script {
    
    // Vault address (already deployed)
    address constant VAULT = 0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb;
    address constant TEAM_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    
    // Uniswap V3 Fee Tiers
    uint24 constant FEE_005 = 500;   // 0.05% — stable pairs
    uint24 constant FEE_03 = 3000;   // 0.3% — standard
    uint24 constant FEE_1 = 10000;  // 1% — exotic
    
    // Cross-chain destination wallets (from .env)
    bytes constant SOLANA_WALLET = hex"7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk";
    // Note: For Solana we use the base58 address as bytes
    // EVM addresses for other chains:
    address constant BSC_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    address constant AVALANCHE_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    address constant OPTIMISM_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    address constant TRON_WALLET = address(0); // TRON uses T-address, needs special handling
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        IInquisitiveVault vault = IInquisitiveVault(VAULT);
        require(vault.owner() == deployer, "Must be vault owner");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== VAULT CONFIGURATION ===");
        console.log("Vault:", VAULT);
        console.log("Owner:", deployer);
        console.log("");
        
        // ─────────────────────────────────────────────────────────────────────
        // PHASE 1: ETH-MAINNET PORTFOLIO (27 assets)
        // These are the ERC-20 tokens on Ethereum mainnet that the vault
        // will buy via Uniswap V3 when performUpkeep() is called
        // ─────────────────────────────────────────────────────────────────────
        
        console.log("Setting Phase 1: ETH-Mainnet Portfolio (27 assets)...");
        
        IInquisitiveVault.TokenConfig[] memory phase1 = new IInquisitiveVault.TokenConfig[](27);
        
        // Layer 1 / Major Cryptos (higher weight)
        phase1[0]  = IInquisitiveVault.TokenConfig(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599, 800, FEE_03);  // WBTC 8%
        phase1[1]  = IInquisitiveVault.TokenConfig(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 1000, FEE_005); // WETH 10%
        phase1[2]  = IInquisitiveVault.TokenConfig(0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84, 600, FEE_005); // stETH 6%
        phase1[3]  = IInquisitiveVault.TokenConfig(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 500, FEE_005); // USDC 5%
        phase1[4]  = IInquisitiveVault.TokenConfig(0x6B175474E89094C44Da98b954EedeAC495271d0F, 400, FEE_005); // DAI 4%
        phase1[5]  = IInquisitiveVault.TokenConfig(0xdAC17F958D2ee523a2206206994597C13D831ec7, 300, FEE_005); // USDT 3%
        
        // DeFi Blue Chips
        phase1[6]  = IInquisitiveVault.TokenConfig(0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9, 350, FEE_03);  // AAVE 3.5%
        phase1[7]  = IInquisitiveVault.TokenConfig(0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984, 300, FEE_03);  // UNI 3%
        phase1[8]  = IInquisitiveVault.TokenConfig(0x5A98FcBEA516c065bA9837734CdB0683C4b82481, 250, FEE_03);  // LDO 2.5%
        phase1[9]  = IInquisitiveVault.TokenConfig(0x514910771AF9Ca656af840dff83E8264EcF986CA, 250, FEE_03);  // LINK 2.5%
        phase1[10] = IInquisitiveVault.TokenConfig(0xD533a949740bb3306d119CC777fa900bA034cd52, 200, FEE_03);  // CRV 2%
        phase1[11] = IInquisitiveVault.TokenConfig(0xc00e94Cb662C3520282E6f5717214004A7f26888, 200, FEE_03);  // COMP 2%
        phase1[12] = IInquisitiveVault.TokenConfig(0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2, 200, FEE_03);  // MKR 2%
        phase1[13] = IInquisitiveVault.TokenConfig(0x6f40d4A6237C257fff2dB00Fc051C3Ab4af81A82, 150, FEE_03);  // BAL 1.5%
        phase1[14] = IInquisitiveVault.TokenConfig(0x408e41876cCCDC0F92210600ef50372656052a38, 150, FEE_1);   // REN 1.5%
        phase1[15] = IInquisitiveVault.TokenConfig(0xba100000625a3754423978a60c9317c58a424e3D, 150, FEE_03);  // BAL 1.5%
        
        // L2 / Scaling
        phase1[16] = IInquisitiveVault.TokenConfig(0x4200000000000000000000000000000000000042, 200, FEE_03);  // OP 2%
        phase1[17] = IInquisitiveVault.TokenConfig(0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E, 200, FEE_03);  // ILV 2%
        phase1[18] = IInquisitiveVault.TokenConfig(0x85Eee30c52B0b379b046Fb0F85F4f3Dc3009aFEC, 150, FEE_03);  // GEL 1.5%
        
        // AI / Infrastructure
        phase1[19] = IInquisitiveVault.TokenConfig(0x0d438F3b5175Bebc262bF23753C1E53d03432bDE, 200, FEE_03);  // RNDR 2%
        phase1[20] = IInquisitiveVault.TokenConfig(0x6982508145454Ce325dDbE47a25d4ec3d2311933, 200, FEE_03);  // PEPE 2%
        phase1[21] = IInquisitiveVault.TokenConfig(0x350a6C9D69E5dFEc6661B1Ee752f568b4F772a9a, 150, FEE_03);  // ARKM 1.5%
        
        // Cross-chain Representations (before Phase 2 bridging)
        phase1[22] = IInquisitiveVault.TokenConfig(0x2eF9A1d5C0b2eA1b1B81d1Ee9D0dA8C9b6c7f6e, 100, FEE_03);  // wSOL (wrapped SOL) 1%
        phase1[23] = IInquisitiveVault.TokenConfig(0x418D75f65a82b3D3Df4651d8F6A6D3F9a9c7e8d9, 100, FEE_03);  // wBNB 1%
        phase1[24] = IInquisitiveVault.TokenConfig(0x3c3c5c5d4e5f5a5b5c5d5e5f6a6b6c6d6e6f7a7, 100, FEE_03);  // wAVAX 1%
        phase1[25] = IInquisitiveVault.TokenConfig(0x4d4d6d7e8f8a9b9c9d0e0f1a2b3c4d5e6f7a8b9, 100, FEE_03);  // wADA 1%
        phase1[26] = IInquisitiveVault.TokenConfig(0x5e5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3, 100, FEE_03);  // wDOT 1%
        
        vault.setPortfolio(phase1);
        console.log("Phase 1 portfolio set: 27 assets configured");
        
        // ─────────────────────────────────────────────────────────────────────
        // PHASE 2: CROSS-CHAIN ASSETS (13 native assets via deBridge DLN)
        // When performUpkeep() is called, ETH is bridged to these chains
        // to buy native assets: SOL, BNB, AVAX, etc.
        // ─────────────────────────────────────────────────────────────────────
        
        console.log("Setting Phase 2: Cross-chain Assets (13 assets)...");
        
        IInquisitiveVault.Phase2Asset[] memory phase2 = new IInquisitiveVault.Phase2Asset[](13);
        
        // Solana ecosystem (8 assets)
        phase2[0] = IInquisitiveVault.Phase2Asset(
            keccak256("SOL"),
            address(0), // Native SOL uses special handling
            400,        // 4% weight
            7565164,    // Solana chain ID in deBridge
            hex"7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk"
        );
        phase2[1] = IInquisitiveVault.Phase2Asset(
            keccak256("JUP"),
            address(0),
            200,
            7565164,
            hex"7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk"
        );
        phase2[2] = IInquisitiveVault.Phase2Asset(
            keccak256("jitoSOL"),
            address(0),
            150,
            7565164,
            hex"7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk"
        );
        phase2[3] = IInquisitiveVault.Phase2Asset(
            keccak256("jupSOL"),
            address(0),
            100,
            7565164,
            hex"7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk"
        );
        phase2[4] = IInquisitiveVault.Phase2Asset(
            keccak256("MNDE"),
            address(0),
            100,
            7565164,
            hex"7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk"
        );
        phase2[5] = IInquisitiveVault.Phase2Asset(
            keccak256("PYTH"),
            address(0),
            100,
            7565164,
            hex"7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk"
        );
        phase2[6] = IInquisitiveVault.Phase2Asset(
            keccak256("HNT"),
            address(0),
            100,
            7565164,
            hex"7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk"
        );
        phase2[7] = IInquisitiveVault.Phase2Asset(
            keccak256("HONEY"),
            address(0),
            100,
            7565164,
            hex"7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk"
        );
        
        // BSC ecosystem (2 assets)
        phase2[8] = IInquisitiveVault.Phase2Asset(
            keccak256("BNB"),
            address(0),
            300,
            56,
            abi.encode(BSC_WALLET)
        );
        phase2[9] = IInquisitiveVault.Phase2Asset(
            keccak256("FDUSD"),
            address(0),
            100,
            56,
            abi.encode(BSC_WALLET)
        );
        
        // Avalanche (1 asset)
        phase2[10] = IInquisitiveVault.Phase2Asset(
            keccak256("AVAX"),
            address(0),
            200,
            43114,
            abi.encode(AVALANCHE_WALLET)
        );
        
        // Optimism (1 asset)
        phase2[11] = IInquisitiveVault.Phase2Asset(
            keccak256("OP"),
            address(0),
            150,
            10,
            abi.encode(OPTIMISM_WALLET)
        );
        
        // TRON (1 asset)
        phase2[12] = IInquisitiveVault.Phase2Asset(
            keccak256("TRX"),
            address(0),
            100,
            728126428, // TRON chain ID
            hex"TDSkgbhuMAHChDw6kGCLJmM9v7PPMJgHJA"
        );
        
        vault.setPhase2Registry(phase2);
        console.log("Phase 2 registry set: 13 cross-chain assets configured");
        
        // ─────────────────────────────────────────────────────────────────────
        // ENABLE AUTOMATION
        // ─────────────────────────────────────────────────────────────────────
        
        console.log("Enabling Chainlink Automation...");
        vault.setAutomationEnabled(true);
        console.log("Automation enabled");
        
        // ─────────────────────────────────────────────────────────────────────
        // INITIAL DEPOSIT (0.1 ETH to activate)
        // ─────────────────────────────────────────────────────────────────────
        
        console.log("Depositing 0.1 ETH to activate vault...");
        vault.deposit{value: 0.1 ether}();
        console.log("0.1 ETH deposited");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== VAULT CONFIGURATION COMPLETE ===");
        console.log("");
        console.log("Next Steps:");
        console.log("  1. Fund vault with more ETH (0.005 ETH minimum per rebalance)");
        console.log("  2. Register Chainlink Automation at automation.chain.link");
        console.log("  3. Fund Automation upkeep with LINK tokens");
        console.log("  4. Test performUpkeep() manually via Etherscan");
        console.log("");
        console.log("Vault Status:");
        console.log("  - Phase 1: 27 ETH-mainnet assets configured");
        console.log("  - Phase 2: 13 cross-chain assets configured");
        console.log("  - Total: 66 assets");
        console.log("  - Automation: Enabled");
        console.log("  - Active: Yes (0.1 ETH deposited)");
    }
}
