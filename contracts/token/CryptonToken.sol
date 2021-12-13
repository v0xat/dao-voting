// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ERC20.sol";

/** @title Crypton token. */
contract CryptonToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE  = keccak256("BURNER_ROLE ");

    /** @notice Creates token with custom name, symbol, total supply and fee
     * @param name Name of the token.
     * @param symbol Token symbol.
     * @param totalSupply Total amount of tokens.
     * @param feeRate Transfer fee (percent).
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint feeRate
    )
        ERC20(name, symbol, totalSupply, feeRate)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /** @notice Changes `_feeRate`.
     * @param value New fee rate (percent).
     */
    function changeFeeRate(uint value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _changeFeeRate(value);
    }

    /** @notice Changes `_feeRecipient`.
     * @param to Address of new recipient.
     */
    function changeFeeRecipient(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _changeFeeRecipient(to);
    }

    function addToWhitelist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _addToWhitelist(account);
    }

    function removeFromWhitelist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _removeFromWhitelist(account);
    }

    /** @notice Calls burn function to "burn" specified amount of tokens.
     * @param from The address to burn tokens on.
     * @param amount The amount of tokens to burn.
     */
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    /** @notice Calls mint function to "mint" specified amount of tokens.
     * @param to The address to mint on.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}