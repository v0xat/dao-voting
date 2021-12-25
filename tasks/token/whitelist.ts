import fs from "fs";
import dotenv from "dotenv";
import { task } from "hardhat/config";

task("whitelist", "Add user to whitelist")
  .addParam("address", "The address to add")
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

    console.log(`\nAdding ${taskArgs.address} to whitelist...\n`);
    await cryptonToken.addToWhitelist(taskArgs.address);
    console.log(`Done!`);
  });
