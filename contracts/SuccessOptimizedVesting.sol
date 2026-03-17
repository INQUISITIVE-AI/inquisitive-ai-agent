// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SuccessOptimizedVesting is Ownable {
    IERC20 public immutable token;
    
    // Vesting parameters
    address public beneficiary;
    uint256 public totalAllocation;
    uint256 public cliffDuration;
    uint256 public totalDuration;
    uint256 public startTime;
    
    // Staged release parameters
    uint256[] public stageAmounts;
    uint256[] public stageDurations;
    
    // Tracking
    uint256 public totalReleased;
    mapping(uint256 => uint256) public stageReleased;
    
    event TokensReleased(uint256 amount, uint256 timestamp);
    event VestingInitialized(
        address indexed beneficiary,
        uint256 totalAllocation,
        uint256 cliffDuration,
        uint256 totalDuration
    );
    
    constructor() {
        token = IERC20(address(0)); // Will be set in initialize
    }
    
    function initialize(
        address _beneficiary,
        uint256 _totalAllocation,
        uint256 _cliffDuration,
        uint256 _totalDuration,
        uint256[] memory _stageAmounts,
        uint256[] memory _stageDurations
    ) external onlyOwner {
        require(beneficiary == address(0), "Already initialized");
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_totalAllocation > 0, "Invalid allocation");
        require(_stageAmounts.length == _stageDurations.length, "Array length mismatch");
        
        beneficiary = _beneficiary;
        totalAllocation = _totalAllocation;
        cliffDuration = _cliffDuration;
        totalDuration = _totalDuration;
        startTime = block.timestamp;
        stageAmounts = _stageAmounts;
        stageDurations = _stageDurations;
        
        emit VestingInitialized(_beneficiary, _totalAllocation, _cliffDuration, _totalDuration);
    }
    
    function release() external {
        require(msg.sender == beneficiary || msg.sender == owner(), "Not authorized");
        
        uint256 releasable = calculateReleasable();
        require(releasable > 0, "Nothing to release");
        
        totalReleased += releasable;
        token.transfer(beneficiary, releasable);
        
        emit TokensReleased(releasable, block.timestamp);
    }
    
    function calculateReleasable() public view returns (uint256) {
        uint256 elapsed = block.timestamp - startTime;
        uint256 totalReleasable = 0;
        uint256 periodStart = 0;
        
        for (uint256 i = 0; i < stageAmounts.length; i++) {
            uint256 periodEnd = periodStart + (stageDurations[i] * 30 days);
            
            if (elapsed >= periodEnd) {
                // Full stage amount is available
                totalReleasable += stageAmounts[i];
            } else if (elapsed > periodStart) {
                // Partial stage amount based on time elapsed
                uint256 stageElapsed = elapsed - periodStart;
                uint256 stageProgress = (stageElapsed * 10000) / (stageDurations[i] * 30 days);
                totalReleasable += (stageAmounts[i] * stageProgress) / 10000;
            }
            
            periodStart = periodEnd;
        }
        
        return totalReleasable - totalReleased;
    }
    
    function vestedAmount() external view returns (uint256) {
        return calculateReleasable();
    }
    
    function getStageCount() external view returns (uint256) {
        return stageAmounts.length;
    }
}
