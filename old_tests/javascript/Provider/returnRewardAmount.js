const ProviderContract = artifacts.require("./contracts/Provider/Provider.sol");
const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);

const fastForward = require("../helpers/fastForward");

const ERC20Contract = artifacts.require(
    "./contracts/TestHelpers/ERC20Mintable.sol"
);

contract("Provider - Return reward amount", async (accounts) => {
    const me = accounts[0];

    const _amount = 1000;
    let testMoney = 1000000;

    const secondsInFortnight = 1209600;

    let Provider;

    let AuroxToken;
    let UniSwapToken;

    before(async () => {
        UniSwapToken = await ERC20Contract.new();
        UniSwapToken.mint(me, web3.utils.toWei(testMoney.toString()));
        AuroxToken = await AuroxTokenContract.new(
            "0x82C01fEac95776e099530a81fEdE18265229319a",
            "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
            "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
        );
        const epochStart = Math.round(new Date().getTime() / 1000) - 10000;
        Provider = await ProviderContract.new(
            UniSwapToken.address,
            AuroxToken.address,
            accounts[0],
            epochStart,
            UniSwapToken.address
        );
        // Allow the amount to be transferred
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(testMoney.toString())
        );
    });

    it("Tests that calculating the reward share for an epoch where the user owns the entire share and they're claiming the entire duration of the epoch", async () => {
        const rewardAmount = await Provider._returnRewardAmount.call(
            1000,
            1000,
            secondsInFortnight,
            1500
        );

        assert.equal(
            rewardAmount,
            1500,
            "The reward amount should be the total amount because they have the entire share and claiming for the whole fortnight"
        );
    });

    it("Tests that calculating the reward share for a user who owns half the total amount and claiming for the whole duration, returns half the pool amount", async () => {
        const rewardAmount = await Provider._returnRewardAmount.call(
            1000,
            2000,
            secondsInFortnight,
            1500
        );

        assert.equal(
            rewardAmount,
            750,
            "The reward amount should be half the original amount"
        );
    });

    it("Tests that calculating the reward share for a user who owns the entire share but claiming for only half the epoch duration", async () => {
        const rewardAmount = await Provider._returnRewardAmount.call(
            2000,
            2000,
            secondsInFortnight / 2,
            1500
        );

        assert.equal(
            rewardAmount,
            750,
            "The reward amount should be half the original amount"
        );
    });

    it("Tests that calculating the reward share for a user who owns half the share and is only claiming rewards for half the epoch", async () => {
        const rewardAmount = await Provider._returnRewardAmount.call(
            1000,
            2000,
            secondsInFortnight / 2,
            1500
        );

        assert.equal(
            rewardAmount,
            375,
            "The reward amount should be half the original amount"
        );
    });

    it("Tests that calculating rewards for a user who owns 15% of the pool for the whole epoch duration", async () => {
        const rewardAmount = await Provider._returnRewardAmount.call(
            180,
            1200,
            secondsInFortnight,
            1500
        );

        assert.equal(
            rewardAmount,
            225,
            "The reward amount should be 15% of the original amount"
        );
    });

    it("Tests that calculating rewards for a user who owns 100% of the pool for 10% of the duration", async () => {
        const rewardAmount = await Provider._returnRewardAmount.call(
            1200,
            1200,
            secondsInFortnight / 10,
            1500
        );

        assert.equal(
            rewardAmount,
            150,
            "The reward amount should be 10% of the original amount"
        );
    });

    it("Tests that calculating rewards for a user who owns 15% of the pool for 10% of the duration", async () => {
        const rewardAmount = await Provider._returnRewardAmount.call(
            web3.utils.toWei("180"),
            web3.utils.toWei("1200"),
            secondsInFortnight / 10,
            web3.utils.toWei("1500")
        );

        assert.equal(
            web3.utils.fromWei(rewardAmount),
            22.5,
            "The reward amount should be 10% of the original amount"
        );
    });
});

// truffle test ./test/javascript/Provider/addLiquidity.js --compile-none
