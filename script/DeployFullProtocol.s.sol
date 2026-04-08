// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/INQAIStaking.sol";
import "../contracts/FeeDistributor.sol";
import "../contracts/ReferralTracker.sol";
import "../contracts/INQAIGovernance.sol";
import "../contracts/INQAITimelock.sol";
import "../contracts/LiquidityLauncher.sol";
import "../contracts/SuccessOptimizedVesting.sol";
import "../contracts/INQAIInsurance.sol";
import "../contracts/AIStrategyManager.sol";

// ─────────────────────────────────────────────────────────────────────────────
// INQUISITIVE PROTOCOL — FULL DEPLOYMENT SCRIPT
//
// This script deploys all remaining contracts and wires them together.
// Run with: forge script script/DeployFullProtocol.s.sol --rpc-url $MAINNET_RPC --broadcast --verify
// ─────────────────────────────────────────────────────────────────────────────

contract DeployFullProtocol is Script {
    
    // Already deployed (from deployment-info.json)
    address constant INQAI_TOKEN = 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5;
    address constant VAULT = 0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb;
    address constant STRATEGY = 0xa2589adA4D647a9977e8e46Db5849883F2e66B3e;
    address constant STRATEGY_MANAGER = 0x8431173FA9594B43E226D907E26EF68cD6B6542D;
    address constant PROFIT_MAXIMIZER = 0x23a033c08e3562786068cB163967626234A45E37;
    address constant TEAM_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    
    // New deployments (to be filled in)
    address public staking;
    address public feeDistributor;
    address public referralTracker;
    address public governance;
    address public timelock;
    address public liquidityLauncher;
    address public vesting;
    address public insurance;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        require(deployer == TEAM_WALLET, "Must deploy from team wallet");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== INQUISITIVE PROTOCOL DEPLOYMENT ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");
        
        // 1. Deploy INQAIStaking (rewards for stakers)
        console.log("Deploying INQAIStaking...");
        INQAIStaking stakingContract = new INQAIStaking();
        staking = address(stakingContract);
        console.log("INQAIStaking deployed at:", staking);
        
        // 2. Deploy FeeDistributor (60/20/20 split)
        console.log("Deploying FeeDistributor...");
        FeeDistributor feeDist = new FeeDistributor();
        feeDistributor = address(feeDist);
        console.log("FeeDistributor deployed at:", feeDistributor);
        
        // 3. Wire Staking <-> FeeDistributor
        console.log("Wiring Staking <-> FeeDistributor...");
        stakingContract.setFeeDistributor(feeDistributor);
        feeDist.setStakingContract(staking);
        console.log("Wired successfully");
        
        // 4. Deploy ReferralTracker (viral growth)
        console.log("Deploying ReferralTracker...");
        ReferralTracker refTracker = new ReferralTracker();
        referralTracker = address(refTracker);
        console.log("ReferralTracker deployed at:", referralTracker);
        
        // 5. Deploy LiquidityLauncher (token sale + liquidity)
        console.log("Deploying LiquidityLauncher...");
        LiquidityLauncher launcher = new LiquidityLauncher(
            INQAI_TOKEN,
            VAULT, // beneficiary is the AI vault
            8e18,  // $8 presale price (in wei with 18 decimals)
            15e18  // $15 target price
        );
        liquidityLauncher = address(launcher);
        console.log("LiquidityLauncher deployed at:", liquidityLauncher);
        
        // 6. Wire ReferralTracker <-> LiquidityLauncher
        console.log("Wiring ReferralTracker <-> LiquidityLauncher...");
        refTracker.setLauncherContract(liquidityLauncher);
        launcher.setReferralTracker(referralTracker);
        console.log("Wired successfully");
        
        // 7. Deploy Timelock (2-day delay for governance)
        console.log("Deploying INQAITimelock (2-day delay)...");
        INQAITimelock timelockContract = new INQAITimelock(TEAM_WALLET, 2 days);
        timelock = address(timelockContract);
        console.log("INQAITimelock deployed at:", timelock);
        
        // 8. Deploy Governance
        console.log("Deploying INQAIGovernance...");
        INQAIGovernance gov = new INQAIGovernance(INQAI_TOKEN, timelock);
        governance = address(gov);
        console.log("INQAIGovernance deployed at:", governance);
        
        // 9. Transfer Timelock ownership to Governance
        console.log("Transferring Timelock ownership to Governance...");
        timelockContract.transferOwnership(governance);
        console.log("Ownership transferred");
        
        // 10. Deploy Insurance Fund
        console.log("Deploying INQAIInsurance...");
        INQAIInsurance ins = new INQAIInsurance(INQAI_TOKEN, VAULT);
        insurance = address(ins);
        console.log("INQAIInsurance deployed at:", insurance);
        
        // 11. Deploy Team Vesting (4-year vesting)
        console.log("Deploying SuccessOptimizedVesting (Team)...");
        // 4 years = 1460 days, 6-month cliff = 180 days
        SuccessOptimizedVesting teamVesting = new SuccessOptimizedVesting(
            INQAI_TOKEN,
            TEAM_WALLET,
            1460 days, // 4 years
            180 days   // 6 month cliff
        );
        vesting = address(teamVesting);
        console.log("SuccessOptimizedVesting deployed at:", vesting);
        
        // 12. Fund bonus pool for referrals (1000 INQAI)
        console.log("Funding referral bonus pool with 1000 INQAI...");
        IERC20(INQAI_TOKEN).transfer(referralTracker, 1000e18);
        refTracker.fundBonusPool(1000e18);
        console.log("Bonus pool funded");
        
        vm.stopBroadcast();
        
        // Output JSON for frontend integration
        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("");
        console.log("New Contract Addresses:");
        console.log("  INQAIStaking:", staking);
        console.log("  FeeDistributor:", feeDistributor);
        console.log("  ReferralTracker:", referralTracker);
        console.log("  LiquidityLauncher:", liquidityLauncher);
        console.log("  INQAITimelock:", timelock);
        console.log("  INQAIGovernance:", governance);
        console.log("  INQAIInsurance:", insurance);
        console.log("  TeamVesting:", vesting);
        console.log("");
        console.log("Integration Required:");
        console.log("  1. Fund FeeDistributor with ETH for buybacks");
        console.log("  2. Configure Staking reward rate");
        console.log("  3. Register Chainlink Automation for FeeDistributor");
        console.log("  4. Update frontend .env with new addresses");
        
        // Write deployment info to file
        string memory json = string.concat(
            '{\n',
            '  "timestamp": "', vm.toString(block.timestamp), '",\n',
            '  "network": "mainnet",\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "contracts": {\n',
            '    "INQAI": "', vm.toString(INQAI_TOKEN), '",\n',
            '    "InquisitiveVault": "', vm.toString(VAULT), '",\n',
            '    "AIStrategyManager": "', vm.toString(STRATEGY_MANAGER), '",\n',
            '    "InquisitiveStrategy": "', vm.toString(STRATEGY), '",\n',
            '    "InquisitiveProfitMaximizer": "', vm.toString(PROFIT_MAXIMIZER), '",\n',
            '    "INQAIStaking": "', vm.toString(staking), '",\n',
            '    "FeeDistributor": "', vm.toString(feeDistributor), '",\n',
            '    "ReferralTracker": "', vm.toString(referralTracker), '",\n',
            '    "LiquidityLauncher": "', vm.toString(liquidityLauncher), '",\n',
            '    "INQAITimelock": "', vm.toString(timelock), '",\n',
            '    "INQAIGovernance": "', vm.toString(governance), '",\n',
            '    "INQAIInsurance": "', vm.toString(insurance), '",\n',
            '    "TeamVesting": "', vm.toString(vesting), '\n',
            '  }\n',
            '}'
        );
        
        vm.writeFile("deployment-full.json", json);
        console.log("Deployment info written to deployment-full.json");
    }
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}
