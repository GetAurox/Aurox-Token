const StakingMasterContract = artifacts.require(
    "../../../contracts/StakingMaster/StakingMaster.sol"
);
const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);

const {
    isCallTrace,
} = require("hardhat/internal/hardhat-network/stack-traces/message-trace");
const fastForward = require("../helpers/fastForward");
const returnStakeAddress = require("../helpers/returnStakeAddress");

contract("StakingMaster - Users Total Stake Value", async (accounts) => {
    const me = accounts[0];
    const tester = accounts[1];
    let AuroxToken;
    let StakingMaster;
    let stakeAddress;
    const secondsInFortnight = 1209600;

    let testMoney = 300000;

    const initialTestAmount = 1000;

    const duration = 12;

    const createStake = async (_amount, user) => {
        await AuroxToken.transferFrom(
            AuroxToken.address,
            user,
            web3.utils.toWei(_amount.toString())
        );
        await AuroxToken.increaseAllowance(
            StakingMaster.address,
            web3.utils.toWei(_amount.toString()),
            { from: user }
        );
        // Create the staking contract
        await StakingMaster.createStaking(
            web3.utils.toWei(_amount.toString()),
            duration,
            user,
            { from: user }
        );
    };

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
    });

    it("Tests that a user who creates a single stake returns the correct value when using the function", async () => {
        await createStake(1000, me);
        const totalValue = await StakingMaster.returnUsersTotalStakeValue(me);

        assert.equal(
            Math.round(web3.utils.fromWei(totalValue)),
            1000,
            "The returned amount should just be the initial amount without interest"
        );
    });

    it("Tests that a user who adds another stake returns the correct value", async () => {
        await createStake(2000, me);

        const totalValue = await StakingMaster.returnUsersTotalStakeValue(me);

        assert.equal(
            Math.round(web3.utils.fromWei(totalValue)),
            3000,
            "The returned amount should just be the initial amount without interest"
        );
    });

    it("Tests that a user who created a third final stake, returns the correct value initially and when fast forwarding 6 months also returns the correct value and when fast forwarding to the end also returns the correct value", async () => {
        await createStake(6000, me);

        let totalValue = await StakingMaster.returnUsersTotalStakeValue(me);

        assert.equal(
            Math.round(web3.utils.fromWei(totalValue)),
            9000,
            "The returned amount should just be the initial amount without interest"
        );
        // Fast forward 6 months
        await fastForward(15778476);

        totalValue = await StakingMaster.returnUsersTotalStakeValue(me);

        assert.equal(
            Math.round(web3.utils.fromWei(totalValue)),
            9273,
            "The returned amount should include the interest"
        );

        // Fast forward 6 months
        await fastForward(15778476);

        totalValue = await StakingMaster.returnUsersTotalStakeValue(me);

        assert.equal(
            Math.round(web3.utils.fromWei(totalValue)),
            9555,
            "The returned amount should include the interest"
        );

        // Ensure value doesnt increase after a long period
        await fastForward(15778476 * 10);

        totalValue = await StakingMaster.returnUsersTotalStakeValue(me);

        assert.equal(
            Math.round(web3.utils.fromWei(totalValue)),
            9555,
            "The returned amount should include the interest"
        );
    });

    it("Tests that when another user creates stakes, the correct values are returned for that user", async () => {
        await createStake(6000, tester);

        let totalValue = await StakingMaster.returnUsersTotalStakeValue(tester);

        assert.equal(
            Math.round(web3.utils.fromWei(totalValue)),
            6000,
            "The returned amount should just be the initial amount"
        );
        await createStake(6000, me);
        await createStake(2000, tester);

        await fastForward(15778476);
        totalValue = await StakingMaster.returnUsersTotalStakeValue(tester);

        assert.equal(
            Math.round(web3.utils.fromWei(totalValue)),
            8243,
            "The returned amount should include the interest"
        );

        // Fast forward to end
        await fastForward(15778476 * 10);

        totalValue = await StakingMaster.returnUsersTotalStakeValue(tester);

        assert.equal(
            Math.round(web3.utils.fromWei(totalValue)),
            8493,
            "The returned amount should include the interest"
        );

        totalValue = await StakingMaster.returnUsersTotalStakeValue(me);

        assert.equal(
            Math.round(web3.utils.fromWei(totalValue)),
            15925,
            "The returned amount should include the interest"
        );
    });
});
