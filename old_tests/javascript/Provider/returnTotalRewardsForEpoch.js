const ProviderContract = artifacts.require("./contracts/Provider/Provider.sol");
const fastForward = require("../helpers/fastForward");

contract("Provider - Return Total rewards for epoch", async (accounts) => {
    let Provider;
    const epochStart = Math.round(new Date().getTime() / 1000);

    before(async () => {
        Provider = await ProviderContract.new(
            accounts[0],
            accounts[1],
            accounts[0],
            epochStart,
            accounts[0]
        );
    });

    it("Tests that the epoch rewards for epoch 1 are 1500", async () => {
        const epochRewards = await Provider.returnTotalRewardForEpoch(1);
        assert.equal(
            epochRewards.toString(),
            web3.utils.toWei("1500"),
            "Epoch rewards for epoch 1 should be 1500"
        );
    });

    it("Tests that the epoch rewards for epoch 2 are 1400", async () => {
        const epochRewards = await Provider.returnTotalRewardForEpoch(2);
        assert.equal(
            epochRewards.toString(),
            web3.utils.toWei("1400"),
            "Epoch rewards for epoch 2 should be 1400"
        );
    });

    it("Tests that the epoch rewards for epoch 3 are 1300", async () => {
        const epochRewards = await Provider.returnTotalRewardForEpoch(3);
        assert.equal(
            epochRewards.toString(),
            web3.utils.toWei("1300"),
            "Epoch rewards for epoch 3 should be 1300"
        );
    });

    it("Tests that the epoch rewards for epoch 10 are 600", async () => {
        const epochRewards = await Provider.returnTotalRewardForEpoch(10);
        assert.equal(
            epochRewards.toString(),
            web3.utils.toWei("600"),
            "Epoch rewards for epoch 10 should be 600"
        );
    });

    it("Tests that the epoch rewards never drop below 600", async () => {
        const epochRewards = await Provider.returnTotalRewardForEpoch(15);
        assert.equal(
            epochRewards.toString(),
            web3.utils.toWei("600"),
            "Epoch rewards for epoch 15 should be 600"
        );
    });
});
