import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

// Token metadata
const tokenName = "CryptonToken";
const symbol = "CRPT";
const decimals = 18;
const feeRate = 150; // 1.5% fee
const tenTokens = ethers.utils.parseUnits("10.0", decimals);
const twentyTokens = ethers.utils.parseUnits("20.0", decimals);

// AccessControl roles in bytes32 string
// DEFAULT_ADMIN_ROLE, MINTER_ROLE, BURNER_ROLE
const adminRole = ethers.constants.HashZero;
const minterRole = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
const burnerRole = "0x51f4231475d91734c657e212cfb2e9728a863d53c9057d6ce6ca203d6e5cfd5d";

// Sample DAO data
const firstProp = 0;
const secondProp = 1;
const supported = true;
const notSupported = false;
const propDescr = "description";
const minQuorum = 5000; // 50% quorum
const votingPeriod = 259200; // 3 days
const newMinQuorum = 7000; // 70% quorum
const newVotingPeriod = 86400; // 1 day

describe("CryptonDAO", function () {
  let CryptonDAO: ContractFactory,
    CryptonToken: ContractFactory,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addrs: SignerWithAddress[],
    cryptonDAO: Contract,
    daoToken: Contract,
    ownerBalance: BigNumber,
    aliceBalance: BigNumber,
    bobBalance: BigNumber,
    calldata: string;

  before(async () => {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    CryptonToken = await ethers.getContractFactory("CryptonToken");
    CryptonDAO = await ethers.getContractFactory("CryptonDAO");

    calldata = CryptonToken.interface.encodeFunctionData("changeFeeRecipient", [
      alice.address,
    ]);
  });

  beforeEach(async () => {
    // Deploy token
    daoToken = await CryptonToken.deploy(tokenName, symbol, feeRate);
    await daoToken.deployed();

    // Deploy DAO
    cryptonDAO = await CryptonDAO.deploy(daoToken.address, minQuorum);
    await cryptonDAO.deployed();

    // Grant roles and mint some tokens before transferring admin role to DAO
    await daoToken.grantRole(burnerRole, bob.address);
    await daoToken.grantRole(minterRole, alice.address);
    const amount = ethers.utils.parseUnits("1000.0", decimals);
    await daoToken.connect(alice).mint(owner.address, amount);
    await daoToken.connect(alice).mint(alice.address, amount);
    await daoToken.connect(alice).mint(bob.address, amount);

    // Add users with roles & DAO to whitelist
    await daoToken.addToWhitelist(cryptonDAO.address);
    await daoToken.addToWhitelist(owner.address);
    await daoToken.addToWhitelist(alice.address);
    await daoToken.addToWhitelist(bob.address);
    await daoToken.addToWhitelist(addrs[0].address);

    // Save balances
    ownerBalance = await daoToken.balanceOf(owner.address);
    aliceBalance = await daoToken.balanceOf(alice.address);
    bobBalance = await daoToken.balanceOf(bob.address);

    // Grants token DEFAULT_ADMIN_ROLE to DAO and revoke from token deployer (owner)
    await daoToken.initialize(cryptonDAO.address);
  });

  describe("Deployment", function () {
    it("Should set right DAO contract address", async () => {
      expect(await daoToken.dao()).to.be.equal(cryptonDAO.address);
    });

    it("Should set right DAO token address", async () => {
      expect(await cryptonDAO.token()).to.be.equal(daoToken.address);
    });

    it("Should set right minimum quorum", async () => {
      expect(await cryptonDAO.minQuorum()).to.be.equal(minQuorum);
    });

    it("Should set right voting period", async () => {
      // 3 days in seconds
      expect(await cryptonDAO.votingPeriod()).to.be.equal(votingPeriod);
    });

    it("DAO, owner, Alice & Bob should be in whitelist", async () => {
      expect(await daoToken.isWhitelisted(cryptonDAO.address)).to.equal(true);
      expect(await daoToken.isWhitelisted(owner.address)).to.equal(true);
      expect(await daoToken.isWhitelisted(alice.address)).to.equal(true);
      expect(await daoToken.isWhitelisted(bob.address)).to.equal(true);
    });
  });

  describe("Ownership", function () {
    it("DAO contract should be the admin of the token", async () => {
      expect(await daoToken.hasRole(adminRole, cryptonDAO.address)).to.equal(true);
    });

    it("DAO contract should be self-admin", async () => {
      expect(await cryptonDAO.owner()).to.equal(cryptonDAO.address);
    });

    it("No one can change voting rules", async () => {
      await expect(cryptonDAO.changeVotingRules(0, 0)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      await expect(cryptonDAO.connect(alice).changeVotingRules(0, 0)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("Getting info", function () {
    beforeEach(async () => {
      await cryptonDAO.addProposal(propDescr, daoToken.address, calldata);
      await cryptonDAO.addProposal(propDescr, daoToken.address, calldata);
      await cryptonDAO.addProposal(propDescr, daoToken.address, calldata);
      await cryptonDAO.addProposal(propDescr, daoToken.address, calldata);

      await daoToken.approve(cryptonDAO.address, twentyTokens);
      await cryptonDAO.deposit(twentyTokens);
      await daoToken.connect(alice).approve(cryptonDAO.address, twentyTokens);
      await cryptonDAO.connect(alice).deposit(twentyTokens);
    });

    it("Can get number of proposals", async () => {
      expect(await cryptonDAO.numProposals()).to.be.equal(4);
    });

    it("Can get deposit balance", async () => {
      expect(await cryptonDAO.balances(owner.address)).to.be.equal(twentyTokens);
    });

    it("Can get info about proposal", async () => {
      const propInfo = await cryptonDAO.proposals(firstProp);
      expect(propInfo.description).to.be.equal(propDescr);
      expect(propInfo.target).to.be.equal(daoToken.address);
      expect(propInfo.isOpen).to.be.equal(true);
      expect(propInfo.callData).to.be.equal(calldata);
      expect(propInfo.votesFor).to.be.equal(ethers.constants.Zero);
      expect(propInfo.votesAgainst).to.be.equal(ethers.constants.Zero);
    });

    it("Can get regular vote", async () => {
      await cryptonDAO.vote(firstProp, supported);
      const vote = await cryptonDAO.getUserVote(firstProp, owner.address);
      expect(vote.weight).to.be.equal(twentyTokens);
      expect(vote.delegateWeight).to.be.equal(ethers.constants.Zero);
      expect(vote.decision).to.be.equal(1);
      expect(vote.delegate).to.be.equal(ethers.constants.AddressZero);
    });

    it("Can get delegate vote", async () => {
      // Delegate from owner to Alice
      const delegatorWeight = await cryptonDAO.balances(owner.address);
      await cryptonDAO.delegate(alice.address, firstProp);
      // Alice voting
      const aliceWeight = await cryptonDAO.balances(alice.address);
      await cryptonDAO.connect(alice).vote(firstProp, supported);
      // The owner should be able to see the result of delegation
      const vote = await cryptonDAO.getUserVote(firstProp, owner.address);
      expect(vote.weight).to.be.equal(aliceWeight);
      expect(vote.delegateWeight).to.be.equal(delegatorWeight);
      expect(vote.decision).to.be.equal(1);
      expect(vote.delegate).to.be.equal(ethers.constants.AddressZero);
    });

    it("Can get list of delegators for user by proposal", async () => {
      // Delegate from owner & Bob to Alice
      await cryptonDAO.delegate(alice.address, firstProp);
      await cryptonDAO.connect(bob).delegate(alice.address, firstProp);
      const aliceDelegators = await cryptonDAO.getDelegatesList(alice.address, firstProp);
      expect(aliceDelegators[0]).to.be.equal(owner.address);
      expect(aliceDelegators[1]).to.be.equal(bob.address);
    });

    it("Can get many proposals in range", async () => {
      // Getting 4 proposals
      const proposals = await cryptonDAO.getManyProposals(0, 3);
      expect(proposals.length).to.be.equal(4);
      expect(proposals[0].votesFor).to.be.equal(ethers.constants.Zero);
      expect(proposals[1].votesAgainst).to.be.equal(ethers.constants.Zero);
      expect(proposals[2].target).to.be.equal(daoToken.address);
      expect(proposals[3].description).to.be.equal(propDescr);
    });

    it("Can get decision key by value", async () => {
      expect(await cryptonDAO.getDecisionKeyByValue(0)).to.be.equal("Not participated");
      expect(await cryptonDAO.getDecisionKeyByValue(1)).to.be.equal("Supported");
      expect(await cryptonDAO.getDecisionKeyByValue(2)).to.be.equal("Not supported");
      expect(await cryptonDAO.getDecisionKeyByValue(3)).to.be.equal("Delegate");
      await expect(cryptonDAO.getDecisionKeyByValue(123)).to.be.reverted;
    });
  });

  describe("Proposals", function () {
    it("Any user can add proposal & emit event", async () => {
      expect(await cryptonDAO.addProposal(propDescr, alice.address, calldata))
        .to.emit(cryptonDAO, "NewProposal")
        .withArgs(firstProp, owner.address, propDescr, alice.address);

      expect(
        await cryptonDAO.connect(addrs[0]).addProposal(propDescr, alice.address, calldata)
      )
        .to.emit(cryptonDAO, "NewProposal")
        .withArgs(secondProp, addrs[0].address, propDescr, alice.address);
    });
  });

  describe("Deposits", function () {
    beforeEach(async () => {
      await daoToken.approve(cryptonDAO.address, tenTokens);
    });

    it("Deposit emits event", async () => {
      expect(await cryptonDAO.deposit(tenTokens))
        .to.emit(cryptonDAO, "Deposit")
        .withArgs(owner.address, tenTokens);
    });

    it("Can't deposit without tokens", async () => {
      await expect(cryptonDAO.connect(addrs[0]).deposit(tenTokens)).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance"
      );
    });

    it("Can't make empty deposit", async () => {
      await expect(
        cryptonDAO.connect(addrs[0]).deposit(ethers.constants.Zero)
      ).to.be.revertedWith("Amount can't be zero");
    });
  });

  describe("Withdraws", function () {
    beforeEach(async () => {
      await cryptonDAO.addProposal(propDescr, daoToken.address, calldata);
      await daoToken.approve(cryptonDAO.address, tenTokens);
      await cryptonDAO.deposit(tenTokens);
    });

    it("Withdraw emits event", async () => {
      expect(await cryptonDAO.withdraw(tenTokens))
        .to.emit(cryptonDAO, "Withdraw")
        .withArgs(owner.address, tenTokens);
    });

    it("Can't withdraw above deposit", async () => {
      await expect(cryptonDAO.withdraw(twentyTokens)).to.be.revertedWith(
        "Not enough tokens"
      );
    });

    it("Should not be able to withdraw before end of vote", async () => {
      await cryptonDAO.vote(firstProp, supported);
      await expect(cryptonDAO.withdraw(tenTokens)).to.be.revertedWith(
        "Can't withdraw before end of vote"
      );
    });

    it("Delegate should not be able to withdraw before end of vote", async () => {
      await cryptonDAO.delegate(alice.address, firstProp);
      await expect(cryptonDAO.withdraw(tenTokens)).to.be.revertedWith(
        "Can't withdraw before end of vote"
      );
    });
  });

  describe("Voting system", function () {
    beforeEach(async () => {
      await cryptonDAO.addProposal(propDescr, daoToken.address, calldata);
      await cryptonDAO.addProposal(propDescr, daoToken.address, calldata);

      // Deposit tokens to be able to vote and reach quorum
      await daoToken.approve(cryptonDAO.address, ownerBalance);
      await daoToken.connect(alice).approve(cryptonDAO.address, aliceBalance);
      await daoToken.connect(bob).approve(cryptonDAO.address, bobBalance);
      await cryptonDAO.deposit(ownerBalance);
      await cryptonDAO.connect(alice).deposit(aliceBalance);
      await cryptonDAO.connect(bob).deposit(bobBalance);
    });

    describe("Regular vote", function () {
      it("Should be able to vote and emit event", async () => {
        expect(await cryptonDAO.vote(firstProp, supported))
          .to.emit(cryptonDAO, "Voted")
          .withArgs(firstProp, owner.address, supported);

        expect(await cryptonDAO.vote(secondProp, notSupported))
          .to.emit(cryptonDAO, "Voted")
          .withArgs(secondProp, owner.address, notSupported);
      });

      it("Votes should be counted properly", async () => {
        const weight = await cryptonDAO.balances(owner.address);
        await cryptonDAO.vote(firstProp, supported);
        const propInfo = await cryptonDAO.proposals(firstProp);
        expect(propInfo.votesFor).to.be.equal(weight);
        expect(propInfo.votesAgainst).to.be.equal(ethers.constants.Zero);
      });

      it("Should not be able to vote twice for one proposal", async () => {
        await cryptonDAO.vote(firstProp, supported);
        await expect(cryptonDAO.vote(firstProp, supported)).to.be.revertedWith(
          "Already participated in proposal"
        );
      });

      it("Should not be able to vote after 3 days", async () => {
        await ethers.provider.send("evm_increaseTime", [votingPeriod]);
        await expect(cryptonDAO.vote(firstProp, supported)).to.be.revertedWith(
          "Voting ended"
        );
      });
    });

    describe("Delegating", function () {
      it("Should be able to delegate votes on many proposals", async () => {
        expect(await cryptonDAO.delegate(alice.address, firstProp))
          .to.emit(cryptonDAO, "Delegate")
          .withArgs(firstProp, owner.address, alice.address);
        expect(await cryptonDAO.delegate(alice.address, secondProp))
          .to.emit(cryptonDAO, "Delegate")
          .withArgs(secondProp, owner.address, alice.address);
      });

      it("Delegator should not be able to vote", async () => {
        await cryptonDAO.delegate(alice.address, firstProp);
        await expect(cryptonDAO.vote(firstProp, supported)).to.be.revertedWith(
          "Already participated in proposal"
        );
      });

      // it("Should not be able to delegate without deposit", async () => {
      //   await expect(
      //     cryptonDAO.connect(addrs[0]).delegate(owner.address, firstProp)
      //   ).to.be.revertedWith("Make a deposit to delegate");
      // });

      it("Should not be able to delegate twice", async () => {
        await cryptonDAO.delegate(alice.address, firstProp);
        await expect(cryptonDAO.delegate(bob.address, firstProp)).to.be.revertedWith(
          "Already participated in proposal"
        );
      });

      it("Should not be able to self-delegate", async () => {
        await expect(cryptonDAO.delegate(owner.address, firstProp)).to.be.revertedWith(
          "Can't self-delegate"
        );
      });

      it("Should properly count delegated votes", async () => {
        await cryptonDAO.delegate(alice.address, firstProp);
        await cryptonDAO.connect(alice).vote(firstProp, supported);

        const aliceWeight = await cryptonDAO.balances(alice.address);
        const delegatorWeight = await cryptonDAO.balances(owner.address);
        const weight = aliceWeight.add(delegatorWeight);

        const propInfo = await cryptonDAO.proposals(firstProp);
        expect(propInfo.votesFor).to.be.equal(weight);
        expect(propInfo.votesAgainst).to.be.equal(ethers.constants.Zero);
      });

      it("Should not count delegated weight when delegating a delegate", async () => {
        await cryptonDAO.delegate(alice.address, firstProp);
        await cryptonDAO.connect(alice).delegate(bob.address, firstProp);
        await cryptonDAO.connect(bob).vote(firstProp, supported);

        // Should not count owners weight
        const aliceWeight = await cryptonDAO.balances(alice.address);
        const bobWeight = await cryptonDAO.balances(alice.address);
        const propInfo = await cryptonDAO.proposals(firstProp);
        expect(propInfo.votesFor).to.be.equal(aliceWeight.add(bobWeight));
      });
    });

    describe("Finish voting", function () {
      it("Any user can finish voting", async () => {
        // Skipping 3 days voting period
        await ethers.provider.send("evm_increaseTime", [votingPeriod]);

        await expect(cryptonDAO.connect(addrs[0]).finishVoting(firstProp))
          .to.emit(cryptonDAO, "VotingFinished")
          .withArgs(firstProp, false);
      });

      it("Should be able to withdraw tokens after voting finished", async () => {
        // Owners vote
        await cryptonDAO.vote(firstProp, supported);
        // Bob delegate to Alice
        await cryptonDAO.connect(bob).delegate(alice.address, firstProp);
        // Bob's vote
        await cryptonDAO.connect(alice).vote(firstProp, supported);

        // Skipping 3 days and finishing voting
        await ethers.provider.send("evm_increaseTime", [votingPeriod]);
        await expect(cryptonDAO.finishVoting(firstProp))
          .to.emit(cryptonDAO, "VotingFinished")
          .withArgs(firstProp, true);

        // Check Owner able to withdraw and balances changed
        let balanceBefore = await daoToken.balanceOf(owner.address);
        await cryptonDAO.withdraw(tenTokens);
        let balanceAfter = await daoToken.balanceOf(owner.address);
        expect(balanceAfter).to.equal(balanceBefore.add(tenTokens));

        // Check Bob able to withdraw and balances changed
        balanceBefore = await daoToken.balanceOf(bob.address);
        await cryptonDAO.connect(bob).withdraw(tenTokens);
        balanceAfter = await daoToken.balanceOf(bob.address);
        expect(balanceAfter).to.equal(balanceBefore.add(tenTokens));
      });

      it("Should not be able to finish voting before 3 days from start", async () => {
        await expect(cryptonDAO.finishVoting(firstProp)).to.be.revertedWith(
          "Need to wait 3 days"
        );
      });

      it("Should not be able to finish voting multiple times", async () => {
        await ethers.provider.send("evm_increaseTime", [votingPeriod]);
        await expect(cryptonDAO.finishVoting(firstProp));
        await expect(cryptonDAO.finishVoting(firstProp)).to.be.revertedWith(
          "Voting ended"
        );
      });
    });
  });

  describe("Counting votes & quorum", function () {
    beforeEach(async () => {
      calldata = CryptonDAO.interface.encodeFunctionData("changeVotingRules", [
        newMinQuorum,
        newVotingPeriod,
      ]);
      await cryptonDAO.addProposal(propDescr, cryptonDAO.address, calldata);

      // Deposit tokens to be able to vote and reach quorum
      await daoToken.approve(cryptonDAO.address, ownerBalance);
      await daoToken.connect(alice).approve(cryptonDAO.address, aliceBalance);
      await daoToken.connect(bob).approve(cryptonDAO.address, bobBalance);
    });

    it("votesFor > votesAgainst, quorum reached, proposal executed", async () => {
      // Deposit tokens
      await cryptonDAO.deposit(ownerBalance);
      await cryptonDAO.connect(alice).deposit(aliceBalance);
      await cryptonDAO.connect(bob).deposit(bobBalance);
      // Vote
      await cryptonDAO.vote(firstProp, supported);
      await cryptonDAO.connect(alice).vote(firstProp, supported);
      await cryptonDAO.connect(bob).vote(firstProp, notSupported);
      // Skipping 3 days voting period
      await ethers.provider.send("evm_increaseTime", [votingPeriod]);
      // Finish vote
      await expect(cryptonDAO.finishVoting(firstProp))
        .to.emit(cryptonDAO, "VotingFinished")
        .withArgs(firstProp, true);
      // Check proposal executed and changed voting rules
      expect(await cryptonDAO.minQuorum()).to.be.equal(newMinQuorum);
      expect(await cryptonDAO.votingPeriod()).to.be.equal(newVotingPeriod);
    });

    it("votesFor > votesAgainst, quorum not reached, proposal not executed", async () => {
      // Deposit tokens
      await cryptonDAO.deposit(tenTokens);
      await cryptonDAO.connect(alice).deposit(tenTokens);
      await cryptonDAO.connect(bob).deposit(tenTokens);
      // Vote
      await cryptonDAO.vote(firstProp, supported);
      await cryptonDAO.connect(alice).vote(firstProp, supported);
      await cryptonDAO.connect(bob).vote(firstProp, notSupported);
      // Skipping 3 days voting period
      await ethers.provider.send("evm_increaseTime", [votingPeriod]);
      // Finish vote
      await expect(cryptonDAO.finishVoting(firstProp))
        .to.emit(cryptonDAO, "VotingFinished")
        .withArgs(firstProp, false);
      // Check nothing changed
      expect(await cryptonDAO.minQuorum()).to.be.equal(minQuorum);
      expect(await cryptonDAO.votingPeriod()).to.be.equal(votingPeriod);
    });

    it("votesFor < votesAgainst, quorum reached, proposal not executed", async () => {
      // Deposit tokens
      await cryptonDAO.deposit(ownerBalance);
      await cryptonDAO.connect(alice).deposit(aliceBalance);
      await cryptonDAO.connect(bob).deposit(bobBalance);
      // Vote
      await cryptonDAO.vote(firstProp, supported);
      await cryptonDAO.connect(alice).vote(firstProp, notSupported);
      await cryptonDAO.connect(bob).vote(firstProp, notSupported);
      // Skipping 3 days voting period
      await ethers.provider.send("evm_increaseTime", [votingPeriod]);
      // Finish vote
      await expect(cryptonDAO.finishVoting(firstProp))
        .to.emit(cryptonDAO, "VotingFinished")
        .withArgs(firstProp, false);
      // Check nothing changed
      expect(await cryptonDAO.minQuorum()).to.be.equal(minQuorum);
      expect(await cryptonDAO.votingPeriod()).to.be.equal(votingPeriod);
    });

    it("votesFor < votesAgainst, quorum not reached, proposal not executed", async () => {
      // Deposit tokens
      await cryptonDAO.deposit(tenTokens);
      await cryptonDAO.connect(alice).deposit(tenTokens);
      await cryptonDAO.connect(bob).deposit(tenTokens);
      // Vote
      await cryptonDAO.vote(firstProp, supported);
      await cryptonDAO.connect(alice).vote(firstProp, notSupported);
      await cryptonDAO.connect(bob).vote(firstProp, notSupported);
      // Skipping 3 days voting period
      await ethers.provider.send("evm_increaseTime", [votingPeriod]);
      // Finish vote
      await expect(cryptonDAO.finishVoting(firstProp))
        .to.emit(cryptonDAO, "VotingFinished")
        .withArgs(firstProp, false);
      // Check nothing changed
      expect(await cryptonDAO.minQuorum()).to.be.equal(minQuorum);
      expect(await cryptonDAO.votingPeriod()).to.be.equal(votingPeriod);
    });

    it("votesFor = votesAgainst, quorum reached, proposal not executed", async () => {
      // Deposit tokens
      await cryptonDAO.deposit(ownerBalance);
      await cryptonDAO.connect(alice).deposit(aliceBalance);
      // Vote
      await cryptonDAO.vote(firstProp, supported);
      await cryptonDAO.connect(alice).vote(firstProp, notSupported);
      // Skipping 3 days voting period
      await ethers.provider.send("evm_increaseTime", [votingPeriod]);
      // Finish vote
      await expect(cryptonDAO.finishVoting(firstProp))
        .to.emit(cryptonDAO, "VotingFinished")
        .withArgs(firstProp, false);
      // Check nothing changed
      expect(await cryptonDAO.minQuorum()).to.be.equal(minQuorum);
      expect(await cryptonDAO.votingPeriod()).to.be.equal(votingPeriod);
    });

    it("votesFor = votesAgainst, quorum not reached, proposal not executed", async () => {
      // Deposit tokens
      await cryptonDAO.deposit(tenTokens);
      await cryptonDAO.connect(alice).deposit(tenTokens);
      // Vote
      await cryptonDAO.vote(firstProp, supported);
      await cryptonDAO.connect(alice).vote(firstProp, notSupported);
      // Skipping 3 days voting period
      await ethers.provider.send("evm_increaseTime", [votingPeriod]);
      // Finish vote
      await expect(cryptonDAO.finishVoting(firstProp))
        .to.emit(cryptonDAO, "VotingFinished")
        .withArgs(firstProp, false);
      // Check nothing changed
      expect(await cryptonDAO.minQuorum()).to.be.equal(minQuorum);
      expect(await cryptonDAO.votingPeriod()).to.be.equal(votingPeriod);
    });
  });
});
