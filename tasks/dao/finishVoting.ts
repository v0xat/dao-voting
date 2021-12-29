import fs from "fs";
import dotenv from "dotenv";
import { task } from "hardhat/config";

task("finishVoting", "Finish proposal voting")
  .addParam("id", "The id of the proposal")
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

    console.log(`\nTrying to finish voting for proposal # ${taskArgs.id} ...\n`);
    await dao.finishVoting(taskArgs.id);
    console.log(`Done!`);
  });
