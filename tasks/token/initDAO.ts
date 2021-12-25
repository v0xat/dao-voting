import fs from "fs";
import dotenv from "dotenv";
import { task } from "hardhat/config";

task("initDAO", "Initialize DAO with token contract")
  .addParam("dao", "The address of the DAO")
  .addParam("token", "The address of the token")
  .setAction(async (taskArgs, hre) => {
    const network = hre.network.name;
    const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
    for (const parameter in envConfig) {
      process.env[parameter] = envConfig[parameter];
    }

    const token = await hre.ethers.getContractAt(
      process.env.CRYPTON_TOKEN_NAME as string,
      process.env.CRYPTON_TOKEN_ADDRESS as string
    );

    console.log(
      `\nInitializing DAO at ${taskArgs.dao} with token ${taskArgs.token}...\n`
    );
    await token.initialize(taskArgs.dao);
    console.log(`Done!`);
  });
