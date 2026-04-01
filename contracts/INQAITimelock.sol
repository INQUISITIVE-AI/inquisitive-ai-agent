// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// INQAI Timelock Controller — Multi-Signature Critical Function Protection
//
// All critical protocol changes require:
// - 2-of-3 multi-sig approval
// - 48-hour timelock delay
// - Final execution by governance
//
// Protects against: instant malicious upgrades, rug pulls, admin key abuse
// ─────────────────────────────────────────────────────────────────────────────

contract INQAITimelock {
    
    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant MIN_DELAY = 2 days;
    uint256 public constant MAX_DELAY = 30 days;
    uint256 public constant GRACE_PERIOD = 14 days;
    uint256 public constant REQUIRED_SIGNATURES = 2;
    uint256 public constant TOTAL_SIGNERS = 3;
    
    // ── State ────────────────────────────────────────────────────────────────
    address public owner; // Governance contract
    
    // Multi-sig signers
    mapping(address => bool) public isSigner;
    address[] public signers;
    
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
        mapping(address => bool) signatures;
        uint256 signatureCount;
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
    event TransactionSigned(bytes32 indexed id, address indexed signer);
    event TransactionExecuted(bytes32 indexed id);
    event TransactionCanceled(bytes32 indexed id);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event DelayChanged(uint256 newDelay);
    
    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlySigner() {
        require(isSigner[msg.sender], "Not signer");
        _;
    }
    
    // ── Constructor ─────────────────────────────────────────────────────────
    constructor(
        address _signer1,
        address _signer2,
        address _signer3
    ) {
        require(_signer1 != address(0) && _signer2 != address(0) && _signer3 != address(0), "Invalid signer");
        require(_signer1 != _signer2 && _signer2 != _signer3 && _signer1 != _signer3, "Duplicate signers");
        
        owner = msg.sender;
        delay = MIN_DELAY;
        
        isSigner[_signer1] = true;
        isSigner[_signer2] = true;
        isSigner[_signer3] = true;
        
        signers.push(_signer1);
        signers.push(_signer2);
        signers.push(_signer3);
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
    
    // ── Sign Transaction ────────────────────────────────────────────────────
    function sign(bytes32 id) external onlySigner {
        Transaction storage txn = transactions[id];
        
        require(txn.scheduledTime > 0, "Not scheduled");
        require(!txn.executed, "Already executed");
        require(!txn.canceled, "Canceled");
        require(!txn.signatures[msg.sender], "Already signed");
        require(block.timestamp < txn.executeAfter + GRACE_PERIOD, "Expired");
        
        txn.signatures[msg.sender] = true;
        txn.signatureCount++;
        
        emit TransactionSigned(id, msg.sender);
    }
    
    // ── Execute Transaction ─────────────────────────────────────────────────
    function execute(bytes32 id) external {
        Transaction storage txn = transactions[id];
        
        require(txn.signatureCount >= REQUIRED_SIGNATURES, "Not enough signatures");
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
    function cancel(bytes32 id) external {
        Transaction storage txn = transactions[id];
        
        require(
            msg.sender == owner || isSigner[msg.sender],
            "Not authorized"
        );
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
        bool canceled,
        uint256 signatureCount
    ) {
        Transaction storage t = transactions[id];
        return (
            t.id,
            t.target,
            t.value,
            t.scheduledTime,
            t.executeAfter,
            t.executed,
            t.canceled,
            t.signatureCount
        );
    }
    
    function hasSigned(bytes32 id, address signer) external view returns (bool) {
        return transactions[id].signatures[signer];
    }
    
    function getSigners() external view returns (address[] memory) {
        return signers;
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
            t.signatureCount >= REQUIRED_SIGNATURES &&
            block.timestamp >= t.executeAfter &&
            block.timestamp <= t.executeAfter + GRACE_PERIOD &&
            !t.executed &&
            !t.canceled
        );
    }
}
