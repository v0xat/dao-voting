import fs from "fs";
import dotenv from "dotenv";
import { task, types } from "hardhat/config";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

task("vote", "Vote for a proposal")
  .addParam("id", "The id of the proposal")
  .addParam("support", "Is supporting (true / false)", true, types.boolean)
  .addOptionalParam("from", "The address to vote from. By default grab first signer")
  .addOptionalParam("dao", "The address of the DAO. By default grab it from .env")
  .setAction(async (taskArgs, hre) => {
    const network = hre.network.name;
    const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
    for (const parameter in envConfig) {
      process.env[parameter] = envConfig[parameter];
    }

    const dao = await hre.ethers.getContractAt(
      process.env.CRYPTON_DAO_NAME as string,
      taskArgs.dao || (process.env.CRYPTON_DAO_ADDRESS as string)
    );

    let account: SignerWithAddress;
    if (taskArgs.from) {
      account = await hre.ethers.getSigner(taskArgs.from);
    } else {
      [account] = await hre.ethers.getSigners();
    }

    console.log(`\nVoting for proposal...\n`);
    await dao.connect(account).vote(taskArgs.id, taskArgs.support);
    console.log(`Done!`);
  });
