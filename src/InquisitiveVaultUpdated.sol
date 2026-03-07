// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./INQAI.sol";

contract InquisitiveVaultUpdated {
    INQAI public inqaiToken;
    address public strategy;
    uint256 public performanceFee = 1500; // 15% in basis points
    
    event StrategySet(address indexed newStrategy);
    event PerformanceFeeSet(uint256 newFee);
    event FeesCollected(uint256 amount);
    
    constructor(address _inqaiToken) {
        inqaiToken = INQAI(_inqaiToken);
    }
    
    function setStrategy(address _strategy) external {
        require(_strategy != address(0), "Invalid strategy address");
        strategy = _strategy;
        emit StrategySet(_strategy);
    }
    
    function setPerformanceFee(uint256 _fee) external {
        require(_fee <= 2000, "Fee too high"); // Max 20%
        performanceFee = _fee;
        emit PerformanceFeeSet(_fee);
    }
    
    function collectFees(uint256 _amount) external {
        require(inqaiToken.balanceOf(address(this)) >= _amount, "Insufficient balance");
        emit FeesCollected(_amount);
    }
}
