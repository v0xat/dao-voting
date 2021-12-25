import fs from "fs";
import dotenv from "dotenv";
import { task } from "hardhat/config";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

task("delegate", "Delegate voting power")
  .addParam("id", "The id of the proposal")
  .addParam("to", "The address to delegate to")
  .addOptionalParam("from", "Delegator address. By default grab first signer")
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

    console.log(`\nDelegating to ${taskArgs.to} on proposal #${taskArgs.id}...\n`);
    await dao.connect(account).delegate(taskArgs.to, taskArgs.id);
    console.log(`Done!`);
  });
