// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.10;

import "hardhat/console.sol";
import "./ICryptonDAO.sol";
import "./token/CryptonToken.sol";


/** @title A simple DAO contract.  */
contract CryptonDAO is ICryptonDAO {
    uint256 constant private VOTING_PERIOD = 3 days;
    CryptonToken private token;
    address private tokenAddress;
    uint256 private numProposals;
    mapping(uint256 => Proposal) private proposals;
    mapping(uint256 => mapping(address => uint256)) private delegates;

    /** @notice Creates DAO contract.
     * @param _tokenAddress The address of the token that wiil be used for voting.
     */
    constructor(address _tokenAddress) {
        tokenAddress = _tokenAddress;
        token = CryptonToken(_tokenAddress);
    }

    modifier onlyDAOMember {
        require(token.balanceOf(msg.sender) > 0, "Not a member of DAO");
        _;
    }

    modifier alreadyVoted(uint256 id, address account) {
        require(!proposals[id].voted[account], "Already voted");
        _;
    }

    /** @notice Return address of the DAO token.
     * @return tokenAddress The address of the token that is used by DAO.
     */
    function getTokenAddress() external view returns (address) {
        return tokenAddress;
    }

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
    ) external onlyDAOMember returns (uint256 proposalID) {
        proposalID = numProposals++;
        Proposal storage p = proposals[proposalID];
        p.description = description;
        p.isOpen = true;
        p.callData = callData;
        p.createdAt = block.timestamp;
        // p.recipient = recipient;

        emit NewProposal(proposalID, msg.sender, description, recipient);
    }

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
    ) {
        return (
            proposals[id].description,
            proposals[id].isOpen,
            proposals[id].votesFor,
            proposals[id].votesAgainst
        );
    }

    /** @notice Casting a vote for specified proposal.
     * @param proposalID Proposal ID.
     * @param isSupporting True if voting for / False if voting against.
     */
    function vote(
        uint256 proposalID,
        bool isSupporting
    )
        external
        onlyDAOMember
        alreadyVoted(proposalID, msg.sender)
    {
        require(proposals[proposalID].isOpen, "Voting ended");

        uint256 weight = token.balanceOf(msg.sender) + delegates[proposalID][msg.sender];

        if (isSupporting) {
            proposals[proposalID].votesFor += weight;
        } else {
            proposals[proposalID].votesAgainst += weight;
        }
        
        proposals[proposalID].voted[msg.sender] = true;

        Vote memory v;
        v.weight = weight;
        v.account = msg.sender;
        proposals[proposalID].votes.push(v);

        token.freezeTokens(msg.sender);

        emit Voted(proposalID, msg.sender, isSupporting);
    }

    /** @notice Delegating votes to provided address for specified proposal.
     * @param to Address to delegate to.
     * @param proposalID Proposal ID.
     */
    function delegate(
        address to,
        uint proposalID
    ) 
        external
        onlyDAOMember
        alreadyVoted(proposalID, msg.sender)
        alreadyVoted(proposalID, to)
    {
        require(to != msg.sender, "Can't self-delegate");
        require(proposals[proposalID].isOpen, "Voting ended");

        proposals[proposalID].voted[msg.sender] = true;

        uint256 weight = token.balanceOf(msg.sender) + delegates[proposalID][msg.sender];

        Vote memory v;
        v.weight = weight;
        v.account = msg.sender;
        v.delegate = to;
        proposals[proposalID].votes.push(v);
        
        delegates[proposalID][to] += weight;
        
        token.freezeTokens(msg.sender);
    }

    /** @notice Finishing voting for proposal if conditions satisfied.
     * @param propID Proposal ID.
     */
    function finishVoting(uint256 propID) external onlyDAOMember {
        require((proposals[propID].createdAt + VOTING_PERIOD) <= block.timestamp, "Need to wait 3 days");

        // console.log("total votes: ", proposals[propID].votesFor + proposals[propID].votesAgainst);
        // console.log("quorum: ", token.totalSupply() / 2);

        uint votesFor = proposals[propID].votesFor;
        uint votesAgainst = proposals[propID].votesAgainst;
        // If reached 50% quorum and votesFor > votesAgainst, execute callData
        if ((votesFor + votesAgainst) >= (token.totalSupply() / 2)
            && votesFor > votesAgainst) {
            emit VotingFinished(propID, true);
            execute(proposals[propID].callData);
        } else {
            emit VotingFinished(propID, false);
        }

        unfreezeTokens(propID);
    }

    /** @notice Executing proposal calldata if voting was successful
     * @param callData Calldata to execute.
     * @return success True if call was successfull.
     */
    function execute(bytes memory callData) private returns (bool) {
        (bool success, bytes memory data) = tokenAddress.call(callData);
        return success;
    }

    /** @notice Allows DAO members to transfer tokens.
     * @param propID Proposal ID.
     */
    function unfreezeTokens(uint256 propID) private {
        for(uint256 i = 0; i < proposals[propID].votes.length; i++) {
            token.unfreezeTokens(proposals[propID].votes[i].account);
        }
    }
}