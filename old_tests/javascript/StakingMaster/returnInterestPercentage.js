const StakingMasterContract = artifacts.require(
    "../../../contracts/StakingMaster/StakingMaster.sol"
);
const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);
const fastForward = require("../helpers/fastForward");

contract("StakingMaster - Return Interest Percentage", async (accounts) => {
    let StakingMaster;

    before(async () => {
        // Create the token contracts
        StakingMaster = await StakingMasterContract.new(accounts[0], 0);
    });

    /* Testing providing various durations to return the appropriate interest percentage */

    // Calculate the interest Percentage
    // Duration -> 1 year (12 months)
    // epochOne -> False
    // fromStakingContract -> false
    it("Test's that the interest percentage is correct in a basic case", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            12,
            false,
            false
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.06;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Basic interest values aren't equal"
        );
    });

    // Calculate the interest Percentage
    // Duration -> 4 year (48 months)
    // epochOne -> False
    // fromStakingContract -> false
    it("Test's that the interest percentage is correct in a mid-range case", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            20,
            false,
            false
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.1;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Mid-range interest values aren't equal"
        );
    });

    // Calculate the interest Percentage
    // Duration -> (40 months)
    // epochOne -> False
    // fromStakingContract -> false
    it("Test's that the interest percentage is correct in a end-range case", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            40,
            false,
            false
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.2;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "End-Range interest values aren't equal"
        );
    });

    // Testing that when overflowing the interest percentage the maximum interest value should be returned 20%
    // Duration -> 9 year (12 months)
    // epochOne -> False
    // fromStakingContract -> false
    it("Test's that the interest percentage is correct in a overflow case", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            108,
            false,
            false
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.2;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Overflow interest values aren't equal"
        );
    });

    /* Testing that when providing amounts from epoch one the interest rate is updated to reflect that */

    // Ensure the interest bonus doesn't get added if the duration is shorter than 1 year
    it("Test's that the interest percentage is correct when from epoch one but a shorter duration than 1 year", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            9,
            true,
            false
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.045;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Epoch one and duration shorter than 12 months interest values aren't correct"
        );
    });

    // Calculate the interest Percentage
    // Duration -> 1 year (12 months)
    // epochOne -> true
    // fromStakingContract -> false
    it("Test's that the interest percentage is correct when from epoch one but with a duration of 12 months", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            12,
            true,
            false
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.09;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Epoch one and duration equal to 12 months interest values aren't correct"
        );
    });

    // Calculate the mid range interest percentage
    // Duration -> 4 year (48 months)
    // epochOne -> False
    // fromStakingContract -> false
    it("Test's that the interest percentage is correct when from epoch one but with a mid-range duration", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            48,
            true,
            false
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.3;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Epoch one and duration 48 months interest values dont match up"
        );
    });

    // Calculate the interest percentage with values that will overflow the maximum value of 30%. Ensure 30% is returned.
    // Duration -> 9 year (48 months)
    // epochOne -> False
    // fromStakingContract -> false
    it("Test's that the interest percentage is correct when from epoch one and overflowing the range", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            108,
            true,
            false
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.3;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Epoch one and duration overflowing interest values don't match up"
        );
    });

    /* Testing that when providing amounts from the staking contract the additional 25% interest is added */

    // Calculate the interest Percentage
    // Duration -> 1 year (12 months)
    // epochOne -> true
    // fromStakingContract -> false
    it("Test's that the interest percentage is correct when coming from the provider contract with a duration of 12 months", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            12,
            false,
            true
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.075;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Interest percentage not correct when from the provider contract"
        );
    });

    // Calculate the mid range interest percentage
    // Duration -> 4 year (48 months)
    // epochOne -> False
    // fromStakingContract -> false
    it("Test's that the interest percentage is correct when coming from the provider contract with a duration of 48 months", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            48,
            false,
            true
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.25;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Interest values not correct"
        );
    });

    // Calculate the interest percentage with values that will overflow the maximum value of 42%. Ensure 42% is returned.
    // Duration -> 9 year (48 months)
    // epochOne -> False
    // fromStakingContract -> false
    it("Test's that the interest percentage is correct when coming from the provider contract with an overflow duration", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            108,
            false,
            true
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.25;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Interest values not correct"
        );
    });

    /* Test that when coming from epoch one and the staking contract only the epoch one rewards are added */

    // Duration -> 1 year (12 months)
    // epochOne -> true
    // fromStakingContract -> true
    it("Test's that the interest percentage is correct when coming from the provider contract and epoch one with a duration of 12 months", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            12,
            true,
            true
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.09;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Interest values not correct"
        );
    });

    // Calculate the mid range interest percentage
    // Duration -> 4 year (48 months)
    // epochOne -> true
    // fromStakingContract -> true
    it("Test's that the interest percentage is correct when coming from the provider contract and epoch one with a mid-range duration", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            48,
            true,
            true
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.3;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Interest values not correct"
        );
    });

    // Calculate the interest percentage with values that will overflow the maximum value of 42%. Ensure 42% is returned.
    // Duration -> 9 year (48 months)
    // epochOne -> true
    // fromStakingContract -> true
    it("Test's that the interest percentage is correct when coming from the provider contract and epoch one with a mid-range duration", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            108,
            true,
            true
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.3;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Interest values not correct"
        );
    });

    it("Test's that the interest percentage is correct when coming from the provider contract and epoch one with a huge duration", async () => {
        // Calculate the interest amount
        const interestPercentage = await StakingMaster.returnInterestPercentage(
            1008,
            true,
            true
        );

        const convertedInterest = web3.utils.fromWei(interestPercentage);

        const expectedInterestPercentage = 0.3;
        assert.equal(
            expectedInterestPercentage,
            convertedInterest,
            "Interest values not correct"
        );
    });
});
