const ProviderContract = artifacts.require("./contracts/Provider/Provider.sol");

const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);

const fastForward = require("../helpers/fastForward");

const ERC20Contract = artifacts.require(
    "./contracts/TestHelpers/ERC20Mintable.sol"
);

contract("Provider - Add Liquidity More Complex", async (accounts) => {
    const me = accounts[0];

    const _amount = 1000;
    let testMoney = 1000000;

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
    });

    it("Tests that when two users add liquidity to the same epoch, there values are assigned correctly", async () => {
        // Get a fresh provider contract
        const epochStart = Math.round(new Date().getTime() / 1000) - 10000;
        const Provider = await ProviderContract.new(
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

        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()));

        await UniSwapToken.transfer(
            accounts[1],
            web3.utils.toWei(_amount.toString())
        );
        // Allow the amount to be transferred
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(_amount.toString()),
            { from: accounts[1] }
        );

        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()), {
            from: accounts[1],
        });

        const userOneTotals = await Provider.returnUsersEpochTotals(1, me);

        const { currentInvestmentTotal, shareTotal, allPrevInvestmentTotals } =
            userOneTotals;

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

        const userTwoTotals = await Provider.returnUsersEpochTotals(
            1,
            accounts[1]
        );

        const {
            currentInvestmentTotal: currentInvestmentTotalUserTwo,
            shareTotal: shareTotalUserTwo,
            allPrevInvestmentTotals: allPrevInvestmentTotalsUserTwo,
        } = userTwoTotals;

        assert.equal(
            web3.utils.fromWei(currentInvestmentTotalUserTwo),
            _amount,
            "The current total for user two should just be the initial amount"
        );

        assert.equal(
            allPrevInvestmentTotalsUserTwo,
            0,
            "The all previous totals for user two should be 0 because the user hasn't invested in 2 epochs"
        );
    });

    it("Tests that when a user adds liquidity to epoch 1, then fastforwards 3 epochs and adds liquidity again, there values are carried forward correctly", async () => {
        const epochStart = Math.round(new Date().getTime() / 1000) - 10000;
        const Provider = await ProviderContract.new(
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
        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()));
        // Fast forward 3 epochs
        await fastForward(3629000);
        await Provider.addLiquidity(web3.utils.toWei((_amount * 2).toString()));

        const userOneTotals = await Provider.returnUsersEpochTotals(4, me);

        const { currentInvestmentTotal, allPrevInvestmentTotals } =
            userOneTotals;

        assert.equal(
            web3.utils.fromWei(currentInvestmentTotal),
            _amount * 2,
            "The users current total should be equal to the amount they just invested"
        );
        assert.equal(
            web3.utils.fromWei(allPrevInvestmentTotals),
            _amount,
            "The users all previous total should be equal to the original invested amount"
        );
    });
});

// truffle test ./test/javascript/Provider/addLiquidity.js --compile-none
