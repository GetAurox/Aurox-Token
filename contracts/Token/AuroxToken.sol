pragma solidity 0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./TokenVesting.sol";
import "./IAuroxToken.sol";

// Ignoring the 19 states declaration for simpler deployment for the Aurox guys
contract AuroxToken is IAuroxToken, ERC20, Ownable {
    TokenVesting public reservesVestingContract;
    TokenVesting public teamRewardVestingContract;

    constructor(
        address uniSwapAddress,
        address teamRewardAddress,
        address exchangeListingReserve,
        address reservesAddress
    ) public ERC20("Aurox Token", "URUS") {
        // Mint the supply to the ERC20 address
        _mint(_msgSender(), 1000000 ether);

        transfer(address(this), 770000 ether);

        // Create the vesting contracts
        createVestingContracts(reservesAddress, teamRewardAddress);
    }

    // Expose a new function to update the allowance of a new contract
    function setAllowance(address allowanceAddress)
        external
        override
        onlyOwner
    {
        _approve(address(this), allowanceAddress, 650000 ether);

        emit SetNewContractAllowance(allowanceAddress);
    }

    function createVestingContracts(
        address reservesAddress,
        address teamRewardAddress
    ) private {
        // Start vesting now
        // Distribute linearly over 1 year
        reservesVestingContract = new TokenVesting(
            reservesAddress,
            // Original reserves start time
            1630315384,
            0,
            365 days,
            false
        );
        // Distribute rewards over 1 yr
        teamRewardVestingContract = new TokenVesting(
            teamRewardAddress,
            // Original Team vesting start time
            1646040184,
            0,
            730 days,
            false
        );
        // Start Time -> 1646040184
        // Rough difference between start time and now: 15.3 days
        // End Time -> 1709112184

        // Because it hasn't started yet, can just update the start time to be: block.timestamp + 15 days
    }
}
