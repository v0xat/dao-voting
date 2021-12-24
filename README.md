# DAO

Simple DAO voting contract with it's own erc20 token.

Verified contracts on Polygonscan:
- token: https://mumbai.polygonscan.com/token/0x23040F3744409EB89f299F4BE408197Bd6876A82
- dao: https://mumbai.polygonscan.com/address/0xEF22aB4B8B98b7BB988BB0cf20aF570817EC0739

Main features:
- Any user can add proposals without token deposit
- Users have 3 days to vote after proposal created
- Users can delegate their voting power on certain proposal to any other users
- Users can participate in multiple proposals with same tokens
- After participating in the voting, the withdrawal is "frozen" until the end of the voting

To run requires `.env` file with:
- MNEMONIC
- ALCHEMY_API_KEY
- ETHERSCAN_API_KEY
- CMC_API_KEY (to use gas-reporter)

Try running some of the following tasks:

```shell
npx hardhat run scripts/deploy.ts --network mumbai
npx hardhat coverage
npx hardhat test test/dao.test.ts
npx hardhat test test/token.test.ts
```
