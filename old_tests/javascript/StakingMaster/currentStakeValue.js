const StakingMasterContract = artifacts.require(
    "../../../contracts/StakingMaster/StakingMaster.sol"
);
const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);

const fastForward = require("../helpers/fastForward");
const returnStakeAddress = require("../helpers/returnStakeAddress");

contract("StakingMaster - Current Stake Value", async (accounts) => {
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
        await AuroxToken.setAllowance(StakingMaster.address);
        await AuroxToken.setAllowance(accounts[0]);
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

    it("Test's that the current stake value is accurate", async () => {
        // 6 months fast-forward
        const fastForwardTime = 15778476;

        await fastForward(fastForwardTime);

        const stakeValue = await StakingMaster.returnCurrentStakeValue(
            stakeAddress
        );
        assert.equal(
            Math.round(web3.utils.fromWei(stakeValue)),
            1030,
            "Stake value not accurate for a 6-month period"
        );
    });

    it("Test's that the current stake value is accurate when a 9-month period", async () => {
        // 9 months fast-forward
        // const fastForwardTime = 23667714;
        const fastForwardTime = 23667714;

        await fastForward(fastForwardTime);

        const stakeValue = await StakingMaster.returnCurrentStakeValue(
            stakeAddress
        );

        const roundedStakeValue = Math.round(web3.utils.fromWei(stakeValue));
        assert.isTrue(
            roundedStakeValue <= 1046,
            "Stake value not accurate for a 6-month period"
        );
        assert.isTrue(
            roundedStakeValue >= 1044,
            "Stake value not accurate for a 6-month period"
        );
    });
});
