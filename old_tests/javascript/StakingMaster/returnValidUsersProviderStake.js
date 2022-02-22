const StakingMasterContract = artifacts.require(
    "../../../contracts/StakingMaster/StakingMaster.sol"
);
const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);

const fastForward = require("../helpers/fastForward");
const returnStakeAddress = require("../helpers/returnStakeAddress");

contract(
    "StakingMaster - Return Valid Users Provider Stake",
    async (accounts) => {
        let AuroxToken;
        let StakingMaster;
        let stakeAddress;

        let testMoney = 300000;

        const initialTestAmount = 1000;

        const duration = 12;

        before(async () => {
            // Create the token contracts
            AuroxToken = await AuroxTokenContract.new(
                "0x82C01fEac95776e099530a81fEdE18265229319a",
                "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
                "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
                "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
            );
            StakingMaster = await StakingMasterContract.new(
                AuroxToken.address,
                0
            );

            // Setup the allowances
            await AuroxToken.setAllowance(accounts[0]);
            await AuroxToken.setAllowance(StakingMaster.address);
            // Transfer the test amounts
            await AuroxToken.transferFrom(
                AuroxToken.address,
                accounts[0],
                web3.utils.toWei(testMoney.toString())
            );
            // Increase the allowance
            await AuroxToken.increaseAllowance(
                StakingMaster.address,
                web3.utils.toWei(testMoney.toString())
            );
        });

        it("Tests that when creating a stake and the stake creator is the provider contract, the function returns the stake", async () => {
            const usersStakes = await StakingMaster.returnValidUsersProviderStake.call(
                accounts[0]
            );
            assert.equal(
                usersStakes,
                0x0000000000000000000000000000000000000000,
                "No user stake should be returned as none as created"
            );

            // Create the staking contract
            await StakingMaster.createStaking(
                web3.utils.toWei(initialTestAmount.toString()),
                duration,
                accounts[0]
            );

            const usersStakesAfterFirstCreate = await StakingMaster.returnValidUsersProviderStake.call(
                accounts[0]
            );
            assert.equal(
                usersStakesAfterFirstCreate,
                0x0000000000000000000000000000000000000000,
                "No user stake should be returned as as the provider isnt this user yet"
            );

            await StakingMaster.setProviderAddress(accounts[0]);

            await StakingMaster.createStaking(
                web3.utils.toWei(initialTestAmount.toString()),
                duration,
                accounts[0]
            );

            const validUserStake = await StakingMaster.returnValidUsersProviderStake.call(
                accounts[0]
            );
            assert.isTrue(
                validUserStake !== 0x0000000000000000000000000000000000000000,
                "A valid user stake should be returned as this user is now the provider"
            );
        });
    }
);
