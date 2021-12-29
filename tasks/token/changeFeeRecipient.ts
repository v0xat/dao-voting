import fs from "fs";
import dotenv from "dotenv";
import { task } from "hardhat/config";

task("changeRecipient", "Grant role to provided account")
  .addParam("to", "The address of the new fee recipient")
  .addOptionalParam("token", "Token contract address. By default grab it from .env")
  .setAction(async (taskArgs, hre) => {
    const network = hre.network.name;
    const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
    for (const parameter in envConfig) {
      process.env[parameter] = envConfig[parameter];
    }

    const cryptonToken = await hre.ethers.getContractAt(
      process.env.CRYPTON_TOKEN_NAME as string,
      taskArgs.token || (process.env.CRYPTON_TOKEN_ADDRESS as string)
    );

    console.log(
      `\nChanging fee recipient to ${taskArgs.to} on contract ${
        taskArgs.token || (process.env.CRYPTON_TOKEN_ADDRESS as string)
      }...\n`
    );
    await cryptonToken.changeFeeRecipient(taskArgs.to);
    console.log(`Done!`);
  });
