import fs from "fs";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { task } from "hardhat/config";

task("deposit", "Deposit tokens to DAO contract")
  .addParam("amount", "The amount of tokens to deposit")
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

    const [owner] = await hre.ethers.getSigners();
    const ownerBalance = await cryptonToken.balanceOf(owner.address);
    console.log(
      `Owner balance: ${ethers.utils.formatUnits(
        ownerBalance,
        process.env.CRYPTON_TOKEN_DECIMALS
      )} tokens`
    );

    const amount = ethers.utils.parseUnits(
      taskArgs.amount,
      process.env.CRYPTON_TOKEN_DECIMALS
    );

    console.log(`\nApproving ${taskArgs.amount} tokens to ${dao.address}...\n`);
    await cryptonToken.approve(dao.address, amount);
    console.log(`Done!`);

    console.log(`\nMaking a deposit...\n`);
    await dao.deposit(amount);
    console.log(`Done!`);
  });
