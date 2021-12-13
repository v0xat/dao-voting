// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ERC20.sol";

/** @title Crypton token. */
contract CryptonToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE  = keccak256("BURNER_ROLE ");

    uint256 private feeRate;
    address private feeRecipient;
    mapping(address => bool) private whitelisted;

    /** @notice Creates token with custom name, symbol, total supply and fee
     * @param name Name of the token.
     * @param symbol Token symbol.
     * @param totalSupply Total amount of tokens.
     * @param feeRate_ Transfer fee (percent).
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint feeRate_
    )
        ERC20(name, symbol, totalSupply)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        feeRate = feeRate_;
        feeRecipient = msg.sender;
    }

    /// @notice Returns current transfer fee rate.
    function getFeeRate() external view returns (uint) {
        return feeRate;
    }

    /// @notice Returns the address of transfer fee recipient.
    function getFeeRecipient() external view returns (address) {
        return feeRecipient;
    }

    /** @notice Checks if user is in whitelist.
     * @param account Address of the user to check.
     * @return True if user is in the list.
     */
    function isWhitelisted(address account) external view returns (bool) {
        return whitelisted[account];
    }

    /** @notice Adds user to whitelist.
     * @dev Whitelisted users dont have to pay transfer fee.
     * @param account Address of the user to whitelist.
     */
    function addToWhitelist(address account) external {
        whitelisted[account] = true;
    }

    /** @notice Removes user from whitelist.
     * @param account Address of the user to remove from whitelist.
     */
    function removeFromWhitelist(address account) external {
        whitelisted[account] = false;
    }

    /** @notice Changes `feeRate`.
     * @param value New fee rate (pct).
     */
    function changeFeeRate(uint256 value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeRate = value;
    }

    /** @notice Changes `feeRecipient`.
     * @param to Address of new recipient.
     */
    function changeFeeRecipient(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeRecipient = to;
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

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
        
        if (!whitelisted[from]) {
            // uint fee = (amount * feeRate) / (100 * 10 ** _decimals);
            uint fee = (amount / 100) * feeRate / 100;

            // console.log("_balances[from]: ", _balances[from]);
            // console.log("feeRate: ", _feeRate);
            // console.log("amount: ", amount);
            // console.log("fee: ", fee);

            require(balanceOf(from) >= (amount + fee), "Not enough to pay fee");
            _burn(from, fee);
            _mint(feeRecipient, fee);
        }
    }
}