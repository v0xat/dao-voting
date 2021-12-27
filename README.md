# DAO

Simple DAO voting contract with it's own ERC20 token.

Verified contracts on Polygonscan:
- token: https://mumbai.polygonscan.com/token/0x23040F3744409EB89f299F4BE408197Bd6876A82
- dao: https://mumbai.polygonscan.com/address/0xEF22aB4B8B98b7BB988BB0cf20aF570817EC0739

Main features:
- Any user can add proposals
- Users have 3 days to on proposal
- Users can delegate their voting power on certain proposal to any other users
- Users can participate in multiple proposals with same tokens
- After participating in the voting, the withdrawal is "frozen" until the end of the voting

To run requires `.env` file with:
- MNEMONIC
- ALCHEMY_API_KEY
- ETHERSCAN_API_KEY
- CMC_API_KEY (to use gas-reporter)

Try running some of the following tasks and don't forget to specify network (`--network mumbai`):

```shell
npx hardhat run scripts/deploy.ts

npx hardhat coverage
npx hardhat test test/dao.test.ts
npx hardhat test test/token.test.ts

npx hardhat grantRole --role <burner or minter> --to <addrs>
npx hardhat mint --amount <number> --to <addrs>
npx hardhat whitelist --address <addrs>
npx hardhat initDAO --dao <addrs> --token <addrs>
npx hardhat deposit --amount <number> --dao <addrs> [--from <addrs>]
npx hardhat withdraw --amount 5 --dao <addrs> [--to <addrs>]
npx hardhat addProposal --recipient <addrs> [--from <addrs>] [--dao <addrs>] [--token <addrs>]
npx hardhat vote --id <prop id> --support <true/false> [--from <addrs>] [--dao <addrs>]
npx hardhat delegate --id <prop id> --to <addrs> -[--from <addrs>] [--dao <addrs>]
```
