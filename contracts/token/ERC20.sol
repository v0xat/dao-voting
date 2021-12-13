// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.10;

import "./IERC20.sol";
import "hardhat/console.sol";

/** @title Implementation of the IERC20 interface  */
contract ERC20 is IERC20 {
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;
    uint8 private _decimals;
    uint256 private _feeRate;
    address private _feeRecipient;
    mapping(address => bool) whitelisted;
    mapping(address => uint256) private _balances;
    mapping(address => mapping (address => uint256)) private _allowances;

    /** @notice Creates token with custom name, symbol, total supply and fee
     * @dev Set's `msg.sender` as `_feeRecipient` and gives him totalSuppply
     * @param name_ Name of the token.
     * @param symbol_ Token symbol.
     * @param totalSupply_ Total amount of tokens.
     * @param feeRate_ Transfer fee (pct).
     */
    constructor(string memory name_, string memory symbol_, uint256 totalSupply_, uint256 feeRate_) {
        _name = name_;
        _symbol = symbol_;
        _decimals = 2;
        _totalSupply = totalSupply_ * 10 ** _decimals;
        _balances[msg.sender] = _totalSupply;
        _feeRate = feeRate_;
        _feeRecipient = msg.sender;
    }

    /// @notice Returns token full name.
    function name() external view returns (string memory) {
        return _name;
    }

    /// @notice Returns token symbol.
    function symbol() external view returns (string memory) {
        return _symbol;
    }

    /// @notice Returns how many decimals token have.
    function decimals() external view returns (uint8) {
        return _decimals;
    }

    /// @notice Returns total amount of tokens in existance.
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /// @notice Returns current transfer fee rate.
    function feeRate() external view returns (uint) {
        return _feeRate;
    }

    /// @notice Returns the address of transfer fee recipient.
    function feeRecipient() external view returns (address) {
        return _feeRecipient;
    }

    /** @notice Returns amount of tokens owned by `account`.
     * @param account The address of the token holder.
     * @return balance The amount of tokens in uint.
     */
    function balanceOf(
        address account
    ) external view returns (uint256 balance) {
        return _balances[account];
    }

    /** @notice Calls _transfer function.
     * @param to The address of recipient.
     * @param amount The amount of tokens to transfer.
     * @return True if transfer was successfull.
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /** @notice Returns the number of tokens 
     * approved by an `owner` to a `spender`.
     * @param owner Address of the owner of approved tokens.
     * @param spender The approved address.
     * @return The amount of tokens in uint.
     */
    function allowance(
        address owner, address spender
    ) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    /** @notice Approves `spender` to use `amount` of function caller tokens.
     * @param spender The address of recipient.
     * @param amount The amount of tokens to approve.
     * @return True if approved successfully.
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /** @notice Allows a spender to spend an allowance by calling _transfer.
     * @param owner The address of spender.
     * @param recipient The address of recipient.
     * @param amount The amount of tokens to transfer.
     * @return True if transfer was successfull.
     */
    function transferFrom(
        address owner,
        address recipient,
        uint256 amount
    )
        external
        returns (
            bool
        )
    {
        require(_allowances[owner][msg.sender] >= amount, "Not enough tokens");

        _transfer(owner, recipient, amount);
        _allowances[owner][msg.sender] -= amount;

        return true;
    }

    /// @notice Returns true if `account` is in whitelist.
    function isWhitelisted(address account) public view returns (bool) {
        return whitelisted[account];
    }

    /** @notice Changes `_feeRate`.
     * @param value New fee rate (pct).
     */
    function _changeFeeRate(uint256 value) internal {
        _feeRate = value;
    }

    /** @notice Changes `_feeRecipient`.
     * @param to Address of new recipient.
     */
    function _changeFeeRecipient(address to) internal {
        _feeRecipient = to;
    }

    /** @notice Burns `amount` of tokens.
     * @dev Decreases `_totalSupply` and `_balances[from]` 
     * on specified `amount`. Emits `Transfer` event.
     * @param from The address to burn tokens on.
     * @param amount The amount of tokens to burn.
     * @return True if burning was successfull.
     */
    function _burn(address from, uint256 amount) internal returns (bool) {
        require(_totalSupply >= amount, "Not enough tokens to burn");
        require(_balances[from] >= amount, "Not enough tokens to burn");

        _totalSupply -= amount;
        _balances[from] -= amount;
        
        emit Transfer(from, address(0), amount);
        return true;
    }

    /** @notice Mints `amount` of tokens to specified address.
     * @dev Increases `_totalSupply` and `_balances[msg.sender]` 
     * on specified `amount`. Emits `Transfer` event.
     * @param to The address to mint tokens on.
     * @param amount The amount of tokens to mint.
     * @return True if minting was successfull.
     */
    function _mint(address to, uint256 amount) internal returns (bool) {
        _totalSupply += amount;
        _balances[to] += amount;
        
        emit Transfer(address(0), to, amount);
        return true;
    }

    function _addToWhitelist(address account) internal {
        whitelisted[account] = true;
    }

    function _removeFromWhitelist(address account) internal {
        whitelisted[account] = false;
    }

    /** @notice Transfers `amount` of tokens to specified address.
     * @param from The address of spender.
     * @param to The address of recipient.
     * @param amount The amount of tokens to transfer.
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) private {
        require(_balances[from] >= amount, "Not enough tokens");

        if (!isWhitelisted(from)) {
            _beforeTokenTransfer(from, amount);
        }

        _balances[from] -= amount;
        _balances[to] += amount;

        emit Transfer(from, to, amount);
    }

    /** @notice Hook that is called before any transfer of tokens.
     * @dev Charges fee from address `from` in favor of `_feeRecipient`.
     * @param from The address of spender.
     * @param amount The amount of tokens to transfer.
     */
    function _beforeTokenTransfer(
        address from,
        uint256 amount
    ) private {
        uint fee = (amount * _feeRate) / (100 * 10 ** _decimals);
        // uint fee = (amount / 100) * _feeRate / 100;

        // console.log("_balances[from]: ", _balances[from]);
        // console.log("feeRate: ", _feeRate);
        // console.log("amount: ", amount);
        // console.log("fee: ", fee);

        require(_balances[from] >= (amount + fee), "Not enough to pay fee");
        
        _balances[from] -= fee;
        _balances[_feeRecipient] += fee;
    }
}