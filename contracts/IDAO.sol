// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.10;

/** @notice Crypton DAO interface. */
interface IDAO {
    enum Decision { NotParticipated, Yes, No, Delegate }

    struct Vote {
        uint256 weight;
        uint8 decision;
        address delegate;
    }

    struct Proposal {
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 createdAt;
        address target;
        string description;
        bytes callData;
        mapping(address => uint256) delegates;
        mapping(address => Vote) votes;
        mapping(address => mapping(address => uint256)) history;
    }

    /** @notice Deposits `amount` of tokens to contract.
     * @param amount The amount of tokens to deposit.
     */
    function deposit(uint256 amount) external;

    /** @notice Withdraws `amount` of tokens back to user.
     * @param amount The amount of tokens to withdraw.
     */
    function withdraw(uint256 amount) external;

    /** @notice Adds new proposal.
     * @param description Proposal description.
     * @param target The address to use calldata on.
     * @param callData Calldata to execute if proposal will pass.
     * @return proposalID New proposal ID.
     */
    function addProposal(
        string memory description,
        address target,
        bytes memory callData
    ) external returns (uint256 proposalID);

    /** @notice Casting a vote for a specific proposal.
     * @param propID Proposal ID.
     * @param decision True if supporting / False if not supporting.
     */
    function vote(uint256 propID, bool decision) external;

    /** @notice Delegating votes to provided address for a specific proposal.
     * @param to Address to delegate to.
     * @param propID Proposal ID.
     */
    function delegate(address to, uint256 propID) external;

    /** @notice Finishing voting for proposal if conditions satisfied.
     * @param propID Proposal ID.
     */
    function finishVoting(uint256 propID) external;

    /** @notice Returns data about user vote for specific proposal.
     * @param propID Proposal ID.
     * @param account The address to get the vote.
     */
    function getUserVote(uint256 propID, address account) external view returns (Vote memory);

    /** @notice Returns data about multiple proposals in range
     * between `start` - `end`.
     * @param start Search start index.
     * @param end Search end index.
     * @return
     */
    function getManyProposals(uint256 start, uint256 end) external view returns (
        uint256[] memory, uint256[] memory, string[] memory, address[] memory
    );

    /** @notice Returns Decision enum keys as string.
     * @param _decision Decision id.
     * @return Decision key.
     */
    function getDecisionKeyByValue(Decision _decision) external pure returns (string memory);

    event NewProposal(uint256 indexed propID, address indexed creator, string description, address indexed target);
    event Deposit(address indexed account, uint256 amount);
    event Withdraw(address indexed account, uint256 amount);
    event Voted(uint256 indexed propID, address indexed voter, bool decision);
    event Delegate(uint256 indexed propID, address indexed delegator, address indexed delegate);
    event VotingFinished(uint256 id, bool successful);
}