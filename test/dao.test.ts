import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

// Token metadata
const tokenName = "CryptonToken";
const symbol = "CRPT";
const decimals = 2;
const totalSupply = 1000;
const feeRate = ethers.utils.parseUnits("1.5", decimals); // 1.5% fee
const tenTokens = ethers.utils.parseUnits("10.0", decimals);

// AccessControl roles in bytes32 string
// DEFAULT_ADMIN_ROLE, MINTER_ROLE, BURNER_ROLE
const adminRole = ethers.constants.HashZero;
const minterRole =
  "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
const burnerRole =
  "0x51f4231475d91734c657e212cfb2e9728a863d53c9057d6ce6ca203d6e5cfd5d";

// Encode function
const changeFeeRecipientAbi = ["function changeFeeRecipient(address to)"];
const changeFeeRecipientInterface = new ethers.utils.Interface(
  changeFeeRecipientAbi
);

// Sample proposal data
const firstProp = 0;
const secondProp = 1;
const support = true;
const against = false;
const propDescr = "description";
const emptyCallData = ethers.utils.formatBytes32String("");

describe("CryptonDAO", function () {
  let CryptonDAO: ContractFactory, CryptonToken: ContractFactory;
  let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let cryptonDAO: Contract, daoToken: Contract;

  before(async () => {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    CryptonToken = await ethers.getContractFactory("CryptonToken");
    CryptonDAO = await ethers.getContractFactory("CryptonDAO");
  });

  beforeEach(async () => {
    // Deploy token
    daoToken = await CryptonToken.deploy(
      tokenName,
      symbol,
      totalSupply,
      feeRate
    );
    await daoToken.deployed();

    // Deploy DAO
    cryptonDAO = await CryptonDAO.deploy(daoToken.address);
    await cryptonDAO.deployed();

    // Grant roles and mint some tokens before transferring admin role to DAO
    await daoToken.grantRole(burnerRole, bob.address);
    await daoToken.grantRole(minterRole, alice.address);
    const amount = ethers.utils.parseUnits("1000.0", decimals);
    await daoToken.connect(alice).mint(alice.address, amount);
    await daoToken.connect(alice).mint(bob.address, amount);

    // Add users with roles & DAO to whitelist
    await daoToken.addToWhitelist(owner.address);
    await daoToken.addToWhitelist(alice.address);
    await daoToken.addToWhitelist(bob.address);
    await daoToken.addToWhitelist(cryptonDAO.address);

    // Grant token admin role to DAO and revoke from token deployer (owner)
    await daoToken.grantRole(adminRole, cryptonDAO.address);
    await daoToken.revokeRole(adminRole, owner.address);
  });

  describe("Deployment", function () {
    it("Should set right token address", async () => {
      expect(await cryptonDAO.getTokenAddress()).to.be.equal(daoToken.address);
    });

    it("DAO contract should be the admin of the token", async () => {
      expect(await daoToken.hasRole(adminRole, cryptonDAO.address)).to.equal(
        true
      );
    });

    it("DAO, owner, Alice & Bob should be in whitelist", async () => {
      expect(await daoToken.isWhitelisted(cryptonDAO.address)).to.equal(true);
      expect(await daoToken.isWhitelisted(owner.address)).to.equal(true);
      expect(await daoToken.isWhitelisted(alice.address)).to.equal(true);
      expect(await daoToken.isWhitelisted(bob.address)).to.equal(true);
    });
  });

  describe("Proposals", function () {
    it("Can not add proposal without tokens", async () => {
      await expect(
        cryptonDAO
          .connect(addrs[0])
          .addProposal(propDescr, owner.address, emptyCallData)
      ).to.be.revertedWith("Not a member of DAO");
    });

    it("Token holder should be able to add proposal", async () => {
      expect(
        await cryptonDAO.addProposal(propDescr, alice.address, emptyCallData)
      )
        .to.emit(cryptonDAO, "NewProposal")
        .withArgs(firstProp, owner.address, propDescr, alice.address);
    });

    it("Should be able to get correct proposal info", async () => {
      await cryptonDAO.addProposal(propDescr, alice.address, emptyCallData);
      const propInfo = await cryptonDAO.getProposal(firstProp);
      expect(propInfo.description).to.equal(propDescr);
      expect(propInfo.isOpen).to.be.equal(true);
      expect(propInfo.votesFor).to.be.equal(ethers.constants.Zero);
      expect(propInfo.votesAgainst).to.be.equal(ethers.constants.Zero);
    });
  });

  describe("Voting system", function () {
    beforeEach(async () => {
      // Adding empty proposal
      await cryptonDAO.addProposal(propDescr, alice.address, emptyCallData);
      // Adding proposal with calldata
      const callData = changeFeeRecipientInterface.encodeFunctionData(
        "changeFeeRecipient",
        [alice.address]
      );
      await cryptonDAO.addProposal(propDescr, alice.address, callData);
    });

    it("Should not be able to vote for proposal without tokens", async () => {
      await expect(
        cryptonDAO.connect(addrs[0]).vote(firstProp, support)
      ).to.be.revertedWith("Not a member of DAO");
    });

    it("Should be able to vote and emit event", async () => {
      expect(await cryptonDAO.vote(firstProp, support))
        .to.emit(cryptonDAO, "Voted")
        .withArgs(firstProp, owner.address, support);

      expect(await cryptonDAO.vote(secondProp, against))
        .to.emit(cryptonDAO, "Voted")
        .withArgs(secondProp, owner.address, against);
    });

    it("Voter should not be able to transfer tokens before end of vote", async () => {
      await cryptonDAO.vote(firstProp, support);
      await expect(
        daoToken.transfer(alice.address, tenTokens)
      ).to.be.revertedWith("Cant transfer freezed tokens");
    });

    it("Votes should be counted properly", async () => {
      await cryptonDAO.vote(firstProp, support);

      const weight = await daoToken.balanceOf(owner.address);
      const propInfo = await cryptonDAO.getProposal(firstProp);
      expect(propInfo.votesFor).to.be.equal(weight);
      expect(propInfo.votesAgainst).to.be.equal(ethers.constants.Zero);
    });

    it("Should not be able to vote twice for one proposal", async () => {
      await cryptonDAO.vote(firstProp, support);
      await expect(cryptonDAO.vote(firstProp, support)).to.be.revertedWith(
        "Already voted"
      );
    });

    describe("Delegate", function () {
      it("Delegate should not be able to transfer tokens before end of vote", async () => {
        await cryptonDAO.delegate(alice.address, firstProp);
        await expect(
          daoToken.transfer(alice.address, tenTokens)
        ).to.be.revertedWith("Cant transfer freezed tokens");
      });

      it("Should be able to delegate votes on any proposal", async () => {
        await cryptonDAO.delegate(alice.address, firstProp);
        await cryptonDAO.delegate(alice.address, secondProp);
      });

      it("Should not be able to delegate twice", async () => {
        await cryptonDAO.delegate(alice.address, firstProp);
        await expect(
          cryptonDAO.delegate(alice.address, firstProp)
        ).to.be.revertedWith("Already voted");
      });

      it("Should not be able to self-delegate", async () => {
        await expect(
          cryptonDAO.delegate(owner.address, firstProp)
        ).to.be.revertedWith("Can't self-delegate");
      });

      it("Should properly count delegated votes", async () => {
        await cryptonDAO.delegate(alice.address, firstProp);
        await cryptonDAO.connect(alice).vote(firstProp, support);

        const aliceWeight = await daoToken.balanceOf(alice.address);
        const delegatedWeight = await daoToken.balanceOf(owner.address);
        const weight = aliceWeight.add(delegatedWeight);

        const propInfo = await cryptonDAO.getProposal(firstProp);
        expect(propInfo.votesFor).to.be.equal(weight);
        expect(propInfo.votesAgainst).to.be.equal(ethers.constants.Zero);
      });
    });

    describe("Voting finish", function () {
      it("Should not be able to finish voting before 3 days from creation", async () => {
        await expect(cryptonDAO.finishVoting(firstProp)).to.be.revertedWith(
          "Need to wait 3 days"
        );
      });

      it("Should be able to finish voting", async () => {
        // Skipping 3 days voting period
        await ethers.provider.send("evm_increaseTime", [259200]);

        await expect(cryptonDAO.finishVoting(firstProp))
          .to.emit(cryptonDAO, "VotingFinished")
          .withArgs(firstProp, false);
      });

      it("Should not be able to successfully finish voting without reaching quorum", async () => {
        // Voting for proposal
        await cryptonDAO.vote(firstProp, support);

        // Skipping 3 days voting period
        await ethers.provider.send("evm_increaseTime", [259200]);

        await expect(cryptonDAO.finishVoting(firstProp))
          .to.emit(cryptonDAO, "VotingFinished")
          .withArgs(firstProp, false);
      });

      it("Should not be able to successfully finish voting if votesFor < votesAgainst", async () => {
        // Voting for proposal
        await cryptonDAO.vote(firstProp, support);
        // Voting against
        await cryptonDAO.connect(alice).vote(firstProp, against);
        await cryptonDAO.connect(bob).vote(firstProp, against);

        // Skipping 3 days voting period
        await ethers.provider.send("evm_increaseTime", [259200]);

        await expect(cryptonDAO.finishVoting(firstProp))
          .to.emit(cryptonDAO, "VotingFinished")
          .withArgs(firstProp, false);
      });

      it("Should be able to successfully finish voting and execute calldata", async () => {
        // Voting for proposal
        await cryptonDAO.vote(secondProp, support);
        await cryptonDAO.connect(alice).vote(secondProp, support);
        await cryptonDAO.connect(bob).vote(secondProp, support);

        // Skipping 3 days voting period
        await ethers.provider.send("evm_increaseTime", [259200]);

        await expect(cryptonDAO.finishVoting(secondProp))
          .to.emit(cryptonDAO, "VotingFinished")
          .withArgs(secondProp, true);

        // Token transfer fee recipient should have changed to Alice
        expect(await daoToken.getFeeRecipient()).to.be.equal(alice.address);
      });

      it("Tokens should be unfreezed and able to transfer after voting finished", async () => {
        // Owners vote
        await cryptonDAO.vote(firstProp, support);
        // Bob delegate to Alice
        await cryptonDAO.connect(bob).delegate(alice.address, firstProp);
        // Bob's vote
        await cryptonDAO.connect(alice).vote(firstProp, support);

        // Check that tokens freezed
        await expect(
          daoToken.transfer(alice.address, tenTokens)
        ).to.be.revertedWith("Cant transfer freezed tokens");

        // Skipping 3 days and finishing voting
        await ethers.provider.send("evm_increaseTime", [259200]);
        await cryptonDAO.finishVoting(firstProp);

        // Check Owner able to transfer and balances changed
        let balanceBefore = await daoToken.balanceOf(alice.address);
        await daoToken.transfer(alice.address, tenTokens);
        let balanceAfter = await daoToken.balanceOf(alice.address);
        expect(balanceAfter).to.equal(balanceBefore.add(tenTokens));

        // Check Bob able to transfer and balances changed
        balanceBefore = await daoToken.balanceOf(bob.address);
        await daoToken.connect(bob).transfer(alice.address, tenTokens);
        // Check that balances changed
        balanceAfter = await daoToken.balanceOf(bob.address);
        expect(balanceAfter).to.equal(balanceBefore.sub(tenTokens));
      });
    });
  });
});
