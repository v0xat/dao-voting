import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

describe("CryptonToken", function () {
  let CryptonToken: ContractFactory;
  let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress;
  let cryptonToken: Contract;

  const tokenName = "CryptonToken";
  const symbol = "CRPT";
  const decimals = 18;
  const totalSupply = 1000;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    CryptonToken = await ethers.getContractFactory("CryptonToken");
  });

  beforeEach(async () => {
    cryptonToken = await CryptonToken.deploy(tokenName, symbol, totalSupply);
    await cryptonToken.deployed();
  });

  describe("Deployment", function () {
    it("Has a name", async () => {
      expect(await cryptonToken.name()).to.equal(tokenName);
    });

    it("Has a symbol", async () => {
      expect(await cryptonToken.symbol()).to.equal(symbol);
    });

    it("Has 18 decimals", async () => {
      expect(await cryptonToken.decimals()).to.be.equal(decimals);
    });

    it("Should set the right owner", async () => {
      expect(await cryptonToken.owner()).to.equal(owner.address);
    });

    it("Deployment should assign the total supply of CRPT to the owner", async () => {
      const ownerBalance = await cryptonToken.balanceOf(owner.address);
      expect(await cryptonToken.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Ownership", function () {
    it("Non owner should not be able to transfer ownership", async () => {
      await expect(
        cryptonToken.connect(alice).transferOwnership(alice.address)
      ).to.be.revertedWith("Only owner can do this");
    });

    it("Owner can transfer ownership", async () => {
      await cryptonToken.transferOwnership(alice.address);
      expect(await cryptonToken.owner()).to.be.equal(alice.address);
    });
  });

  describe("Transactions", function () {
    it("Should transfer CRPT between accounts", async () => {
      // Transfer 200 CRPT from owner to alice
      await cryptonToken.transfer(
        alice.address,
        ethers.utils.parseUnits("200.0", decimals)
      );
      const aliceBalance = await cryptonToken.balanceOf(alice.address);
      expect(aliceBalance).to.equal(ethers.utils.parseUnits("200.0", decimals));

      // Transfer 100 CRPT from alice to bob
      await cryptonToken
        .connect(alice)
        .transfer(bob.address, ethers.utils.parseUnits("100.0", decimals));
      const bobBalance = await cryptonToken.balanceOf(bob.address);
      expect(bobBalance).to.equal(ethers.utils.parseUnits("100.0", decimals));
    });

    it("Should fail if sender doesn't have enough CRPT", async () => {
      // Trying to send 10 CRPT from alice (0 CRPT) to owner (1000 CRPT)
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

    it("Can not transfer above the amount", async () => {
      await expect(
        cryptonToken.transfer(
          alice.address,
          ethers.utils.parseUnits("1001.0", decimals)
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

      // Transfer 200 CRPT from owner to alice
      await cryptonToken.transfer(
        alice.address,
        ethers.utils.parseUnits("200.0", decimals)
      );
      // Transfer another 100 CRPT from owner to bob
      await cryptonToken.transfer(
        bob.address,
        ethers.utils.parseUnits("100.0", decimals)
      );

      // Check balances
      const finalOwnerBalance = await cryptonToken.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(
        initialOwnerBalance.sub(ethers.utils.parseUnits("300.0", decimals))
      );

      const aliceBalance = await cryptonToken.balanceOf(alice.address);
      expect(aliceBalance).to.equal(ethers.utils.parseUnits("200.0", decimals));

      const bobBalance = await cryptonToken.balanceOf(bob.address);
      expect(bobBalance).to.equal(ethers.utils.parseUnits("100.0", decimals));
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
        ethers.utils.parseUnits("200.0", decimals)
      );
      const allowance = await cryptonToken.allowance(
        owner.address,
        alice.address
      );
      expect(allowance).to.be.equal(ethers.utils.parseUnits("200.0", decimals));
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
      // Approve alice to use 10 tokens
      const amount = ethers.utils.parseUnits("10.0", decimals);
      await cryptonToken.approve(alice.address, amount);

      // Send most of owner tokens to bob
      await cryptonToken.transfer(
        bob.address,
        ethers.utils.parseUnits("995.0", decimals)
      );

      // Check that we can't transfer all amount (only 5 left)
      await expect(
        cryptonToken
          .connect(alice)
          .transferFrom(owner.address, alice.address, amount)
      ).to.be.revertedWith("Not enough tokens");
    });
  });

  describe("Burning", function () {
    it("Non owner should not be able to burn tokens", async () => {
      const burnAmount = ethers.utils.parseUnits("10.0", decimals);
      await expect(
        cryptonToken.connect(alice).burn(burnAmount)
      ).to.be.revertedWith("Only owner can do this");
    });

    it("Owner should be able to burn tokens", async () => {
      const burnAmount = ethers.utils.parseUnits("10.0", decimals);
      await expect(cryptonToken.burn(burnAmount))
        .to.emit(cryptonToken, "Transfer")
        .withArgs(owner.address, ethers.constants.AddressZero, burnAmount);
    });

    it("Token supply & balance should change after burning", async () => {
      const initialSupply = await cryptonToken.totalSupply();

      const burnAmount = ethers.utils.parseUnits("10.0", decimals);
      await cryptonToken.burn(burnAmount);

      const currentSupply = await cryptonToken.totalSupply();
      expect(currentSupply).to.equal(initialSupply.sub(burnAmount));

      const ownerBalance = await cryptonToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(initialSupply.sub(burnAmount));
    });

    it("Can not burn above total supply", async () => {
      const burnAmount = ethers.utils.parseUnits("1050.0", decimals);
      await expect(cryptonToken.burn(burnAmount)).to.be.revertedWith(
        "Not enough tokens to burn"
      );
    });
  });

  describe("Minting", function () {
    it("Non owner should not be able to mint tokens", async () => {
      const mintAmount = ethers.utils.parseUnits("10.0", decimals);
      await expect(
        cryptonToken.connect(alice).mint(alice.address, mintAmount)
      ).to.be.revertedWith("Only owner can do this");
    });

    it("Owner should be able to mint tokens", async () => {
      const mintAmount = ethers.utils.parseUnits("10.0", decimals);
      await expect(cryptonToken.mint(owner.address, mintAmount))
        .to.emit(cryptonToken, "Transfer")
        .withArgs(ethers.constants.AddressZero, owner.address, mintAmount);
    });

    it("Token supply & balance should change after minting", async () => {
      const initialSupply = await cryptonToken.totalSupply();

      const mintAmount = ethers.utils.parseUnits("10.0", decimals);
      await cryptonToken.mint(owner.address, mintAmount);

      const currentSupply = await cryptonToken.totalSupply();
      expect(currentSupply).to.equal(initialSupply.add(mintAmount));

      const ownerBalance = await cryptonToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(initialSupply.add(mintAmount));
    });
  });
});
