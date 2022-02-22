const StakingMasterContract = artifacts.require(
    "../../../contracts/StakingMaster/StakingMaster.sol"
);
const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);
const returnStakeAddress = require("../helpers/returnStakeAddress");

contract("Staking Master - Stake State", async (accounts) => {
    let AuroxToken;
    let StakingMaster;

    let testMoney;
    let initialTestAmount;

    const secondsPerMonth = 2629746;

    before(async () => {
        testMoney = 3000;
        initialTestAmount = 1000;
        // Create the token contracts
        AuroxToken = await AuroxTokenContract.new(
            "0x82C01fEac95776e099530a81fEdE18265229319a",
            "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
            "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
        );
        StakingMaster = await StakingMasterContract.new(AuroxToken.address, 0);
        // Setup the allowances
        await AuroxToken.setAllowance(StakingMaster.address);
        await AuroxToken.setAllowance(accounts[0]);
        // Transfer the test amounts
        await AuroxToken.transferFrom(
            AuroxToken.address,
            accounts[0],
            web3.utils.toWei(testMoney.toString())
        );
    });

    it("Should test that a compounding stake can be created and its stake data is set correctly", async () => {
        // Increase the allowance
        await AuroxToken.increaseAllowance(
            StakingMaster.address,
            web3.utils.toWei(initialTestAmount.toString())
        );

        const duration = 12;

        // Create the staking contract
        const stakeCreationData = await StakingMaster.createStaking(
            web3.utils.toWei(initialTestAmount.toString()),
            duration,
            accounts[0]
        );

        testMoney = testMoney - initialTestAmount;

        const stakeAddress = returnStakeAddress(stakeCreationData);

        const accountBalance = await AuroxToken.balanceOf(accounts[0]);

        assert.equal(
            web3.utils.toWei(testMoney.toString()),
            accountBalance.toString(),
            "Balance of the staking master not equal to the expected value"
        );

        /* Return all stake state variables and check they are the expected value */
        // Subtract the used up money amount from the testMoney total
        const stateStake = await StakingMaster.returnStakeState.call(
            stakeAddress
        );
        const [
            stakeInvestedAmount,
            stakeEndTime,
            interestRate,
            lastUpdate,
            compounded,
            rawInvestedAmount,
            stakeStartTime,
        ] = Object.values(stateStake);

        // Check the stake investment amount
        assert.equal(
            web3.utils.toWei(initialTestAmount.toString()),
            stakeInvestedAmount,
            "Balance of the stake state not equal to the expected stake balance"
        );

        // console.log(stakeCreationData);

        const expectedDurationInSeconds = secondsPerMonth * duration;
        const transaction = await web3.eth.getTransaction(stakeCreationData.tx);
        const { timestamp } = await web3.eth.getBlock(transaction.blockNumber);

        // Check the stake duration
        assert.equal(
            lastUpdate,
            timestamp,
            "Stake state duration not equal to expected duration"
        );

        const expectedStakeEndTime = timestamp + expectedDurationInSeconds;

        // Check the expected stake end time
        assert.equal(
            stakeEndTime,
            expectedStakeEndTime,
            "Stake state end time not equal to expected end time"
        );

        // Expected interest of 6%
        // Check the expected stake end time
        assert.equal(
            web3.utils.toWei("0.06"),
            interestRate.toString(),
            "Stake state interest rate not equal to expected interest rate"
        );

        // Compounding should be true because the duration is >= 12 months
        assert.equal(
            true,
            compounded,
            "Stake state compounded value false when it should be true"
        );
        // Check the stake start time
        assert.equal(
            timestamp,
            stakeStartTime.toString(),
            "Stake start time not set to block timestamp correctly"
        );

        // Check the stake start time
        assert.equal(
            web3.utils.toWei(initialTestAmount.toString()),
            rawInvestedAmount.toString(),
            "Stake raw investment amount not set to initial test amount correctly"
        );
    });

    it("Should test that a simple stake can be created and its stake data is set correctly", async () => {
        // Increase the allowance
        await AuroxToken.increaseAllowance(
            StakingMaster.address,
            web3.utils.toWei(initialTestAmount.toString())
        );

        const duration = 9;

        // Create the staking contract
        const stakeCreationData = await StakingMaster.createStaking(
            web3.utils.toWei(initialTestAmount.toString()),
            duration,
            accounts[0]
        );

        testMoney = testMoney - initialTestAmount;

        const stakeAddress = returnStakeAddress(stakeCreationData);

        const accountBalance = await AuroxToken.balanceOf(accounts[0]);

        assert.equal(
            web3.utils.toWei(testMoney.toString()),
            accountBalance.toString(),
            "Balance of the staking master not equal to the expected value"
        );

        /* Return all stake state variables and check they are the expected value */
        // Subtract the used up money amount from the testMoney total
        const stateStake = await StakingMaster.returnStakeState.call(
            stakeAddress
        );

        const [
            stakeInvestedAmount,
            stakeEndTime,
            interestRate,
            lastUpdate,
            compounded,
            rawInvestedAmount,
            stakeStartTime,
        ] = Object.values(stateStake);

        // Check the stake investment amount
        assert.equal(
            web3.utils.toWei(initialTestAmount.toString()),
            stakeInvestedAmount,
            "Balance of the stake state not equal to the expected stake balance"
        );

        // console.log(stakeCreationData);

        const expectedDurationInSeconds = secondsPerMonth * duration;
        const transaction = await web3.eth.getTransaction(stakeCreationData.tx);
        const { timestamp } = await web3.eth.getBlock(transaction.blockNumber);

        // Check the stake duration
        assert.equal(
            lastUpdate,
            timestamp,
            "Stake state duration not equal to expected duration"
        );

        const expectedStakeEndTime = timestamp + expectedDurationInSeconds;

        // Check the expected stake end time
        assert.equal(
            stakeEndTime,
            expectedStakeEndTime,
            "Stake state end time not equal to expected end time"
        );

        // Expected interest of 6%
        // Check the expected stake end time
        assert.equal(
            web3.utils.toWei("0.045"),
            interestRate.toString(),
            "Stake state interest rate not equal to expected interest rate"
        );

        // Compounding should be true because the duration is >= 12 months
        assert.equal(
            false,
            compounded,
            "Stake state compounded value true when it should be false"
        );

        // Check the stake start time
        assert.equal(
            timestamp,
            stakeStartTime.toString(),
            "Stake start time not set to block timestamp correctly"
        );

        // Check the stake start time
        assert.equal(
            web3.utils.toWei(initialTestAmount.toString()),
            rawInvestedAmount.toString(),
            "Stake raw investment amount not set to initial test amount correctly"
        );
    });
});
