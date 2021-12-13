// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.10;

import "hardhat/console.sol";
import "./token/CryptonToken.sol";

contract CryptonDAO {
    struct Proposal {
        string description;
        // address recipient;
        bool isOpen;
        bytes callData;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 createdAt;
        mapping(address => bool) voters;
    }

    uint256 constant private VOTING_PERIOD = 3 days;
    CryptonToken private token;
    address private tokenAddress;
    uint256 private numProposals;
    mapping(uint256 => Proposal) private proposals;
    mapping(uint256 => mapping(address => uint256)) private delegates;

    event NewProposal(uint256 indexed propID, address indexed creator, string description, address indexed recipient);
    event Voted(uint256 indexed propID, address indexed voter, bool isSupporting);
    event VotingFinished(uint256 id);

    constructor(address _tokenAddress) {
        tokenAddress = _tokenAddress;
        token = CryptonToken(_tokenAddress);
    }

    modifier onlyDAOMember {
        require(token.balanceOf(msg.sender) > 0, "Not a member of DAO");
        _;
    }

    modifier alreadyVoted(uint256 id, address voter) {
        require(!proposals[id].voters[voter], "Already voted");
        _;
    }

    function getTokenAddress() external view returns (address) {
        return tokenAddress;
    }

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
        
        // token.transfer(address(this), token.balanceOf(msg.sender));
        proposals[proposalID].voters[msg.sender] = true;

        emit Voted(proposalID, msg.sender, isSupporting);
    }

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

        proposals[proposalID].voters[msg.sender] = true;
        delegates[proposalID][to] += token.balanceOf(msg.sender);
    }

    function finishVoting(uint256 id) external onlyDAOMember {
        require((proposals[id].createdAt + VOTING_PERIOD) <= block.timestamp, "Need to wait 3 days");


        emit VotingFinished(id);
    }

    function execute(bytes memory callData) private {
        tokenAddress.call(callData);
    }
}
