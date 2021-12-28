import fs from "fs";
import dotenv from "dotenv";
import { task } from "hardhat/config";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const description = "Change fee recipient";

task("addProposal", "Add proposal to change fee recipient")
  .addOptionalParam(
    "from",
    "The address to add proposal from. By default grab first signer"
  )
  .addParam("recipient", "The address to change fee recipient on")
  .addOptionalParam("dao", "The address of the DAO. By default grab it from .env")
  .addOptionalParam("token", "The DAO token address. By default grab it from .env")
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

    const calldata = dao.interface.encodeFunctionData("changeFeeRecipient", [
      taskArgs.recipient,
    ]);

    console.log(`\nCreating a proposal...\n`);
    await dao
      .connect(account)
      .addProposal(
        description,
        taskArgs.token || (process.env.CRYPTON_TOKEN_ADDRESS as string),
        calldata
      );
    console.log(`Done!`);
  });
