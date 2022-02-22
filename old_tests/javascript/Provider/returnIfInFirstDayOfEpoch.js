const ProviderContract = artifacts.require("./contracts/Provider/Provider.sol");
const fastForward = require("../helpers/fastForward");
const removeAccuracy = require("../helpers/removeAccuracy");

contract("Provider - Return If in first day of epoch", async (accounts) => {
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

    it("Test's that when returning if in first day of epoch at start of epoch, true is returned", async () => {
        const ifInFirstDayOfEpoch = await Provider.returnIfInFirstDayOfEpoch(1);
        // Divide by 10 to remove small time differences when running the test
        assert.equal(
            ifInFirstDayOfEpoch,
            true,
            "Should return true as it is the start of the epoch"
        );
    });

    it("Test's that when returning if in first day of epoch near the end of the first day the correct value is returned", async () => {
        await fastForward(86100);
        const ifInFirstDayOfEpoch = await Provider.returnIfInFirstDayOfEpoch(1);
        // Divide by 10 to remove small time differences when running the test
        assert.equal(
            ifInFirstDayOfEpoch,
            true,
            "Should return true as it is still in epoch one, just near the end"
        );
    });

    it("Test's that when returning if in first day of epoch after the first day, false is returned", async () => {
        await fastForward(86300);
        const ifInFirstDayOfEpoch = await Provider.returnIfInFirstDayOfEpoch(1);
        // Divide by 10 to remove small time differences when running the test
        assert.equal(
            ifInFirstDayOfEpoch,
            false,
            "Should return true as it is still in epoch one, just near the end"
        );
    });
});
