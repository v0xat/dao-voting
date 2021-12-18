// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.10;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IDAO.sol";

/** @title A simple DAO contract.  */
contract CryptonDAO is IDAO {
    using SafeERC20 for IERC20;

    uint256 public votingPeriod = 3 days;
    uint256 public numProposals;
    uint256 public minQuorum;
    address public token;
    mapping(address => uint256) public balances;
    mapping(address => uint256) public withdrawLock; // address => timestamp
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes; // propID => user => Vote
    mapping(address => mapping(uint256 => address[])) public delegates;

    /** @notice Creates DAO contract.
     * @param _tokenAddress The address of the token that will be used for voting.
     * @param _minQuorum Minimum quorum pct.
     */
    constructor(address _tokenAddress, uint256 _minQuorum) {
        minQuorum = _minQuorum;
        token = _tokenAddress;
    }

    /** @notice Deposits `amount` of tokens to contract.
     * @param amount The amount of tokens to deposit.
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount can't be zero");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    /** @notice Withdraws `amount` of tokens back to user.
     * @param amount The amount of tokens to withdraw.
     */
    function withdraw(uint256 amount) external {
        require(withdrawLock[msg.sender] < block.timestamp, "Can't withdraw before end of vote");
        require(balances[msg.sender] >= amount, "Not enough tokens");
        IERC20(token).safeTransfer(msg.sender, amount);
        balances[msg.sender] -= amount;
        emit Withdraw(msg.sender, amount);
    }

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
    ) external returns (uint256 proposalID) {
        proposalID = numProposals++;
        Proposal storage p = proposals[proposalID];
        p.description = description;
        p.target = target;
        p.callData = callData;
        p.createdAt = block.timestamp;

        emit NewProposal(proposalID, msg.sender, description, target);
    }

    /** @notice Casting a vote for a specific proposal.
     * @param propID Proposal ID.
     * @param decision True if supporting / False if not supporting.
     */
    function vote(uint256 propID, bool decision) external {
        Proposal storage proposal = proposals[propID];
        require(proposal.createdAt + votingPeriod > block.timestamp, "Voting ended");
        require(
            votes[propID][msg.sender].decision == uint8(Decision.NotParticipated),
            "Already participated in proposal"
        );

        countVote(
            propID,
            msg.sender,
            decision ? uint8(Decision.Yes) : uint8(Decision.No),
            address(0)
        );

        emit Voted(propID, msg.sender, decision);
    }

    /** @notice Delegating votes to provided address for a specific proposal.
     * @param to Address to delegate to.
     * @param propID Proposal ID.
     */
    function delegate(address to, uint256 propID) external {   
        Proposal storage proposal = proposals[propID];
        require(
            votes[propID][msg.sender].decision == uint8(Decision.NotParticipated),
            "Already participated in proposal"
        );
        require(to != msg.sender, "Can't self-delegate");
        require(proposal.createdAt + votingPeriod > block.timestamp, "Voting ended");
        // require(balances[msg.sender] > 0, "Make a deposit to delegate");

        countVote(propID, msg.sender, uint8(Decision.Delegate), to);

        emit Delegate(propID, msg.sender, to);
    }

    /** @notice Finishing voting for proposal if conditions satisfied.
     * @param propID Proposal ID.
     */
    function finishVoting(uint256 propID) external {
        require((proposals[propID].createdAt + votingPeriod) <= block.timestamp, "Need to wait 3 days");

        uint256 votesFor = proposals[propID].votesFor;
        uint256 votesAgainst = proposals[propID].votesAgainst;
        
        //          ¯\_(ツ)_/¯
        // console.log("minQuorum: ", minQuorum);
        // console.log("votesFor: ", votesFor);
        // console.log("votesAgainst: ", votesAgainst);
        // console.log("total votes: ", (votesFor + votesAgainst));
        // console.log("total supply: ", IERC20(token).totalSupply());
        // console.log("supply quorum: ", (IERC20(token).totalSupply() / 100) * minQuorum / 10000);

        // If reached quorum and votesFor > votesAgainst, execute callData and emit event
        if ((votesFor + votesAgainst) >= (IERC20(token).totalSupply() * minQuorum / 10000)
            && votesFor > votesAgainst) {
            emit VotingFinished(propID, execute(proposals[propID].callData, proposals[propID].target));
        } else {
            emit VotingFinished(propID, false);
        }
    }

    /** @notice Returns data about user vote for specific proposal.
     * @dev If user delegated his vote to someone else function will return delegate vote.
     * @param propID Proposal ID.
     * @param account The address to get the vote.
     */
    function getUserVote(uint256 propID, address account) public view returns (Vote memory) {
        if (votes[propID][account].decision == uint8(Decision.Delegate)) {
            return getUserVote(propID, votes[propID][account].delegate);
        } else {
            return votes[propID][account];
        }
    }

    /** @notice Returns array of users delegated their votes to `account` on specific proposal.
     * @param account The address to get the vote.
     * @param propID Proposal ID.
     */
    function getDelegatesList(address account, uint256 propID) external view returns (address[] memory) {
        return delegates[account][propID];
    }

    /** @notice Returns data about multiple proposals in range between `start` - `end`.
     * @param start Search start index.
     * @param end Search end index.
     * @return props Array of objects with proposal data.
     */
    function getManyProposals(uint256 start, uint256 end) external view returns (
        Proposal[] memory props
    ) {
        require(start >= 0 && end < numProposals, "Invalid range");

        props = new Proposal[](end + 1);

        for (uint i = start; i <= end; i++) {
            Proposal memory p = proposals[i];
            props[i] = p;
        }

        // uint256[] memory votesFor = new uint[](end);
        // uint256[] memory votesAgainst = new uint[](end);
        // uint256[] memory createdAt = new uint[](end);
        // address[] memory target = new address[](end);
        // string[]  memory description = new string[](end);
        // bytes[]   memory callData = new bytes[](end);
        // for (uint i = start; i < end; i++) {
        //     Proposal memory prop = proposals[i];
        //     votesFor[i] = prop.votesFor;
        //     votesAgainst[i] = prop.votesAgainst;
        //     createdAt[i] = prop.createdAt;
        //     target[i] = prop.target;
        //     description[i] = prop.description;
        //     callData[i] = prop.callData;
        // }
        // return (votesFor, votesAgainst, createdAt, target, description, callData);
    }

    /** @notice Returns Decision enum keys as string.
     * @param _decision Decision id.
     * @return Decision key.
     */
    function getDecisionKeyByValue(Decision _decision) external pure returns (string memory) {
        require(uint8(_decision) <= 4, "Unknown type");
        
        if (Decision.NotParticipated == _decision) return "Not participated";
        if (Decision.Yes == _decision) return "Supported";
        if (Decision.No == _decision) return "Not supported";
        if (Decision.Delegate == _decision) return "Delegate";
    }

    /** @notice Changes voting rules such as min quorum and voting period time.
     * @param _minQuorum New minimum quorum (pct).
     * @param _votingPeriod New voting period (timestamp).
     */
    function changeVotingRules(uint256 _minQuorum, uint256 _votingPeriod) private {
        votingPeriod = _votingPeriod;
        minQuorum = _minQuorum;
    }

    /** @notice Registers a vote or delegate for specific proposal.
     * @param propID Proposal ID.
     * @param from The address of voter.
     * @param decision Decision.
     * @param delegate The address of delegate or 0x0
     */
    function countVote(uint256 propID, address from, uint8 decision, address delegate) private {
        Proposal storage proposal = proposals[propID];

        uint256 weight = balances[from];

        if (decision == uint8(Decision.Yes)) {
            votes[propID][from].weight = weight;
            proposal.votesFor += weight + votes[propID][from].delegateWeight;
        } else if (decision == uint8(Decision.No)) {
            votes[propID][from].weight = weight;
            proposal.votesAgainst += weight + votes[propID][from].delegateWeight;
        } else {
            delegates[delegate][propID].push(from);
            votes[propID][from].delegate = delegate;
            votes[propID][delegate].delegateWeight += weight;
        }

        votes[propID][from].decision = decision;

        withdrawLock[msg.sender] = (proposal.createdAt + votingPeriod) >
            withdrawLock[msg.sender] ?
            (proposal.createdAt + votingPeriod) :
            withdrawLock[msg.sender];
    }

    /** @notice Executing proposal calldata if voting was successful
     * @param callData Calldata to execute.
     * @param target The address to use calldata on.
     * @return success True if call was successfull.
     */
    function execute(bytes memory callData, address target) private returns (bool) {
        (bool success,) = target.call(callData);
        return success;
    }
}