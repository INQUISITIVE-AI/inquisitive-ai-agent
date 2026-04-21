// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

interface IVaultV2 {
    function submitSignalsBatch(address[] calldata assets, uint8[] calldata signals) external;
    function getTrackedAssets() external view returns (address[] memory);
}

interface IAutomationCompat {
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

/// @title INQUISITIVE Oracle Consumer
/// @notice Chainlink Functions consumer that fetches AI signals and submits to VaultV2.
///         Keyless: no off-chain signer wallet required. Triggered by Chainlink Automation.
///
/// Architecture:
///   1. Chainlink Automation polls checkUpkeep() every `requestInterval` seconds
///   2. performUpkeep() sends a Chainlink Functions request
///   3. Functions DON executes `source` JavaScript (fetches https://getinqai.com/api/.../cron/oracle)
///   4. fulfillRequest() receives encoded signals, calls vault.submitSignalsBatch()
///   5. Separate Chainlink Automation upkeep on Vault picks up signals and executes trades
///
/// Setup (after deploy):
///   - Create Chainlink Functions subscription at functions.chain.link
///   - Fund subscription with LINK
///   - Add this contract as consumer
///   - Call setSubscriptionId() with the subscription ID
///   - Call setSource() with the JavaScript source
///   - Call setTrackedAssets() with the exact asset list and order
///   - Register this contract with Chainlink Automation (Custom Logic)
///   - Vault owner calls vault.setAIOracle(address(this))
contract InquisitiveOracleConsumer is FunctionsClient, ConfirmedOwner, IAutomationCompat {
    using FunctionsRequest for FunctionsRequest.Request;

    // ── Constants ─────────────────────────────────────────────────────────────
    address public immutable VAULT;

    // ── Config ────────────────────────────────────────────────────────────────
    uint64 public subscriptionId;
    uint32 public callbackGasLimit = 300_000;
    bytes32 public donId;
    string public source; // Chainlink Functions JavaScript source
    uint256 public requestInterval = 600; // 10 minutes

    // The ordered list of assets the Functions source returns signals for.
    // Output byte i corresponds to trackedAssets[i].
    address[] public trackedAssets;

    // ── Last-request state ────────────────────────────────────────────────────
    bytes32 public lastRequestId;
    bytes public lastResponse;
    bytes public lastError;
    uint256 public lastRequestTime;
    uint256 public lastFulfillTime;
    uint256 public totalRequests;
    uint256 public totalFulfilled;
    uint256 public totalSignalsSubmitted;

    // ── Events ────────────────────────────────────────────────────────────────
    event SignalRequestSent(bytes32 indexed requestId, uint256 timestamp);
    event SignalsFulfilled(bytes32 indexed requestId, uint256 signalCount, uint256 timestamp);
    event RequestErrored(bytes32 indexed requestId, bytes error);
    event ConfigUpdated(string field);
    event TrackedAssetsUpdated(uint256 count);

    constructor(
        address router,
        address vault,
        bytes32 _donId,
        uint64 _subscriptionId
    ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        require(router != address(0), "router=0");
        require(vault != address(0), "vault=0");
        VAULT = vault;
        donId = _donId;
        subscriptionId = _subscriptionId;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setSubscriptionId(uint64 _id) external onlyOwner {
        subscriptionId = _id;
        emit ConfigUpdated("subscriptionId");
    }

    function setDonId(bytes32 _donId) external onlyOwner {
        donId = _donId;
        emit ConfigUpdated("donId");
    }

    function setCallbackGasLimit(uint32 _limit) external onlyOwner {
        require(_limit >= 100_000 && _limit <= 300_000, "invalid limit");
        callbackGasLimit = _limit;
        emit ConfigUpdated("callbackGasLimit");
    }

    function setSource(string calldata _source) external onlyOwner {
        source = _source;
        emit ConfigUpdated("source");
    }

    function setRequestInterval(uint256 _seconds) external onlyOwner {
        require(_seconds >= 60 && _seconds <= 86400, "invalid interval");
        requestInterval = _seconds;
        emit ConfigUpdated("requestInterval");
    }

    /// @notice Set the ordered list of tracked assets. Must match the order
    ///         produced by the Functions source code.
    function setTrackedAssets(address[] calldata _assets) external onlyOwner {
        delete trackedAssets;
        for (uint256 i = 0; i < _assets.length; i++) {
            require(_assets[i] != address(0), "zero asset");
            trackedAssets.push(_assets[i]);
        }
        emit TrackedAssetsUpdated(_assets.length);
    }

    // ── Manual trigger (owner) ────────────────────────────────────────────────

    function requestSignals() external onlyOwner returns (bytes32) {
        return _sendSignalRequest();
    }

    // ── Chainlink Automation ──────────────────────────────────────────────────

    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        upkeepNeeded = (block.timestamp >= lastRequestTime + requestInterval)
            && bytes(source).length > 0
            && subscriptionId > 0
            && trackedAssets.length > 0;
        performData = "";
    }

    function performUpkeep(bytes calldata) external override {
        require(block.timestamp >= lastRequestTime + requestInterval, "Cooldown");
        require(bytes(source).length > 0, "No source");
        require(subscriptionId > 0, "No subscription");
        require(trackedAssets.length > 0, "No assets");
        _sendSignalRequest();
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _sendSignalRequest() internal returns (bytes32) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);

        bytes32 requestId = _sendRequest(req.encodeCBOR(), subscriptionId, callbackGasLimit, donId);
        lastRequestId = requestId;
        lastRequestTime = block.timestamp;
        totalRequests++;

        emit SignalRequestSent(requestId, block.timestamp);
        return requestId;
    }

    /// @notice Callback from Chainlink Functions DON. Response is raw bytes,
    ///         one byte per tracked asset: 0=HOLD, 1=BUY, 2=SELL.
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        lastResponse = response;
        lastError = err;
        lastFulfillTime = block.timestamp;
        totalFulfilled++;

        if (err.length > 0) {
            emit RequestErrored(requestId, err);
            return;
        }

        uint256 n = trackedAssets.length;
        if (response.length != n) {
            emit RequestErrored(requestId, abi.encodePacked("length mismatch"));
            return;
        }

        uint8[] memory signals = new uint8[](n);
        address[] memory assets = new address[](n);
        uint256 active = 0;
        for (uint256 i = 0; i < n; i++) {
            uint8 s = uint8(response[i]);
            if (s > 2) s = 0; // clamp invalid to HOLD
            assets[i] = trackedAssets[i];
            signals[i] = s;
            if (s != 0) active++;
        }

        try IVaultV2(VAULT).submitSignalsBatch(assets, signals) {
            totalSignalsSubmitted += active;
            emit SignalsFulfilled(requestId, active, block.timestamp);
        } catch (bytes memory reason) {
            emit RequestErrored(requestId, reason);
        }
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getTrackedAssets() external view returns (address[] memory) {
        return trackedAssets;
    }

    function isReady() external view returns (bool ready, string memory reason) {
        if (bytes(source).length == 0) return (false, "source not set");
        if (subscriptionId == 0) return (false, "subscriptionId not set");
        if (trackedAssets.length == 0) return (false, "trackedAssets not set");
        return (true, "ready");
    }
}
