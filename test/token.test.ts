import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

// Token metadata
const tokenName = "CryptonToken";
const symbol = "CRPT";
const decimals = 2;
const totalSupply = 1000;
const feeRate = ethers.utils.parseUnits("1.5", decimals); // 1.5% fee

// AccessControl roles in bytes32 string
// DEFAULT_ADMIN_ROLE, MINTER_ROLE, BURNER_ROLE
const adminRole = ethers.constants.HashZero;
const minterRole =
  "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
const burnerRole =
  "0x51f4231475d91734c657e212cfb2e9728a863d53c9057d6ce6ca203d6e5cfd5d";

describe("CryptonToken", function () {
  let CryptonToken: ContractFactory;
  let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress;
  let cryptonToken: Contract;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    CryptonToken = await ethers.getContractFactory("CryptonToken");
  });

  beforeEach(async () => {
    cryptonToken = await CryptonToken.deploy(
      tokenName,
      symbol,
      totalSupply,
      feeRate
    );
    await cryptonToken.deployed();

    // Grant roles to Alice & Bob
    await cryptonToken.grantRole(minterRole, alice.address);
    await cryptonToken.grantRole(burnerRole, bob.address);

    // Add owner and Alice to whitelist so they dont have to pay fee
    await cryptonToken.addToWhitelist(owner.address);
    await cryptonToken.addToWhitelist(alice.address);
  });

  describe("Deployment", function () {
    it("Has a name", async () => {
      expect(await cryptonToken.name()).to.be.equal(tokenName);
    });

    it("Has a symbol", async () => {
      expect(await cryptonToken.symbol()).to.be.equal(symbol);
    });

    it(`Has ${decimals} decimals`, async () => {
      expect(await cryptonToken.decimals()).to.be.equal(decimals);
    });

    it(`Has ${feeRate}% fee rate`, async () => {
      expect(await cryptonToken.getFeeRate()).to.be.equal(feeRate);
    });

    it("Should set the right admin role", async () => {
      expect(await cryptonToken.hasRole(adminRole, owner.address)).to.equal(
        true
      );
    });

    it("Should set the right minter role", async () => {
      expect(await cryptonToken.hasRole(minterRole, alice.address)).to.equal(
        true
      );
    });

    it("Should set the right burner role", async () => {
      expect(await cryptonToken.hasRole(burnerRole, bob.address)).to.equal(
        true
      );
    });

    it("Deployment should assign the total supply of tokens to the owner", async () => {
      const ownerBalance = await cryptonToken.balanceOf(owner.address);
      expect(await cryptonToken.totalSupply()).to.be.equal(ownerBalance);
    });

    it("Should set owner as fee recipient", async () => {
      expect(await cryptonToken.getFeeRecipient()).to.be.equal(owner.address);
    });

    it("Should add owner & Alice to whitelist", async () => {
      expect(await cryptonToken.isWhitelisted(owner.address)).to.equal(true);
      expect(await cryptonToken.isWhitelisted(alice.address)).to.equal(true);
    });
  });

  describe("Ownership", function () {
    it("Only admin can grant roles", async () => {
      await expect(
        cryptonToken.connect(alice).grantRole(burnerRole, alice.address)
      ).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${adminRole}`
      );
    });
  });

  describe("Fees", function () {
    it("Should not be able to change fee rate without DEFAULT_ADMIN_ROLE", async () => {
      const newFee = ethers.utils.parseUnits("2", decimals);
      await expect(
        cryptonToken.connect(alice).changeFeeRate(newFee)
      ).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${adminRole}`
      );
    });

    it("Admin can change fee rate", async () => {
      const newFee = ethers.utils.parseUnits("3.5", decimals);
      await cryptonToken.changeFeeRate(newFee);
      expect(await cryptonToken.getFeeRate()).to.be.equal(newFee);
    });

    it("Should not be able to change fee recipient without DEFAULT_ADMIN_ROLE", async () => {
      await expect(
        cryptonToken.connect(alice).changeFeeRecipient(alice.address)
      ).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${adminRole}`
      );
    });

    it("Admin can change fee recipient", async () => {
      await cryptonToken.changeFeeRecipient(alice.address);
      expect(await cryptonToken.getFeeRecipient()).to.be.equal(alice.address);
    });

    it("Transfer should not charge fee from whitelisted users", async () => {
      const amount: BigNumber = ethers.utils.parseUnits("10.0", decimals);
      await expect(() =>
        cryptonToken.transfer(alice.address, amount)
      ).to.changeTokenBalances(cryptonToken, [owner, alice], [-amount, amount]);
    });

    it("Transfer should charge fee from spender in favor of fee recipient", async () => {
      // Transfer some tokens to Bob because other signers are whitelisted
      await cryptonToken.transfer(
        bob.address,
        ethers.utils.parseUnits("20.0", decimals)
      );

      const amount: BigNumber = ethers.utils.parseUnits("10.0", decimals);
      const fee: BigNumber = amount.div(100).mul(feeRate).div(100);
      await expect(() =>
        cryptonToken.connect(bob).transfer(alice.address, amount)
      ).to.changeTokenBalances(
        cryptonToken,
        [bob, alice],
        [-amount.add(fee), amount]
      );
    });
  });

  describe("Freeze", function () {
    it("Only admin should be able to freeze tokens", async () => {
      await expect(
        cryptonToken.connect(alice).freezeTokens(owner.address)
      ).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${adminRole}`
      );
    });

    it("Only admin should be able to unfreeze tokens", async () => {
      await expect(
        cryptonToken.connect(alice).unfreezeTokens(owner.address)
      ).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${adminRole}`
      );
    });

    it("Should not be able to transfer tokens if user in freezed list", async () => {
      // Admin freezing his own address wow
      await cryptonToken.freezeTokens(owner.address);
      await expect(
        cryptonToken.transfer(
          alice.address,
          ethers.utils.parseUnits("10.0", decimals)
        )
      ).to.be.revertedWith("Cant transfer freezed tokens");
    });
  });

  describe("Transfer", function () {
    it("Should transfer tokens between accounts", async () => {
      // Transfer 20 tokens from owner to Alice
      let amount: BigNumber = ethers.utils.parseUnits("20.0", decimals);
      await cryptonToken.transfer(alice.address, amount);
      const aliceBalance = await cryptonToken.balanceOf(alice.address);
      expect(aliceBalance).to.equal(amount);

      // Transfer 10 tokens from Alice to Bob
      amount = ethers.utils.parseUnits("10.0", decimals);
      await cryptonToken.connect(alice).transfer(bob.address, amount);
      const bobBalance = await cryptonToken.balanceOf(bob.address);
      expect(bobBalance).to.equal(amount);
    });

    it("Should fail if sender doesn't have enough tokens", async () => {
      // Trying to send 10 tokens from Alice (0 tokens) to owner (1000 tokens)
      await expect(
        cryptonToken
          .connect(alice)
          .transfer(owner.address, ethers.utils.parseUnits("10.0", decimals))
      ).to.be.revertedWith("Not enough tokens");

      // Owner balance shouldn't have changed
      const ownerBalance = await cryptonToken.balanceOf(owner.address);
      expect(await cryptonToken.balanceOf(owner.address)).to.equal(
        ownerBalance
      );
    });

    it("Should fail if sender doesn't have enough tokens to pay fee", async () => {
      // Transfer some tokens to Bob because other signers are whitelisted
      await cryptonToken.transfer(
        bob.address,
        ethers.utils.parseUnits("20.0", decimals)
      );

      // Trying to send all Bob's tokens to Alice
      await expect(
        cryptonToken
          .connect(bob)
          .transfer(alice.address, ethers.utils.parseUnits("20.0", decimals))
      ).to.be.revertedWith("Not enough to pay fee");
    });

    it("Can not transfer above the amount", async () => {
      await expect(
        cryptonToken.transfer(
          alice.address,
          ethers.utils.parseUnits("1000.01", decimals)
        )
      ).to.be.revertedWith("Not enough tokens");
    });

    it("Transfer should emit event", async () => {
      const from = owner.address;
      const to = alice.address;
      const amount = ethers.utils.parseUnits("10.0", decimals);

      await expect(cryptonToken.transfer(to, amount))
        .to.emit(cryptonToken, "Transfer")
        .withArgs(from, to, amount);
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await cryptonToken.balanceOf(owner.address);

      // Transfer 20 tokens from owner to Alice
      await cryptonToken.transfer(
        alice.address,
        ethers.utils.parseUnits("20.0", decimals)
      );
      // Transfer another 10 tokens from owner to Bob
      await cryptonToken.transfer(
        bob.address,
        ethers.utils.parseUnits("10.0", decimals)
      );

      // Check balances
      const finalOwnerBalance = await cryptonToken.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(
        initialOwnerBalance.sub(ethers.utils.parseUnits("30.0", decimals))
      );

      const aliceBalance = await cryptonToken.balanceOf(alice.address);
      expect(aliceBalance).to.equal(ethers.utils.parseUnits("20.0", decimals));

      const bobBalance = await cryptonToken.balanceOf(bob.address);
      expect(bobBalance).to.equal(ethers.utils.parseUnits("10.0", decimals));
    });
  });

  describe("Allowance", function () {
    it("Approve should emit event", async () => {
      const amount = ethers.utils.parseUnits("10.0", decimals);
      await expect(cryptonToken.approve(alice.address, amount))
        .to.emit(cryptonToken, "Approval")
        .withArgs(owner.address, alice.address, amount);
    });

    it("Allowance should change after token approve", async () => {
      await cryptonToken.approve(
        alice.address,
        ethers.utils.parseUnits("20.0", decimals)
      );
      const allowance = await cryptonToken.allowance(
        owner.address,
        alice.address
      );
      expect(allowance).to.be.equal(ethers.utils.parseUnits("20.0", decimals));
    });

    it("TransferFrom should emit event", async () => {
      const amount = ethers.utils.parseUnits("10.0", decimals);
      await cryptonToken.approve(alice.address, amount);
      await expect(
        cryptonToken
          .connect(alice)
          .transferFrom(owner.address, alice.address, amount)
      )
        .to.emit(cryptonToken, "Transfer")
        .withArgs(owner.address, alice.address, amount);
    });

    it("Can not TransferFrom above the approved amount", async () => {
      const amount = ethers.utils.parseUnits("10.0", decimals);
      const aboveAmount = ethers.utils.parseUnits("20.0", decimals);
      await cryptonToken.approve(alice.address, amount);
      await expect(
        cryptonToken
          .connect(alice)
          .transferFrom(owner.address, alice.address, aboveAmount)
      ).to.be.revertedWith("Not enough tokens");
    });

    it("Can not TransferFrom if owner does not have enough tokens", async () => {
      // Approve Alice to use 100 tokens
      const amount = ethers.utils.parseUnits("100.0", decimals);
      await cryptonToken.approve(alice.address, amount);

      // Send most of owner tokens to Bob
      await cryptonToken.transfer(
        bob.address,
        ethers.utils.parseUnits("950.0", decimals)
      );

      // Check that Alice can't transfer all amount (only 50 left)
      await expect(
        cryptonToken
          .connect(alice)
          .transferFrom(owner.address, alice.address, amount)
      ).to.be.revertedWith("Not enough tokens");
    });
  });

  // In our tests Bob has the BURNER_ROLE
  describe("Burning", function () {
    it("Should not be able to burn tokens without BURNER_ROLE", async () => {
      const burnAmount = ethers.utils.parseUnits("10.0", decimals);
      await expect(
        cryptonToken.burn(alice.address, burnAmount)
      ).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLowerCase()} is missing role ${burnerRole}`
      );
    });

    it("Burner should be able to burn tokens", async () => {
      const burnAmount = ethers.utils.parseUnits("10.0", decimals);
      await expect(cryptonToken.connect(bob).burn(owner.address, burnAmount))
        .to.emit(cryptonToken, "Transfer")
        .withArgs(owner.address, ethers.constants.AddressZero, burnAmount);
    });

    it("Token supply & balance should change after burning", async () => {
      const initialSupply = await cryptonToken.totalSupply();

      const burnAmount = ethers.utils.parseUnits("10.0", decimals);
      await cryptonToken.connect(bob).burn(owner.address, burnAmount);

      const currentSupply = await cryptonToken.totalSupply();
      expect(currentSupply).to.equal(initialSupply.sub(burnAmount));

      const ownerBalance = await cryptonToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(initialSupply.sub(burnAmount));
    });

    it("Can not burn above total supply", async () => {
      const burnAmount = ethers.utils.parseUnits("1050.0", decimals);
      await expect(
        cryptonToken.connect(bob).burn(owner.address, burnAmount)
      ).to.be.revertedWith("Not enough tokens to burn");
    });
  });

  // In out tests Alice has the MINTER_ROLE
  describe("Minting", function () {
    it("Should not be able to mint tokens without MINTER_ROLE", async () => {
      const mintAmount = ethers.utils.parseUnits("10.0", decimals);
      await expect(
        cryptonToken.mint(alice.address, mintAmount)
      ).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLowerCase()} is missing role ${minterRole}`
      );
    });

    it("Minter should be able to mint tokens", async () => {
      const mintAmount = ethers.utils.parseUnits("10.0", decimals);
      await expect(cryptonToken.connect(alice).mint(owner.address, mintAmount))
        .to.emit(cryptonToken, "Transfer")
        .withArgs(ethers.constants.AddressZero, owner.address, mintAmount);
    });

    it("Token supply & balance should change after minting", async () => {
      const initialSupply = await cryptonToken.totalSupply();

      const mintAmount = ethers.utils.parseUnits("10.0", decimals);
      await cryptonToken.connect(alice).mint(owner.address, mintAmount);

      const currentSupply = await cryptonToken.totalSupply();
      expect(currentSupply).to.equal(initialSupply.add(mintAmount));

      const ownerBalance = await cryptonToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(initialSupply.add(mintAmount));
    });
  });
});
