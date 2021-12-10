// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.10;

import "./IERC20.sol";

/** @title Implementation of the IERC20 interface  */
contract ERC20 is IERC20 {
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    mapping(address => uint256) private _balances;
    mapping(address => mapping (address => uint256)) private _allowances;

    /** @dev Creates token with custom name, symbol and amount
     * @param name_ Name of the token.
     * @param symbol_ Token symbol.
     * @param total Total amount of tokens.
     */
    constructor(string memory name_, string memory symbol_, uint256 total) {
        _name = name_;
        _symbol = symbol_;
        _decimals = 18;
        _totalSupply = total * 10 ** _decimals;
        _balances[msg.sender] = _totalSupply;
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

    /** @notice Burns `amount` of tokens.
     * @dev Decreases `_totalSupply` and `_balances[msg.sender]` 
     * on specified `amount`. Emits `Transfer` event.
     * @param amount The amount of tokens to burn.
     * @return True if burning was successfull.
     */
    function _burn(uint256 amount) internal returns (bool) {
        require(_totalSupply >= amount, "Not enough tokens to burn");
        require(_balances[msg.sender] >= amount, "Not enough tokens to burn");

        _totalSupply -= amount;
        _balances[msg.sender] -= amount;
        
        emit Transfer(msg.sender, address(0), amount);
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

    /** @notice Transfers `amount` of tokens to specified address.
     * @param to The address of recipient.
     * @param amount The amount of tokens to transfer.
     */
    function _transfer(address from, address to, uint256 amount) private {
        require(_balances[from] >= amount, "Not enough tokens");

        _balances[from] -= amount;
        _balances[to] += amount;

        emit Transfer(from, to, amount);
    }
}