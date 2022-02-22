const StakingMasterContract = artifacts.require(
    "../../../contracts/StakingMaster/StakingMaster.sol"
);
const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);

const TokenVesting = artifacts.require(
    "./contracts/TestHelpers/TokenVesting.sol"
);
const fastForward = require("../helpers/fastForward");
const returnStakeAddress = require("../helpers/returnStakeAddress");

contract("StakingMaster - Remove User's Stake", async (accounts) => {
    let AuroxToken;
    let StakingMaster;
    let stakeAddress;

    let testMoney = 300000;

    const initialTestAmount = 1000;

    const duration = 12;
    const me = accounts[0];

    before(async () => {
        // Create the token contracts
        AuroxToken = await AuroxTokenContract.new(
            "0x82C01fEac95776e099530a81fEdE18265229319a",
            "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
            "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
        );
        StakingMaster = await StakingMasterContract.new(AuroxToken.address, 0);
        // Setup the allowances
        await AuroxToken.setAllowance(accounts[0]);
        await AuroxToken.setAllowance(StakingMaster.address);
        // Transfer the test amounts
        await AuroxToken.transferFrom(
            AuroxToken.address,
            accounts[0],
            web3.utils.toWei(testMoney.toString())
        );
    });

    const createStake = async () => {
        await AuroxToken.increaseAllowance(
            StakingMaster.address,
            web3.utils.toWei(initialTestAmount.toString())
        );
        const stakeCreationData = await StakingMaster.createStaking(
            web3.utils.toWei(initialTestAmount.toString()),
            duration,
            accounts[0]
        );

        // console.log(`timestamp: ${timestamp}`);
        testMoney = testMoney - initialTestAmount;

        return returnStakeAddress(stakeCreationData);
    };

    beforeEach(async () => {
        // Increase the allowance
        await AuroxToken.increaseAllowance(
            StakingMaster.address,
            web3.utils.toWei(initialTestAmount.toString())
        );
        // Create the staking contract
        const stakeCreationData = await StakingMaster.createStaking(
            web3.utils.toWei(initialTestAmount.toString()),
            duration,
            accounts[0]
        );

        // console.log(`timestamp: ${timestamp}`);
        testMoney = testMoney - initialTestAmount;

        stakeAddress = returnStakeAddress(stakeCreationData);
    });

    it("Test's that the user's stake is added to the array and when the stake is closed it is removed from the array", async () => {
        const stakesBeforeClose = await StakingMaster.returnUsersStakes.call(
            me
        );

        assert.equal(
            stakesBeforeClose.length,
            1,
            "The stakes before close should have 1 stake"
        );
        assert.equal(
            stakesBeforeClose[0],
            stakeAddress,
            "The returned stake should be the created stake address"
        );

        await StakingMaster.closeStake(stakeAddress);

        const stakesAfterClose = await StakingMaster.returnUsersStakes.call(me);

        assert.equal(
            stakesAfterClose.length,
            0,
            "The stakes before close should have 1 stake"
        );
    });

    it("Test's that when creating multiple user stakes, the correct stake is removed from the array when the stake is closed", async () => {
        await AuroxToken.increaseAllowance(
            StakingMaster.address,
            web3.utils.toWei(initialTestAmount.toString())
        );
        // Create the staking contract
        const stakeCreationData2 = await StakingMaster.createStaking(
            web3.utils.toWei(initialTestAmount.toString()),
            duration,
            accounts[0]
        );

        const secondStakeAddress = returnStakeAddress(stakeCreationData2);
        const stakesBeforeClose = await StakingMaster.returnUsersStakes.call(
            me
        );

        assert.isTrue(
            stakesBeforeClose.includes(stakeAddress),
            "The returned stake array should contain the first created stake address"
        );

        assert.isTrue(
            stakesBeforeClose.includes(secondStakeAddress),
            "The returned stake array should contain the second created stake address"
        );

        await StakingMaster.closeStake(stakeAddress);

        const stakesAfterFirstClose =
            await StakingMaster.returnUsersStakes.call(me);

        assert.isFalse(
            stakesAfterFirstClose.includes(stakeAddress),
            "The returned stake array should not contain the first stake address"
        );

        assert.isTrue(
            stakesAfterFirstClose.includes(secondStakeAddress),
            "The returned stake array should still contain the second created stake address"
        );

        await StakingMaster.closeStake(secondStakeAddress);

        const stakesAfterCloses = await StakingMaster.returnUsersStakes.call(
            me
        );

        assert.equal(
            stakesAfterCloses,
            0,
            "The stakes after close length should be 0, as no stakes exist"
        );
    });

    it("When claiming rewards for a stake that is complete the user is removed from the user's array after they have claimed all their rewards", async () => {
        // Fast forward 1 year + 1 week, so it in the middle of a claim reward period
        await fastForward(31556952 + Math.round(31556952 / 52));

        // Claim rewards on the stakeAddress
        await StakingMaster.claimRewards(stakeAddress);

        const stakesBeforeFinishing =
            await StakingMaster.returnUsersStakes.call(me);

        assert.isTrue(
            stakesBeforeFinishing.includes(stakeAddress),
            "The returned stake array should still contain the stake address"
        );

        // Fast forward 1 extra week so that the stake has complete and the user should have that stake item removed from the array
        await fastForward(606800 * 3);

        // Claim rewards after the stake is fully complete. This should remove the stake item from the array
        await StakingMaster.claimRewards(stakeAddress);

        const stakesAfterAllFastForward =
            await StakingMaster.returnUsersStakes.call(me);

        assert.isFalse(
            stakesAfterAllFastForward.includes(stakeAddress),
            "The returned stake array should not contain the stake address as the stake is complete and it should be removed from the array"
        );
    });

    it("Tests that a user who has a bunch of stakes, has the correct stake removed when closing a stake", async () => {
        await createStake();
        const stake2 = await createStake();
        const stake3 = await createStake();
        const stake4 = await createStake();
        await createStake();
        await createStake();
        await createStake();
        await createStake();

        let usersStakes = await StakingMaster.returnUsersStakes(me);

        assert.isTrue(
            usersStakes.includes(stake2) &&
                usersStakes.includes(stake3) &&
                usersStakes.includes(stake4),
            "The user's stakes should include all the stakes"
        );

        await StakingMaster.closeStake(stake4);
        usersStakes = await StakingMaster.returnUsersStakes(me);

        assert.isFalse(
            usersStakes.includes(stake4),
            "The user's stakes shouldn't include stake 4"
        );

        await StakingMaster.closeStake(stake3);
        usersStakes = await StakingMaster.returnUsersStakes(me);

        assert.isFalse(
            usersStakes.includes(stake3),
            "The user's stakes shouldn't include stake 3"
        );

        await StakingMaster.closeStake(stake2);
        usersStakes = await StakingMaster.returnUsersStakes(me);

        assert.isFalse(
            usersStakes.includes(stake2),
            "The user's stakes shouldn't include stake 2"
        );
    });
});
