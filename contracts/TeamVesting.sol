// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/finance/VestingWallet.sol";

contract TeamVesting is VestingWallet {
    IERC20 public immutable token;
    address public immutable beneficiaryAddress;
    
    event TokensReleased(uint256 amount);
    event VestingStarted(uint256 timestamp);
    
    constructor(
        address tokenAddress,
        address beneficiary,
        uint64 startTimestamp,
        uint64 durationSeconds
    ) VestingWallet(beneficiary, startTimestamp, durationSeconds) {
        token = IERC20(tokenAddress);
        beneficiaryAddress = beneficiary;
        emit VestingStarted(startTimestamp);
    }
    
    function release() public override {
        uint256 releasable = vestedAmount(block.timestamp, 0);
        if (releasable > 0) {
            token.transfer(beneficiaryAddress, releasable);
            emit TokensReleased(releasable);
        }
    }
    
    function vestedAmount(uint256 timestamp, uint256) public view override returns (uint256) {
        return _vestingSchedule(token.balanceOf(address(this)), timestamp);
    }
}
