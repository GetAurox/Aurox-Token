pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract Token is ERC20 {
    constructor() ERC20("TOK", "TK") {}

    // Expose a new function to update the allowance of a new contract
    function setAllowance(address allowanceAddress) external {
        _approve(address(this), allowanceAddress, 650000 ether);
    }

    function increaseTokenAllowance(address _address, uint256 _amount)
        external
    {
        increaseAllowance(_address, _amount);
    }

    function mint(address _address, uint256 _amount) external {
        _mint(_address, _amount);
    }
}
