const ProviderContract = artifacts.require("./contracts/Provider/Provider.sol");
const StakingMasterContract = artifacts.require(
    "./contracts/StakingMaster/StakingMaster.sol"
);

const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);

const fastForward = require("../helpers/fastForward");

const ERC20Contract = artifacts.require(
    "./contracts/TestHelpers/ERC20Mintable.sol"
);

contract("Provider - Add Liquidity", async (accounts) => {
    const me = accounts[0];
    const jeff = accounts[1];

    const _amount = 1000;
    let testMoney = 1000000;
    const secondsInFortnight = 1209600;

    const epochStart = Math.round(new Date().getTime() / 1000) - 10000;

    let Provider;
    let StakingMaster;

    let AuroxToken;
    let UniSwapToken;

    async function addLiquidity(user, _amount) {
        //   Increase allowances
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(_amount.toString()),
            { from: user }
        );
        await UniSwapToken.mint(user, web3.utils.toWei(_amount.toString()));

        //   add the liquidity
        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()), {
            from: user,
        });
    }

    async function removeLiquidity(user, _amount) {
        await Provider.removeLiquidity(web3.utils.toWei(_amount.toString()), {
            from: user,
        });
    }

    before(async () => {
        UniSwapToken = await ERC20Contract.new();
        UniSwapToken.mint(me, web3.utils.toWei(testMoney.toString()));
        AuroxToken = await AuroxTokenContract.new(
            "0x82C01fEac95776e099530a81fEdE18265229319a",
            "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
            "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
        );

        StakingMaster = await StakingMasterContract.new(
            AuroxToken.address,
            epochStart
        );

        Provider = await ProviderContract.new(
            UniSwapToken.address,
            AuroxToken.address,
            StakingMaster.address,
            epochStart,
            UniSwapToken.address
        );

        await StakingMaster.setProviderAddress(Provider.address);

        // Set  the allowances for the contracts
        await AuroxToken.setAllowance(Provider.address);
        await AuroxToken.setAllowance(StakingMaster.address);
        // Allow the amount to be transferred
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(testMoney.toString())
        );
    });

    it("tests that a user who wants their rewards  to be staked, are sent to the staking master and a stake is created", async () => {
        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()));

        await fastForward(605000);

        await Provider.claimRewards(true, 12);

        const validUserStake =
            await StakingMaster.returnValidUsersProviderStake.call(accounts[0]);

        assert.isTrue(
            validUserStake !== 0x0000000000000000000000000000000000000000,
            "The user should have a created provider stake now"
        );

        const stateStake = await StakingMaster.returnStakeState.call(
            validUserStake
        );
        const [stakeInvestedAmount, , interestRate, , , ,] =
            Object.values(stateStake);

        assert.equal(
            Math.round(web3.utils.fromWei(stakeInvestedAmount)),
            750,
            "Half of the first epoch rewards should be staked"
        );
        assert.equal(
            web3.utils.fromWei(interestRate),
            0.09,
            "Interest rate should be 0.06 + 0.03 because from epoch 1"
        );

        // Fast forward to end of epoch
        await fastForward(605000);

        await Provider.claimRewards(true, 12);

        const latestStakeState = await StakingMaster.returnStakeState.call(
            validUserStake
        );

        const [latestInvestmentAmount, , , , , latestRawAmount] =
            Object.values(latestStakeState);

        assert.equal(
            Math.round(web3.utils.fromWei(latestRawAmount)),
            1500,
            "The latest raw amount should be 1500"
        );
        assert.isTrue(
            web3.utils.fromWei(latestRawAmount) <
                web3.utils.fromWei(latestInvestmentAmount),
            "The latest investment amount should be slightly greater than the raw amount as it includes a small amount of interest"
        );

        await removeLiquidity(me, _amount);
        // Allow the amount to be transferred
    });

    it("Tests that a user who constantly adds to a stake doesn't break it", async () => {
        const _amount = 1000;
        await addLiquidity(jeff, _amount);

        await fastForward(secondsInFortnight * 10);

        const { rewardTotal } = await Provider.returnAllClaimableRewardAmounts(
            jeff
        );

        await Provider.claimRewards(true, 12, { from: jeff });

        const validUserStake =
            await StakingMaster.returnValidUsersProviderStake(jeff);

        assert.isTrue(
            validUserStake !== 0x0000000000000000000000000000000000000000,
            "The user should have a created provider stake now"
        );

        const stateStake = await StakingMaster.returnStakeState(
            validUserStake,
            {
                from: jeff,
            }
        );
        const [, , , , , latestRawAmount] = Object.values(stateStake);

        assert.equal(
            Math.round(web3.utils.fromWei(latestRawAmount)),
            Math.round(web3.utils.fromWei(rewardTotal)),
            "The latest raw amount should be 1500 from epoch rewards + 75 from the 10% bonus  for claiming in the last week"
        );

        const addRecursiveLiquidity = async (length) => {
            if (length > 0) {
                await fastForward(secondsInFortnight / 2);
                await addLiquidity(jeff, _amount);
                await Provider.claimRewards(true, 12, { from: jeff });
                await addRecursiveLiquidity(length - 1);
                //   Increase allowances
            } else {
                return;
            }
        };

        await addRecursiveLiquidity(10);

        const latestState = await StakingMaster.returnStakeState(
            validUserStake,
            {
                from: jeff,
            }
        );

        const [, , interestRate, , , latestestRawAmount] =
            Object.values(latestState);

        assert.equal(
            web3.utils.fromWei(interestRate),
            0.075,
            "Interest rate should be 7.5% as it came from the staking master not in epoch 1"
        );

        // Claimed amount should be 3000 (5 epochs duration) * 2. Previous balance was 19186
        assert.equal(
            Math.round(web3.utils.fromWei(latestestRawAmount)),
            17607,
            "The latest raw amount should be the above"
        );

        await fastForward(secondsInFortnight * 10);

        // 25503

        const newestState = await StakingMaster.returnStakeState(
            validUserStake,
            {
                from: jeff,
            }
        );

        const [lastInvestedAmount, , , , ,] = Object.values(newestState);

        assert.equal(
            Math.round(web3.utils.fromWei(lastInvestedAmount)),
            18344,
            "Last invested amount should include all the interest"
        );

        await fastForward(secondsInFortnight * 30);

        const notValidUserStake =
            await StakingMaster.returnValidUsersProviderStake(jeff);

        assert.equal(
            notValidUserStake,
            "0x0000000000000000000000000000000000000000",
            "Should not have a valid user stake"
        );

        await Provider.claimRewards(true, 12, { from: jeff });

        const newValidUserStake =
            await StakingMaster.returnValidUsersProviderStake(jeff);

        assert.notEqual(
            newValidUserStake,
            "0x0000000000000000000000000000000000000000",
            "Should have a valid user stake"
        );

        await StakingMaster.claimRewards(validUserStake, {
            from: jeff,
        });

        const balance = await AuroxToken.balanceOf.call(jeff);

        assert.equal(
            Math.round(web3.utils.fromWei(balance)),
            18935,
            "The returned rewards should be about that"
        );
    });
});
