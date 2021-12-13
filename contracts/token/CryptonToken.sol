// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC20.sol";

/** @title Crypton token. */
contract CryptonToken is ERC20, Ownable {
    /** @notice Creates token with custom name, symbol, total supply and fee
     * @param name Name of the token.
     * @param symbol Token symbol.
     * @param totalSupply Total amount of tokens.
     * @param feeRate Transfer fee (percent).
     */
    constructor(string memory name, string memory symbol, uint256 totalSupply, uint feeRate)
        ERC20(name, symbol, totalSupply, feeRate) {
    }

    /** @notice Changes `_feeRate`.
     * @param value New fee rate (percent).
     */
    function changeFeeRate(uint value) external onlyOwner {
        _changeFeeRate(value);
    }

    /** @notice Changes `_feeRecipient`.
     * @param to Address of new recipient.
     */
    function changeFeeRecipient(address to) external onlyOwner {
        _changeFeeRecipient(to);
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