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

contract("Provider - Add Liquidity", async (accounts) => {
    const me = accounts[0];

    const _amount = 1000;
    let testMoney = 1000000;

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
        // Allow the amount to be transferred
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(testMoney.toString())
        );
    }

    before(async () => {
        UniSwapToken = await ERC20Contract.new();
        UniSwapToken.mint(me, web3.utils.toWei(testMoney.toString()));
        AuroxToken = await AuroxTokenContract.new(
            "0x82C01fEac95776e099530a81fEdE18265229319a",
            "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
            "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
        );

        await createNewProviderContract();
    });

    it("Tests that when a user adds liquidity for the first time, their values are set correctly", async () => {
        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()));

        const userData = await Provider.userInvestments.call(accounts[0]);

        const { lastLiquidityAddedEpochReference, lastEpochUpdate } = userData;

        assert.equal(
            lastLiquidityAddedEpochReference,
            1,
            "The reference should be set to 1"
        );

        assert.equal(
            lastEpochUpdate,
            1,
            "Should be in epoch 1 as they just added liquidity to epoch 1"
        );

        const epochTotals = await Provider.returnUsersEpochTotals(1, me);

        const { shareTotal, currentInvestmentTotal, allPrevInvestmentTotals } =
            epochTotals;

        assert.equal(
            web3.utils.fromWei(currentInvestmentTotal),
            _amount,
            "The current total should just be the initial amount"
        );

        assert.equal(
            allPrevInvestmentTotals,
            0,
            "The all previous totals should be 0 because the user hasn't invested in 2 epochs"
        );

        const epochAmounts = await Provider.epochAmounts.call(1);
        const {
            shareTotal: overallShareTotal,
            currentInvestmentTotal: overallCurrentTotal,
            allPrevInvestmentTotals: overallAllPrevInvestmentTotals,
        } = epochAmounts;

        assert.equal(
            web3.utils.fromWei(overallCurrentTotal),
            _amount,
            "The overall current total should be set to the user's total"
        );

        assert.equal(
            overallAllPrevInvestmentTotals,
            0,
            "The all previous totals should be 0 because no user has invested in epochs"
        );
    });

    it("Tests that when a user adds liquidity a second time, their amounts are incremented correctly", async () => {
        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()));

        const epochTotals = await Provider.returnUsersEpochTotals(1, me);

        const { currentInvestmentTotal, allPrevInvestmentTotals } = epochTotals;

        assert.equal(
            web3.utils.fromWei(currentInvestmentTotal),
            _amount * 2,
            "The current total should be equal to 2000"
        );

        assert.equal(
            allPrevInvestmentTotals,
            0,
            "The all prev investment totals should still be 0 as in the same epoch"
        );

        const epochAmounts = await Provider.epochAmounts.call(1);
        const {
            currentInvestmentTotal: overallCurrentTotal,
            allPrevInvestmentTotals: overallAllPrevInvestmentTotals,
        } = epochAmounts;

        assert.equal(
            web3.utils.fromWei(overallCurrentTotal),
            _amount * 2,
            "The overall current total should be set to the user's total"
        );

        assert.equal(
            overallAllPrevInvestmentTotals,
            0,
            "The all previous totals should be 0 because no user has invested in epochs"
        );
    });

    it("Tests that a new user investing in the middle of an epoch,has their values set correctly and the overall values are set correctly", async () => {
        // Get a fresh provider contract
        await createNewProviderContract();
        // Fast forward 1 week and then store in the contract, ensure the values are set correctly
        await fastForward(604800);
        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()));

        const epochTotals = await Provider.returnUsersEpochTotals(1, me);

        const { currentInvestmentTotal, shareTotal } = epochTotals;

        assert.equal(
            web3.utils.fromWei(currentInvestmentTotal),
            _amount,
            "The user's invested amount should be equal to their initial _amount"
        );
    });

    it("Tests that a user who has invested in epoch 1 and then investing in epoch 2, has their values pulled forward and set correctly", async () => {
        // Fast forward another week to put as in epoch 1
        await fastForward(604800);

        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()));
        const epochTotals = await Provider.returnUsersEpochTotals(2, me);

        const { currentInvestmentTotal, shareTotal, allPrevInvestmentTotals } =
            epochTotals;

        assert.equal(
            web3.utils.fromWei(currentInvestmentTotal),
            _amount,
            "The total for this epoch should be equal to the amount"
        );

        assert.equal(
            web3.utils.fromWei(allPrevInvestmentTotals),
            _amount,
            "The all previous total from epoch 1 should be carried over so that the total is equal to the stored amount in epoch 1"
        );

        const epochAmounts = await Provider.epochAmounts.call(2);
        const {
            shareTotal: overallShareTotal,
            currentInvestmentTotal: overallCurrentTotal,
            allPrevInvestmentTotals: overallAllPrevInvestmentTotals,
        } = epochAmounts;

        assert.equal(
            web3.utils.fromWei(overallShareTotal),
            web3.utils.fromWei(shareTotal),
            "The total for this epoch should be equal to the amount"
        );

        assert.equal(
            web3.utils.fromWei(overallAllPrevInvestmentTotals),
            _amount,
            "The all previous total from epoch 1 should be carried over so that the total is equal to the stored amount in epoch 1"
        );
    });

    //
});

// truffle test ./test/javascript/Provider/addLiquidity.js --compile-none
