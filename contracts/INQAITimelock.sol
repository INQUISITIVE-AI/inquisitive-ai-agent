// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// INQAI Timelock Controller — Single Owner Protection
//
// All critical protocol changes require 48-hour timelock delay
// Protects against: instant malicious upgrades, rug pulls, admin key abuse
// Single developer operation — no multi-sig complexity
// ─────────────────────────────────────────────────────────────────────────────

contract INQAITimelock {
    
    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant MIN_DELAY = 2 days;
    uint256 public constant MAX_DELAY = 30 days;
    uint256 public constant GRACE_PERIOD = 14 days;
    
    // ── State ────────────────────────────────────────────────────────────────
    address public owner;
    
    // Queued transactions
    struct Transaction {
        bytes32 id;
        address target;
        uint256 value;
        bytes data;
        uint256 scheduledTime;
        uint256 executeAfter;
        bool executed;
        bool canceled;
    }
    
    mapping(bytes32 => Transaction) public transactions;
    bytes32[] public transactionQueue;
    
    // Delay settings
    uint256 public delay;
    
    // ── Events ───────────────────────────────────────────────────────────────
    event TransactionScheduled(
        bytes32 indexed id,
        address indexed target,
        uint256 value,
        bytes data,
        uint256 executeAfter
    );
    event TransactionExecuted(bytes32 indexed id);
    event TransactionCanceled(bytes32 indexed id);
    event DelayChanged(uint256 newDelay);
    
    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ── Constructor ─────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        delay = MIN_DELAY; // 2 days default
    }
    
    // ── Schedule Transaction ────────────────────────────────────────────────
    function schedule(
        address target,
        uint256 value,
        bytes calldata data,
        string memory description
    ) external onlyOwner returns (bytes32) {
        require(target != address(0), "Invalid target");
        
        bytes32 id = keccak256(abi.encode(target, value, data, description, block.timestamp));
        
        require(transactions[id].scheduledTime == 0, "Already scheduled");
        
        Transaction storage txn = transactions[id];
        txn.id = id;
        txn.target = target;
        txn.value = value;
        txn.data = data;
        txn.scheduledTime = block.timestamp;
        txn.executeAfter = block.timestamp + delay;
        
        transactionQueue.push(id);
        
        emit TransactionScheduled(id, target, value, data, txn.executeAfter);
        
        return id;
    }
    
    // ── Execute Transaction ─────────────────────────────────────────────────
    function execute(bytes32 id) external onlyOwner {
        Transaction storage txn = transactions[id];
        
        require(block.timestamp >= txn.executeAfter, "Timelock active");
        require(block.timestamp <= txn.executeAfter + GRACE_PERIOD, "Expired");
        require(!txn.executed, "Already executed");
        require(!txn.canceled, "Canceled");
        
        txn.executed = true;
        
        // Execute the call
        (bool success, ) = txn.target.call{value: txn.value}(txn.data);
        require(success, "Execution failed");
        
        emit TransactionExecuted(id);
    }
    
    // ── Cancel Transaction ──────────────────────────────────────────────────
    function cancel(bytes32 id) external onlyOwner {
        Transaction storage txn = transactions[id];
        
        require(!txn.executed, "Already executed");
        
        txn.canceled = true;
        
        emit TransactionCanceled(id);
    }
    
    // ── Governance Functions ─────────────────────────────────────────────────
    function changeDelay(uint256 newDelay) external onlyOwner {
        require(newDelay >= MIN_DELAY && newDelay <= MAX_DELAY, "Invalid delay");
        delay = newDelay;
        emit DelayChanged(newDelay);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }
    
    // ── View Functions ─────────────────────────────────────────────────────
    function getTransaction(bytes32 id) external view returns (
        bytes32 id_,
        address target,
        uint256 value,
        uint256 scheduledTime,
        uint256 executeAfter,
        bool executed,
        bool canceled
    ) {
        Transaction storage t = transactions[id];
        return (
            t.id,
            t.target,
            t.value,
            t.scheduledTime,
            t.executeAfter,
            t.executed,
            t.canceled
        );
    }
    
    function getTransactionCount() external view returns (uint256) {
        return transactionQueue.length;
    }
    
    function getQueuedTransactions() external view returns (bytes32[] memory) {
        return transactionQueue;
    }
    
    function canExecute(bytes32 id) external view returns (bool) {
        Transaction storage t = transactions[id];
        return (
            block.timestamp >= t.executeAfter &&
            block.timestamp <= t.executeAfter + GRACE_PERIOD &&
            !t.executed &&
            !t.canceled
        );
    }
}
