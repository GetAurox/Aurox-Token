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

contract("Provider - Multiple Epochs Single User", async (accounts) => {
    const me = accounts[0];
    const tester = accounts[1];
    const jeff = accounts[2];

    const burn = accounts[9];

    const _amount = 1000;
    let testMoney = 1000;
    const secondsInFortnight = 1210000;

    let Provider;

    let AuroxToken;
    let UniSwapToken;

    async function createNewProviderContract() {
        const epochStart = Math.round(new Date().getTime() / 1000) - 10000;
        Provider = await ProviderContract.new(
            UniSwapToken.address,
            AuroxToken.address,
            accounts[0],
            epochStart,
            UniSwapToken.address
        );
        await AuroxToken.setAllowance(me);
        await AuroxToken.setAllowance(Provider.address);
        // Allow the amount to be transferred
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(testMoney.toString())
        );
    }

    before(async () => {
        UniSwapToken = await ERC20Contract.new();

        AuroxToken = await AuroxTokenContract.new(
            "0x82C01fEac95776e099530a81fEdE18265229319a",
            "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
            "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
        );
        await UniSwapToken.mint(me, web3.utils.toWei(_amount.toString()));

        await createNewProviderContract();
    });

    beforeEach(async () => {
        // Reset balances
        const meBalance = await AuroxToken.balanceOf.call(me);
        AuroxToken.transfer(burn, meBalance);
        const testerBalance = await AuroxToken.balanceOf.call(tester);

        AuroxToken.transfer(burn, testerBalance, { from: tester });

        // const jeffBalance = await AuroxToken.balanceOf.call(jeff);

        // AuroxToken.transfer(burn, jeffBalance, { from: jeff });

        // // Add back in balance

        // UniSwapToken.mint(tester, web3.utils.toWei(_amount.toString()));
        // UniSwapToken.mint(jeff, web3.utils.toWei(_amount.toString()));
    });

    it("Tests that a single user who claims rewards for multiple epoch's is awarded the correct amounts", async () => {
        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()));

        await fastForward(secondsInFortnight * 3);

        await Provider.claimRewards(false, 12);

        const afterBalanceMe = await AuroxToken.balanceOf.call(me);

        // 1500 + 0%, 1400 + 10%, 1300 + 20%
        // 1500 + 1540 + 1560
        assert.equal(
            Math.round(web3.utils.fromWei(afterBalanceMe)),
            4599,
            "The rewards should be 1500 + 0%, 1400 + 10%, 1300 + 20% = 4200"
        );
    });

    it("Tests that a single user who claims rewards for 10 epochs is awarded the correct amounts", async () => {
        const beforeBalance = await AuroxToken.balanceOf.call(me);
        assert.equal(beforeBalance, 0, "The balance after burn should be 0");

        await fastForward(secondsInFortnight * 10);

        await Provider.claimRewards(false, 12);

        const afterBalanceMe = await AuroxToken.balanceOf.call(me);

        assert.equal(
            Math.round(web3.utils.fromWei(afterBalanceMe)),
            13393,
            "The rewards before the bonus should be $13393"
        );
    });

    it("Tests that a single user who claims rewards for 100 epochs is awarded the correct amounts", async () => {
        const beforeBalance = await AuroxToken.balanceOf.call(me);
        assert.equal(beforeBalance, 0, "The balance after burn should be 0");

        await fastForward(secondsInFortnight * 100);

        await Provider.claimRewards(false, 12);

        const afterBalanceMe = await AuroxToken.balanceOf.call(me);

        assert.equal(
            Math.round(web3.utils.fromWei(afterBalanceMe)),
            120012,
            "The rewards before the bonus should be 100 * $600 = $60000 + 100% = ~$120000"
        );
    });

    it("Tests that a user claiming rewards multiple times within an epoch is given the correct amounts", async () => {
        const rewardAmount = 150;
        await fastForward(secondsInFortnight / 4);
        await Provider.claimRewards(false, 12);

        let balance = await AuroxToken.balanceOf.call(me);

        assert.equal(
            Math.round(web3.utils.fromWei(balance)),
            rewardAmount,
            "Balance should be $150 for 1/4th of the epoch duration + 100% bonus"
        );
        await fastForward(secondsInFortnight / 4);
        await Provider.claimRewards(false, 12);

        balance = await AuroxToken.balanceOf.call(me);

        assert.equal(
            Math.round(web3.utils.fromWei(balance)),
            rewardAmount * 2,
            "Balance should be double"
        );
        await fastForward(secondsInFortnight / 4);
        await Provider.claimRewards(false, 12);

        balance = await AuroxToken.balanceOf.call(me);

        assert.equal(
            Math.round(web3.utils.fromWei(balance)),
            rewardAmount * 3,
            "Balance should be double"
        );
        await fastForward(secondsInFortnight / 4);
        await Provider.claimRewards(false, 12);

        balance = await AuroxToken.balanceOf.call(me);

        assert.equal(
            Math.round(web3.utils.fromWei(balance)),
            723,
            "Balance should be 150 * 4 = 600 + 100% of 150 ~= 745"
        );
    });
});
