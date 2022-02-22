const StakingMasterContract = artifacts.require(
    "../../../contracts/StakingMaster/StakingMaster.sol"
);
const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);
const fastForward = require("../helpers/fastForward");
const returnStakeAddress = require("../helpers/returnStakeAddress");

contract("StakingMaster - Close Stake", async (accounts) => {
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

    it("Test's if the staking balance is transferred to the staking master contract when the stake is closed", async () => {
        // Pause so that the user will be returned a small value for the time they staked for
        await fastForward(1000);

        const beforeStakingMasterBalance = await AuroxToken.balanceOf(
            StakingMaster.address
        );
        const beforeUsersBalance = await AuroxToken.balanceOf(accounts[0]);

        await StakingMaster.closeStake(stakeAddress);

        let investedTotal = await StakingMaster.investedTotal();

        assert.equal(
            investedTotal,
            0,
            "Invested total should be 0 after closing the stake"
        );

        const closedStakeBalance = await AuroxToken.balanceOf(stakeAddress);

        assert.equal(
            closedStakeBalance,
            0,
            "Balanced of Closed stake should be 0"
        );

        const stakingMasterBalance = await AuroxToken.balanceOf(
            StakingMaster.address
        );

        // The master staker should have a balance that is slightly less than the original stake balance, because the user would have been returned a small portion of their stake for the duration they staked
        assert.isTrue(
            stakingMasterBalance > beforeStakingMasterBalance,
            "The Master staking balance should have the additional revoked balance in the pool"
        );

        const usersBalance = await AuroxToken.balanceOf(accounts[0]);

        assert.isTrue(
            web3.utils.fromWei(usersBalance) > testMoney,
            "User should have slightly more money than the test money because they should have generated a tiny amount of interest from creation to close"
        );
        // User shouldn't be returned the entire balance and instead should be penalized for early closure
        assert.equal(
            Math.round(
                web3.utils.fromWei(
                    (usersBalance - beforeUsersBalance).toString()
                )
            ),
            500,
            "User should have half the initial invested amount, because of the early stake close"
        );
    });

    it("Test's that closing a staking contract mid-way through returns half the original balance and no interest", async () => {
        // 6 months fast-forward
        const fastForwardTime = 15778476;

        await fastForward(fastForwardTime);
        const beforeStakingMasterBalance = await AuroxToken.balanceOf(
            StakingMaster.address
        );

        const beforeCloseUserBalance = await AuroxToken.balanceOf(accounts[0]);

        // const usersBalanceBefore = await AuroxToken.balanceOf(accounts[0]);
        // console.log(web3.utils.fromWei(usersBalanceBefore));

        await StakingMaster.closeStake(stakeAddress);

        const afterCloseUserBalance = await AuroxToken.balanceOf(accounts[0]);

        const returnedBalance =
            web3.utils.fromWei(afterCloseUserBalance) -
            web3.utils.fromWei(beforeCloseUserBalance);

        // Should return half the balance 500
        assert.equal(
            Math.round(returnedBalance),
            750,
            "The user's balance is 500"
        );
        testMoney = testMoney + 500;
    });

    it("Test's that closing a staking contract 3/4s through returns 3/4's the original balance and no interest", async () => {
        // 9 months fast-forward
        const fastForwardTime = 23667714;
        await fastForward(fastForwardTime);
        const usersBalanceBefore = await AuroxToken.balanceOf(accounts[0]);
        await StakingMaster.closeStake(stakeAddress);

        const usersBalanceAfter = await AuroxToken.balanceOf(accounts[0]);

        const returnedBalance =
            web3.utils.fromWei(usersBalanceAfter) -
            web3.utils.fromWei(usersBalanceBefore);

        assert.equal(
            Math.round(returnedBalance),
            875,
            "Returned balance should be $875 because 50% of 25% deduction is $125"
        );
        testMoney = testMoney + 750;
    });

    it("Tests that a user who closes their stake at the start of the stake period is returned half their invested amount", async () => {
        await fastForward(90000);
        const usersBalanceBefore = await AuroxToken.balanceOf(accounts[0]);
        await StakingMaster.closeStake(stakeAddress);

        const usersBalanceAfter = await AuroxToken.balanceOf(accounts[0]);

        const returnedBalance =
            web3.utils.fromWei(usersBalanceAfter) -
            web3.utils.fromWei(usersBalanceBefore);

        assert.equal(
            Math.round(returnedBalance),
            501,
            "Returned balance should be equal to 500"
        );
    });

    it("Tests that a user who closes their stake 90% of the way through is deducted 5%", async () => {
        await fastForward(28401256);

        const usersBalanceBefore = await AuroxToken.balanceOf(accounts[0]);

        await StakingMaster.closeStake(stakeAddress);

        const usersBalanceAfter = await AuroxToken.balanceOf(accounts[0]);

        const returnedBalance =
            web3.utils.fromWei(usersBalanceAfter) -
            web3.utils.fromWei(usersBalanceBefore);

        assert.equal(
            Math.round(returnedBalance),
            950,
            "Returned balance should be equal to 950"
        );
    });

    it("Tests that a user who closes their stake 99% of the way through is deducted 0.5%", async () => {
        await fastForward(31241382);

        const usersBalanceBefore = await AuroxToken.balanceOf(accounts[0]);

        await StakingMaster.closeStake(stakeAddress);

        const usersBalanceAfter = await AuroxToken.balanceOf(accounts[0]);

        const returnedBalance =
            web3.utils.fromWei(usersBalanceAfter) -
            web3.utils.fromWei(usersBalanceBefore);

        assert.equal(
            Math.round(returnedBalance),
            995,
            "Returned balance should be equal to 950"
        );
    });
});
