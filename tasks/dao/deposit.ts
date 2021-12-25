import fs from "fs";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

task("deposit", "Deposit tokens to DAO contract")
  .addParam("amount", "The amount of tokens to deposit")
  .addOptionalParam("from", "The address to deposit from. By default grab first signer")
  .addParam("dao", "The address of the DAO")
  .setAction(async (taskArgs, hre) => {
    const network = hre.network.name;
    const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
    for (const parameter in envConfig) {
      process.env[parameter] = envConfig[parameter];
    }

    const cryptonToken = await hre.ethers.getContractAt(
      process.env.CRYPTON_TOKEN_NAME as string,
      process.env.CRYPTON_TOKEN_ADDRESS as string
    );

    const dao = await hre.ethers.getContractAt(
      process.env.CRYPTON_DAO_NAME as string,
      taskArgs.dao as string
    );

    let account: SignerWithAddress;
    if (taskArgs.from) {
      account = await hre.ethers.getSigner(taskArgs.from);
    } else {
      [account] = await hre.ethers.getSigners();
    }

    const accountBalance = await cryptonToken.balanceOf(account.address);
    console.log(
      `Account balance: ${ethers.utils.formatUnits(
        accountBalance,
        process.env.CRYPTON_TOKEN_DECIMALS
      )} tokens`
    );

    const amount = ethers.utils.parseUnits(
      taskArgs.amount,
      process.env.CRYPTON_TOKEN_DECIMALS
    );

    console.log(`\nApproving ${taskArgs.amount} tokens to ${dao.address}...\n`);
    await cryptonToken.connect(account).approve(dao.address, amount);
    console.log(`Done!`);

    console.log(`\nMaking a deposit...\n`);
    await dao.connect(account).deposit(amount);
    console.log(`Done!`);
  });
