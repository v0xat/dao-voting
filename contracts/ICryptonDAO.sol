// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.10;

/** @notice Crypton DAO interface. */
interface ICryptonDAO {
    struct Vote {
        address account;
        uint256 weight;
        address delegate;
    }
    struct Proposal {
        string description;
        bool isOpen;
        bytes callData;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 createdAt;
        Vote[] votes;
        mapping(address => bool) voted;
    }

    /** @notice Return address of the DAO token.
     * @return tokenAddress The address of the token that is used by DAO.
     */
    function getTokenAddress() external view returns (address);

    /** @notice Adds new proposal.
     * @param description Proposal description.
     * @param recipient The address of the recipient.
     * @param callData Calldata to execute if proposal will pass.
     * @return proposalID New proposal ID.
     */
    function addProposal(
        string memory description,
        address recipient,
        bytes memory callData
    ) external returns (uint256 proposalID);

    /** @notice Returns info about proposal by ID.
     * @param id Proposal ID.
     * @return description Proposal description.
     * @return isOpen True if voting is not yet finished.
     * @return votesFor Votes supporting this proposal.
     * @return votesAgainst Votes against this proposal.
     */
    function getProposal(
        uint id
    ) external view returns (
        string memory description,
        bool isOpen,
        uint256 votesFor,
        uint256 votesAgainst
    );

    /** @notice Casting a vote for specified proposal.
     * @param proposalID Proposal ID.
     * @param isSupporting True if voting for / False if voting against.
     */
    function vote(uint256 proposalID, bool isSupporting) external;

    /** @notice Delegating votes to provided address for specified proposal.
     * @param to Address to delegate to.
     * @param proposalID Proposal ID.
     */
    function delegate(address to, uint proposalID) external;

    /** @notice Finishing voting for proposal if conditions satisfied.
     * @param propID Proposal ID.
     */
    function finishVoting(uint256 propID) external;

    event NewProposal(uint256 indexed propID, address indexed creator, string description, address indexed recipient);
    event Voted(uint256 indexed propID, address indexed voter, bool isSupporting);
    event VotingFinished(uint256 id, bool isSuccessful);
}