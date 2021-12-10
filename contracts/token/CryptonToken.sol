// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.10;

import "../Ownable.sol";
import "./ERC20.sol";

/** @title Crypton token. */
contract CryptonToken is ERC20, Ownable {
    /** @notice Creates token with custom name, symbol and amount.
     * @param name Name of the token.
     * @param symbol Token symbol.
     * @param totalAmount Total amount of tokens.
     */
    constructor(string memory name, string memory symbol, uint256 totalAmount)
        ERC20(name, symbol, totalAmount) {
    }

    /** @notice Calls burn function to "burn" specified amount of tokens.
     * @param amount The amount of tokens to burn.
     */
    function burn(uint256 amount) external onlyOwner {
        _burn(amount);
    }

    /** @notice Calls mint function to "mint" specified amount of tokens.
     * @param to The address to mint on.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}