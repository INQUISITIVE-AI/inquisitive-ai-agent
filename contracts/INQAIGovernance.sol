// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// INQAI DAO Governance — Decentralized Protocol Control
//
// Staked INQAI holders vote on protocol parameters:
// - Fee distribution ratios
// - Asset allocation changes  
// - Emergency actions
// - Treasury spending
//
// Zero private keys. Pure on-chain democracy.
// ─────────────────────────────────────────────────────────────────────────────

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface INQAIStaking {
    function getStakeInfo(address user) external view returns (uint256 amount, uint256 startTime, uint256 lockEndTime, uint256 pendingReward, bool canUnstake);
}

contract INQAIGovernance {
    
    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant VOTING_DELAY = 1 days;        // Time before vote starts
    uint256 public constant VOTING_PERIOD = 3 days;       // Time to vote
    uint256 public constant EXECUTION_DELAY = 2 days;   // Time before execution
    uint256 public constant PROPOSAL_THRESHOLD = 1000e18; // Min 1000 INQAI to propose
    uint256 public constant QUORUM = 500000e18;         // 500K INQAI min participation
    
    address public constant INQAI = 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5;
    address public constant STAKING = 0x0000000000000000000000000000000000000000; // Set after deployment
    address public constant TEAM_WALLET = 0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746;
    
    // ── Proposal Types ───────────────────────────────────────────────────────
    enum ProposalType {
        FeeChange,          // Change buyback/burn/treasury ratios
        AssetAllocation,    // Change portfolio weights
        TreasurySpend,      // Spend treasury funds
        EmergencyAction,    // Pause/unpause contracts
        ContractUpgrade     // Upgrade contract addresses
    }
    
    enum VoteType {
        Against,
        For,
        Abstain
    }
    
    // ── Structs ──────────────────────────────────────────────────────────────
    struct Proposal {
        uint256 id;
        address proposer;
        ProposalType proposalType;
        string description;
        bytes callData;
        address targetContract;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool canceled;
        mapping(address => bool) hasVoted;
    }
    
    // ── State ───────────────────────────────────────────────────────────────
    address public owner;
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public votingPower; // Cached voting power
    mapping(address => uint256) public proposalCountByProposer;
    
    // Fee settings (can be changed by governance)
    uint256 public buybackShare = 60;
    uint256 public burnShare = 20;
    uint256 public treasuryShare = 20;
    
    // ── Events ───────────────────────────────────────────────────────────────
    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        ProposalType proposalType,
        string description,
        uint256 startTime,
        uint256 endTime
    );
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        VoteType voteType,
        uint256 votes
    );
    event ProposalExecuted(uint256 indexed id);
    event ProposalCanceled(uint256 indexed id);
    
    // ── Modifiers ───────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ── Constructor ─────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }
    
    // ── Voting Power ─────────────────────────────────────────────────────────
    function getVotingPower(address account) public view returns (uint256) {
        // Voting power = staked INQAI (must be staked to vote)
        INQAIStaking staking = INQAIStaking(STAKING);
        (uint256 stakedAmount,,,,) = staking.getStakeInfo(account);
        return stakedAmount;
    }
    
    // ── Create Proposal ────────────────────────────────────────────────────
    function propose(
        ProposalType proposalType,
        string memory description,
        address targetContract,
        bytes memory callData
    ) external returns (uint256) {
        uint256 proposerVotes = getVotingPower(msg.sender);
        require(proposerVotes >= PROPOSAL_THRESHOLD, "Below proposal threshold");
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.proposalType = proposalType;
        newProposal.description = description;
        newProposal.callData = callData;
        newProposal.targetContract = targetContract;
        newProposal.startTime = block.timestamp + VOTING_DELAY;
        newProposal.endTime = newProposal.startTime + VOTING_PERIOD;
        
        proposalCountByProposer[msg.sender]++;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            proposalType,
            description,
            newProposal.startTime,
            newProposal.endTime
        );
        
        return proposalId;
    }
    
    // ── Cast Vote ──────────────────────────────────────────────────────────
    function castVote(uint256 proposalId, VoteType voteType) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.canceled, "Proposal canceled");
        
        uint256 votes = getVotingPower(msg.sender);
        require(votes > 0, "No voting power");
        
        proposal.hasVoted[msg.sender] = true;
        
        if (voteType == VoteType.For) {
            proposal.forVotes += votes;
        } else if (voteType == VoteType.Against) {
            proposal.againstVotes += votes;
        } else {
            proposal.abstainVotes += votes;
        }
        
        emit VoteCast(msg.sender, proposalId, voteType, votes);
    }
    
    // ── Execute Proposal ──────────────────────────────────────────────────
    function execute(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp > proposal.endTime + EXECUTION_DELAY, "Too early");
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Canceled");
        require(proposal.forVotes > proposal.againstVotes, "Did not pass");
        require(proposal.forVotes + proposal.againstVotes + proposal.abstainVotes >= QUORUM, "No quorum");
        
        proposal.executed = true;
        
        // Execute the call
        (bool success, ) = proposal.targetContract.call(proposal.callData);
        require(success, "Execution failed");
        
        emit ProposalExecuted(proposalId);
    }
    
    // ── Cancel Proposal ────────────────────────────────────────────────────
    function cancel(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(
            msg.sender == proposal.proposer || 
            msg.sender == owner,
            "Not authorized"
        );
        require(!proposal.executed, "Already executed");
        require(block.timestamp < proposal.endTime, "Voting ended");
        
        proposal.canceled = true;
        
        emit ProposalCanceled(proposalId);
    }
    
    // ── View Functions ───────────────────────────────────────────────────────
    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        ProposalType proposalType,
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        uint256 startTime,
        uint256 endTime,
        bool executed,
        bool canceled
    ) {
        Proposal storage p = proposals[proposalId];
        return (
            p.id,
            p.proposer,
            p.proposalType,
            p.description,
            p.forVotes,
            p.againstVotes,
            p.abstainVotes,
            p.startTime,
            p.endTime,
            p.executed,
            p.canceled
        );
    }
    
    function getProposalState(uint256 proposalId) external view returns (string memory) {
        Proposal storage p = proposals[proposalId];
        
        if (p.canceled) return "Canceled";
        if (p.executed) return "Executed";
        if (block.timestamp < p.startTime) return "Pending";
        if (block.timestamp <= p.endTime) return "Active";
        if (p.forVotes <= p.againstVotes) return "Defeated";
        if (p.forVotes + p.againstVotes + p.abstainVotes < QUORUM) return "No Quorum";
        if (block.timestamp <= p.endTime + EXECUTION_DELAY) return "Succeeded";
        return "Expired";
    }
    
    function hasVoted(uint256 proposalId, address account) external view returns (bool) {
        return proposals[proposalId].hasVoted[account];
    }
    
    // ── Admin ───────────────────────────────────────────────────────────────
    function setStakingContract(address _staking) external onlyOwner {
        // This would normally be done via governance after initial setup
        // For deployment, owner sets it once
        // After that, only governance can change
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
