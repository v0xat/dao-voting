import fs from "fs";
import dotenv from "dotenv";
import hre, { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const network = hre.network.name;
const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`));
for (const parameter in envConfig) {
  process.env[parameter] = envConfig[parameter];
}

async function main() {
  const [owner]: SignerWithAddress[] = await ethers.getSigners();
  console.log("Owner address: ", owner.address);

  const balance = await owner.getBalance();
  console.log(`Owner account balance: ${ethers.utils.formatEther(balance).toString()}`);

  const CryptonToken = await ethers.getContractFactory("CryptonToken");
  const cryptonToken = await CryptonToken.deploy(
    process.env.CRYPTON_TOKEN_NAME as string,
    process.env.CRYPTON_TOKEN_SYMBOL as string,
    process.env.CRYPTON_TOKEN_FEE_RATE as string
  );

  await cryptonToken.deployed();
  console.log(`CryptonToken deployed to ${cryptonToken.address}`);

  const CryptonDAO = await ethers.getContractFactory("CryptonDAO");
  const cryptonDAO = await CryptonDAO.deploy(
    cryptonToken.address as string,
    process.env.CRYPTON_DAO_QUORUM as string
  );

  await cryptonDAO.deployed();
  console.log(`CryptonDAO deployed to ${cryptonDAO.address}`);

  // Sync env file
  fs.appendFileSync(
    `.env-${network}`,
    `\r\# Deployed at \rCRYPTON_TOKEN_ADDRESS=${cryptonToken.address}\r
     \r\# Deployed at \rCRYPTON_DAO=${cryptonDAO.address}\r`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
