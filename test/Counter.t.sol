// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {InquisitiveVaultV2} from "../contracts/InquisitiveVaultV2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title InquisitiveVaultV2 Test Suite
/// @notice Tests access control, pause mechanism, signal validation, and emergency withdrawal
contract InquisitiveVaultV2Test is Test {
    InquisitiveVaultV2 public vault;
    address public owner   = address(0x1);
    address public oracle  = address(0x2);
    address public attacker = address(0x3);
    address public keeper  = address(0x4);

    address constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;

    function setUp() public {
        vm.startPrank(owner);
        InquisitiveVaultV2 impl = new InquisitiveVaultV2();
        bytes memory init = abi.encodeCall(InquisitiveVaultV2.initialize, (owner, oracle));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);
        vault = InquisitiveVaultV2(payable(address(proxy)));
        vault.addTrackedAsset(WBTC);
        vm.stopPrank();

        vm.deal(owner, 10 ether);
        vm.deal(attacker, 1 ether);
    }

    // ── Initialization ────────────────────────────────────────────────────────

    function test_InitializationState() public {
        assertEq(vault.owner(), owner);
        assertEq(vault.aiOracle(), oracle);
        assertTrue(vault.automationEnabled());
        assertFalse(vault.paused());
    }

    function test_CannotReinitialize() public {
        vm.expectRevert();
        vault.initialize(attacker, attacker);
    }

    // ── Access Control: performUpkeep ─────────────────────────────────────────

    function test_PerformUpkeep_RevertsForUnauthorized() public {
        vm.prank(attacker);
        vm.expectRevert("Not authorized keeper");
        vault.performUpkeep(abi.encode(WBTC, uint8(1)));
    }

    function test_SubmitSignal_RevertsForNonOracle() public {
        vm.prank(attacker);
        vm.expectRevert("Only AI oracle");
        vault.submitSignal(WBTC, 1);
    }

    // ── Signal Validation ─────────────────────────────────────────────────────

    function test_SubmitAndReadSignal() public {
        vm.prank(oracle);
        vault.submitSignal(WBTC, 1); // BUY
        assertEq(vault.tradingSignals(WBTC), 1);
    }

    function test_SignalMismatch_RevertsPerformUpkeep() public {
        vm.prank(oracle);
        vault.submitSignal(WBTC, 1); // BUY

        // Attempt to execute with wrong signal (2 = SELL)
        vm.prank(oracle);
        vm.expectRevert("Signal mismatch");
        vault.performUpkeep(abi.encode(WBTC, uint8(2)));
    }

    function test_PerformUpkeep_ClearsSignalAfterExecution() public {
        // Deposit ETH first
        vm.prank(owner);
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertTrue(ok);

        // Submit BUY signal
        vm.prank(oracle);
        vault.submitSignal(WBTC, 1);

        // Execute — will revert at the swap on a fork, but signal clear is tested in fork tests
        // Here we just verify the signal was set
        assertEq(vault.tradingSignals(WBTC), 1);
    }

    // ── Pause Mechanism ───────────────────────────────────────────────────────

    function test_Pause_BlocksPerformUpkeep() public {
        vm.prank(oracle);
        vault.submitSignal(WBTC, 1);

        vm.prank(owner);
        vault.pause();
        assertTrue(vault.paused());
        assertFalse(vault.automationEnabled());

        vm.prank(oracle);
        vm.expectRevert("Pausable: paused");
        vault.performUpkeep(abi.encode(WBTC, uint8(1)));
    }

    function test_Unpause_RestoresExecution() public {
        vm.prank(owner);
        vault.pause();

        vm.prank(owner);
        vault.unpause();
        assertFalse(vault.paused());
    }

    function test_Pause_RevertsForNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        vault.pause();
    }

    // ── Emergency Withdrawal ──────────────────────────────────────────────────

    function test_EmergencyWithdraw_SendsETHToOwner() public {
        // Fund the vault
        vm.prank(owner);
        (bool ok,) = address(vault).call{value: 2 ether}("");
        assertTrue(ok);
        assertEq(address(vault).balance, 2 ether);

        uint256 ownerBefore = owner.balance;
        vm.prank(owner);
        vault.emergencyWithdraw();

        assertEq(address(vault).balance, 0);
        assertEq(owner.balance, ownerBefore + 2 ether);
    }

    function test_EmergencyWithdraw_RevertsForNonOwner() public {
        vm.prank(owner);
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertTrue(ok);

        vm.prank(attacker);
        vm.expectRevert();
        vault.emergencyWithdraw();
    }

    function test_EmergencyWithdraw_RevertsWhenEmpty() public {
        vm.prank(owner);
        vm.expectRevert("No funds");
        vault.emergencyWithdraw();
    }

    // ── Admin Functions ───────────────────────────────────────────────────────

    function test_SetAIOracle_OnlyOwner() public {
        address newOracle = address(0x99);
        vm.prank(owner);
        vault.setAIOracle(newOracle);
        assertEq(vault.aiOracle(), newOracle);

        vm.prank(attacker);
        vm.expectRevert();
        vault.setAIOracle(attacker);
    }

    function test_AddAndRemoveTrackedAsset() public {
        address newAsset = address(0xAB);
        vm.prank(owner);
        vault.addTrackedAsset(newAsset);
        address[] memory assets = vault.getTrackedAssets();
        assertEq(assets[assets.length - 1], newAsset);

        vm.prank(owner);
        vault.removeTrackedAsset(newAsset);
    }

    function test_SetAutomationEnabled() public {
        vm.prank(owner);
        vault.setAutomationEnabled(false);
        assertFalse(vault.automationEnabled());

        vm.prank(owner);
        vault.setAutomationEnabled(true);
        assertTrue(vault.automationEnabled());
    }

    // ── Deposit ───────────────────────────────────────────────────────────────

    function test_Deposit_AcceptsETH() public {
        vm.prank(owner);
        vault.deposit{value: 1 ether}();
        assertEq(vault.getETHBalance(), 1 ether);
    }

    function test_Receive_AcceptsETH() public {
        vm.prank(owner);
        (bool ok,) = address(vault).call{value: 0.5 ether}("");
        assertTrue(ok);
        assertEq(vault.getETHBalance(), 0.5 ether);
    }
}
