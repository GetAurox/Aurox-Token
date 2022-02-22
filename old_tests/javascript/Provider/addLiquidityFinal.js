const ProviderContract = artifacts.require("./contracts/Provider/Provider.sol");
const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);

const fastForward = require("../helpers/fastForward");

const ERC20Contract = artifacts.require(
    "./contracts/TestHelpers/ERC20Mintable.sol"
);

contract("Provider - Add Liquidity Final", async (accounts) => {
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

    it("Tests that when a user adds value in epoch 1, then a second user adds value in epoch 2, then when the first user adds liquidity in 3 epochs time there values are carried forward correctly. As well as the second users", async () => {
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
        // Fast forward an epoch
        await fastForward(1209600);
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
        // Fast forward 3 epochs
        await fastForward(3629000);

        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()));

        const userOneTotals = await Provider.returnUsersEpochTotals(5, me);

        const { currentInvestmentTotal, allPrevInvestmentTotals, shareTotal } =
            userOneTotals;

        assert.equal(
            web3.utils.fromWei(currentInvestmentTotal),
            _amount,
            "The users current total should be equal to the amount they just invested"
        );
        assert.equal(
            web3.utils.fromWei(allPrevInvestmentTotals),
            _amount,
            "The users all previous total should be equal to the original invested amount"
        );

        const userTwoTotals = await Provider.returnUsersEpochTotals(
            2,
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

        const userOnesInvestmentTotal =
            await Provider.returnUsersInvestmentTotal.call(me);

        assert.equal(
            web3.utils.fromWei(userOnesInvestmentTotal),
            _amount * 2,
            "The overall total for user one should be 2x the amount as they invested twice"
        );

        const userTwosInvestmentTotal =
            await Provider.returnUsersInvestmentTotal.call(accounts[1]);

        assert.equal(
            web3.utils.fromWei(userTwosInvestmentTotal),
            _amount,
            "The overall total for user two should just be amount as they invested once"
        );
    });
});

// truffle test ./test/javascript/Provider/addLiquidity.js --compile-none
