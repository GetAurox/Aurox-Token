const StakingMasterContract = artifacts.require(
    "../../../contracts/StakingMaster/StakingMaster.sol"
);

const returnStakeAddress = require("../helpers/returnStakeAddress");

contract("Staking Master - Simple and Compound Interest", async (accounts) => {
    let StakingMaster;

    let testMoney = 300000;

    const secondsInAYear = 31556952;

    before(async () => {
        StakingMaster = await StakingMasterContract.new(accounts[0], 0);
    });

    // Calculate the simple interest:
    // Amount -> $1000
    // Interest -> 10%
    // Duration -> 1 Year
    // Expected Interest -> $1100
    it("Tests that the interest is calculated correctly for a simple interest calculation", async () => {
        const _amount = 1000;
        // 10% interest 0.1e18;
        const interest = 0.1;
        // Seconds per year
        // uint256 duration = 31540008;
        const interestAmount = await StakingMaster.returnSimpleInterest.call(
            web3.utils.toWei(_amount.toString()),
            web3.utils.toWei(interest.toString()),
            secondsInAYear
        );
        // Expected interest amount of $1,100 including 10% interest for a year
        const expectedInterest = "1100";
        assert.equal(
            interestAmount,
            web3.utils.toWei(expectedInterest),
            "Simple interest values are equal"
        );
    });

    // A more complex version of calculating the simple interest:
    // Amount -> $3900131.11
    // Interest -> 12.31%
    // Duration -> 3.5 Years
    // Expected Interest -> $5580502.59874
    it("Tests that the interest is calculated correctly a more complex version of the simple interest", async () => {
        // $3900131.11
        const _amount = 3900131.11;
        // 12.31% interest 0.1e18;
        const interest = 0.1231;
        // 3.5 years
        const duration = secondsInAYear * 3.5;

        const interestAmount = await StakingMaster.returnSimpleInterest.call(
            web3.utils.toWei(_amount.toString()),
            web3.utils.toWei(interest.toString()),
            duration
        );
        // Expected interest amount of $1,100 including 10% interest for a year
        const expectedInterest = "5580502.5987435";
        assert.equal(
            interestAmount.toString(),
            web3.utils.toWei(expectedInterest),
            "Simple interest values are equal"
        );
    });

    // Calculate the compound interest
    // Amount -> $1000
    // Interest -> 10%
    // Duration -> 1 Year
    // Expected Interest -> $1103.8189
    it("Tests that the compound interest is calculated properly for a basic version ", async () => {
        // $1000
        const _amount = 1000;
        // 10%
        const interest = 0.1;
        // 1 year

        const interestAmount = await StakingMaster.returnCompoundInterest.call(
            web3.utils.toWei(_amount.toString()),
            web3.utils.toWei(interest.toString()),
            secondsInAYear
        );
        // Expected interest amount of $1,100 including 10% interest for a year
        assert.equal(
            interestAmount.toString(),
            "1104713067441297241584",
            "Simple interest values are equal"
        );
    });

    // Calculate a more complex version of the compound interest
    // Amount -> $32,500
    // Interest -> 24%
    // Duration -> 3 Years
    // Expected Interest -> $65,396.39
    it("Tests that the compound interest is calculated properly for a more complex version ", async () => {
        // $32,500
        const _amount = 32500;
        // 24% interest
        const interest = 0.24;

        const interestAmount = await StakingMaster.returnCompoundInterest.call(
            web3.utils.toWei(_amount.toString()),
            web3.utils.toWei(interest.toString()),
            secondsInAYear * 3
        );
        // Expected interest amount of $1,100 including 10% interest for a year
        assert.equal(
            interestAmount.toString(),
            "66296338670760388742835",
            "Simple interest values are equal"
        );
    });

    // Calculate the compound interest utilising a duration that has incomplete quarters
    // Amount -> $1000
    // Interest -> 10%
    // Duration -> 0.1 Years
    // Expected Interest -> $1009.99
    it("Tests that the compound interest is calculated properly when a half month is provided ", async () => {
        // $1000
        const _amount = 1000;
        // 10%
        const interest = 0.1;
        // 0.1 years
        const duration = Math.round(secondsInAYear / 10);

        const interestAmount = await StakingMaster.returnCompoundInterest.call(
            web3.utils.toWei(_amount.toString()),
            web3.utils.toWei(interest.toString()),
            duration
        );
        // Expected interest amount of $1,100 including 10% interest for a year
        assert.equal(
            interestAmount.toString(),
            "1010013888249832662334",
            "Simple interest values are equal"
        );
    });

    // Calculate the compound interest utilising a duration that has incomplete quarters
    // Amount -> $32,500
    // Interest -> 24%
    // Duration -> 3.1 Years
    // Expected Interest -> $66,965.89
    it("Tests that the compound interest is calculated properly when a half month is provided and a more complex version ", async () => {
        // $1000
        const _amount = 32500;
        // 24%
        const interest = 0.24;
        // 3.1 years
        const duration = Math.round(secondsInAYear * 3.1);

        const interestAmount = await StakingMaster.returnCompoundInterest.call(
            web3.utils.toWei(_amount.toString()),
            web3.utils.toWei(interest.toString()),
            duration
        );
        // Expected interest amount of $1,100 including 10% interest for a year
        assert.equal(
            interestAmount.toString(),
            "67892754403094813132625",
            "Simple interest values are equal"
        );
    });

    it("Tests that a huge duration doesnt break the compound interest calculation", async () => {
        // $1000
        const _amount = 32500;
        // 24%
        const interest = 0.24;
        // 10.5 years
        const duration = Math.round(secondsInAYear * 10.5);

        const interestAmount = await StakingMaster.returnCompoundInterest.call(
            web3.utils.toWei(_amount.toString()),
            web3.utils.toWei(interest.toString()),
            duration
        );

        assert.equal(
            Math.round(web3.utils.fromWei(interestAmount)),
            394008,
            "Simple interest values are equal"
        );
    });
});
