import fs from "fs";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { task } from "hardhat/config";

task("mint", "Mint tokens on provided account")
  .addParam("amount", "The amount of tokens to mint")
  .addParam("to", "The address to mint on")
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

    const [, alice] = await hre.ethers.getSigners();

    const amount = ethers.utils.parseUnits(
      taskArgs.amount,
      process.env.CRYPTON_TOKEN_DECIMALS
    );

    console.log(`\nMinting ${taskArgs.amount} tokens to ${taskArgs.to}...\n`);
    await cryptonToken.connect(alice).mint(taskArgs.to, amount);
    console.log(`Done!`);
  });
