const StakingMasterContract = artifacts.require(
    "./contracts/StakingMaster/StakingMaster.sol"
);
const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);
const returnStakeAddress = require("../helpers/returnStakeAddress");
const fastForward = require("../helpers/fastForward");

contract("Staking Master - Add to Stake", async (accounts) => {
    let AuroxToken;
    let StakingMaster;

    let testMoney = 300000;
    const _amount = 1000;
    const _duration = 12;
    const secondsInaYear = 1209600 * 26;

    let stakeAddress;

    before(async () => {
        // Create the token contracts
        AuroxToken = await AuroxTokenContract.new(
            "0x82C01fEac95776e099530a81fEdE18265229319a",
            "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
            "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
        );
        StakingMaster = await StakingMasterContract.new(AuroxToken.address, 0);
        await StakingMaster.setProviderAddress(accounts[0]);
        // Setup the allowances
        await AuroxToken.setAllowance(accounts[0]);
        await AuroxToken.setAllowance(StakingMaster.address);
        // Transfer the test amounts
        await AuroxToken.transferFrom(
            AuroxToken.address,
            accounts[0],
            web3.utils.toWei(testMoney.toString())
        );
        // Allow the amount to be transferred
        await AuroxToken.increaseAllowance(
            StakingMaster.address,
            web3.utils.toWei(_amount.toString())
        );

        // Create the staking contract
        const stakeCreationData = await StakingMaster.createStaking(
            web3.utils.toWei(_amount.toString()),
            _duration,
            accounts[0]
        );

        stakeAddress = returnStakeAddress(stakeCreationData);
    });

    it("Test's that a stake can be created and its balance is set correctly for a compounding stake. Also the correct balance is deducted from the public funds", async () => {
        testMoney = testMoney - _amount;

        // Allow the amount to be transferred
        await AuroxToken.increaseAllowance(
            StakingMaster.address,
            web3.utils.toWei(_amount.toString())
        );

        // Fast forward 6 months
        await fastForward(secondsInaYear / 2);

        const addToStakeTransaction = await StakingMaster.addToStake(
            stakeAddress,
            web3.utils.toWei(_amount.toString())
        );

        testMoney = testMoney - _amount;

        // Subtract the used up money amount from the testMoney total
        const stateStake = await StakingMaster.returnStakeState.call(
            stakeAddress
        );

        const [stakeInvestedAmount, , , lastUpdate, , rawInvestedAmount] =
            Object.values(stateStake);

        // Check that the stake amount has been updated to reflect the interest from creation to now.
        // Check greater than to see if a small amount of interest up to now has been added
        assert.isTrue(
            stakeInvestedAmount > web3.utils.toWei("2000"),
            "Staking master invested amount not equal to expected compound amount"
        );

        const transaction = await web3.eth.getTransaction(
            addToStakeTransaction.tx
        );
        const { timestamp } = await web3.eth.getBlock(transaction.blockNumber);

        // Check the stake duration
        assert.equal(
            lastUpdate,
            timestamp,
            "Stake state duration not equal to expected duration"
        );

        //  Check the that the additional investment amount was added to the raw investment amount
        assert.equal(
            web3.utils.toWei("2000"),
            rawInvestedAmount,
            "State stake rawInvestmentAmount not updated to include additional investment amount"
        );
    });

    it("Tests that when fast forwarding through the stake and adding multiple values the invested total updated accurately to reflect the amount", async () => {
        await StakingMaster.addToStake(stakeAddress, web3.utils.toWei("10000"));
        // Fast forward to end of stake
        await fastForward(secondsInaYear / 4);
        // Add to stake and fast forward
        await StakingMaster.addToStake(stakeAddress, web3.utils.toWei("10000"));
        await fastForward(secondsInaYear);
        // Get the user's stake value
        const usersStakeValue = await StakingMaster.returnCurrentStakeValue(
            stakeAddress
        );
        let investedTotal = await StakingMaster.investedTotal();

        assert.equal(
            Math.round(web3.utils.fromWei(investedTotal)),
            Math.round(web3.utils.fromWei(usersStakeValue)),
            "The overall total should be equal to the users stake value at the end"
        );
        await StakingMaster.claimRewards(stakeAddress);
        investedTotal = await StakingMaster.investedTotal();
        assert.equal(
            investedTotal,
            0,
            "The overall total at the end should be 0, when the user claims and removes all rewards"
        );
    });
});
