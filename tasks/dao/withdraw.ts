import fs from "fs";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

task("withdraw", "Withdraw tokens from DAO contract")
  .addParam("amount", "The amount of tokens to withdraw")
  .addOptionalParam("account", "The address of the account to withdraw to")
  .addParam("dao", "The address of the DAO")
  .setAction(async (taskArgs, hre) => {
    const network = hre.network.name;
    const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
    for (const parameter in envConfig) {
      process.env[parameter] = envConfig[parameter];
    }

    const dao = await hre.ethers.getContractAt(
      process.env.CRYPTON_DAO_NAME as string,
      taskArgs.dao as string
    );

    let account: SignerWithAddress;
    if (taskArgs.account) {
      account = await hre.ethers.getSigner(taskArgs.account);
    } else {
      [account] = await hre.ethers.getSigners();
    }

    const amount = ethers.utils.parseUnits(
      taskArgs.amount,
      process.env.CRYPTON_TOKEN_DECIMALS
    );

    console.log(`\nMaking a withdraw...\n`);
    await dao.connect(account).withdraw(amount);
    console.log(`Done!`);
  });
