# DAO

Simple DAO voting contract with it's own erc20 token.

Main features:
- Any user can add proposals without token deposit
- Users have 3 days to vote after proposal created
- Users need to make a deposit to participate in voting
- Users can delegate their voting power on certain proposal to any other users
- Users can participate in multiple proposals with same tokens
- After participating in the voting, the withdrawal is "frozen" until the end of the voting

To run requires `.env` file with:
- MNEMONIC
- ALCHEMY_URL
- ETHERSCAN_API_KEY
- CMC_API_KEY (to use gas-reporter)

Try running some of the following tasks:

```shell
npx hardhat coverage
npx hardhat test test/dao.test.ts
npx hardhat test test/token.test.ts
```
