const ProviderContract = artifacts.require("./contracts/Provider/Provider.sol");

contract("Provider - Return Epoch to Timestamp", async (accounts) => {
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

    it("Test that when not modifying the epoch start time it returns epoch one", async () => {
        // const halfWayThroughEpochTime = epochStart + 604800;
        const currentEpoch = await Provider._returnEpochToTimestamp(epochStart);
        assert.equal(currentEpoch, 1, "Should be in epoch 1");
        // await fastForward();
    });

    it("Test that when a week through the epoch it returns epoch 1", async () => {
        const halfWayThroughEpochTime = epochStart + 604800;
        const currentEpoch = await Provider._returnEpochToTimestamp(
            halfWayThroughEpochTime
        );
        assert.equal(currentEpoch, 1, "Should be in epoch 1");
    });

    it("Test that when you're near the end of the epoch one it hasn't accidentally finished", async () => {
        const halfWayThroughEpochTime = epochStart + 1209500;
        // console.log(halfWayThroughEpochTime);
        const currentEpoch = await Provider._returnEpochToTimestamp(
            halfWayThroughEpochTime
        );
        assert.equal(currentEpoch, 1, "Should be in epoch 1");
    });

    it("Test that when adding a 2 week duration epoch 2 is returned", async () => {
        const halfWayThroughEpochTime = epochStart + 1209600;
        // console.log(halfWayThroughEpochTime);
        const currentEpoch = await Provider._returnEpochToTimestamp(
            halfWayThroughEpochTime
        );
        assert.equal(currentEpoch, 2, "Should be in epoch 2");
    });

    it("Test that when adding a 6 week duration epoch 4 is returned", async () => {
        const halfWayThroughEpochTime = epochStart + 3628800;
        // console.log(halfWayThroughEpochTime);
        const currentEpoch = await Provider._returnEpochToTimestamp(
            halfWayThroughEpochTime
        );
        assert.equal(currentEpoch, 4, "Should be in epoch 4");
    });
});
