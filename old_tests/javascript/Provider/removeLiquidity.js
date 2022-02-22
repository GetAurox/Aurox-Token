const ProviderContract = artifacts.require("./contracts/Provider/Provider.sol");
const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);

const fastForward = require("../helpers/fastForward");

const ERC20Contract = artifacts.require(
    "./contracts/TestHelpers/ERC20Mintable.sol"
);

contract("Provider - Removing Liquidity", async (accounts) => {
    const _amount = 1000;
    let testMoney = 1000000;

    const secondsInFortnight = 1209600;
    const me = accounts[0];
    const tester = accounts[1];

    const tester2 = accounts[2];

    const jeff = accounts[3];

    const stevo = accounts[4];

    let Provider;

    let AuroxToken;
    let UniSwapToken;

    async function createProvider() {
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
        UniSwapToken.mint(me, web3.utils.toWei(testMoney.toString()));
        AuroxToken = await AuroxTokenContract.new(
            "0x82C01fEac95776e099530a81fEdE18265229319a",
            "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
            "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
        );

        await createProvider();
    });

    it("Tests that a user removing liquidity during an epoch that they invested in, it re-calculates their available share amount and deducts their total correctly", async () => {
        await UniSwapToken.transfer(
            tester,
            web3.utils.toWei(_amount.toString())
        );
        // Allow the amount to be transferred
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(_amount.toString()),
            { from: tester }
        );

        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()), {
            from: tester,
        });
        // Fast forward an half the epoch
        await fastForward(secondsInFortnight / 2);
        await Provider.removeLiquidity(web3.utils.toWei(_amount.toString()), {
            from: tester,
        });

        const balance = await UniSwapToken.balanceOf.call(tester);

        assert.equal(
            web3.utils.fromWei(balance),
            _amount * 0.9,
            "The balance of the user should be deducted the burn amount"
        );

        const burnBalance = await UniSwapToken.balanceOf.call(
            "0x0000000000000000000000000000000000000001"
        );
        assert.equal(
            web3.utils.fromWei(burnBalance),
            _amount * 0.1,
            "The balance of the burn address should be 10% of the amount"
        );

        const epochTotals = await Provider.returnUsersEpochTotals(1, tester);

        const { shareTotal, currentInvestmentTotal } = epochTotals;

        assert.equal(
            Math.round(web3.utils.fromWei(shareTotal)),
            500,
            "The balance of the share amount should be deducted so they only get rewards up until the share was removed"
        );

        assert.equal(
            web3.utils.fromWei(currentInvestmentTotal),
            0,
            "The current epoch total should be removed"
        );
        // Fast forward so the next user has a fresh epoch
        await fastForward(secondsInFortnight / 2);
    });

    it("Tests that a user removing liquidity in day one of the epoch, doesn't get penalized", async () => {
        await UniSwapToken.transfer(
            tester2,
            web3.utils.toWei(_amount.toString())
        );
        // Allow the amount to be transferred
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(_amount.toString()),
            { from: tester2 }
        );

        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()), {
            from: tester2,
        });

        await Provider.removeLiquidity(web3.utils.toWei(_amount.toString()), {
            from: tester2,
        });

        const balance = await UniSwapToken.balanceOf.call(tester2);
        assert.equal(
            Math.round(web3.utils.fromWei(balance)),
            1000,
            "The balance of the user invested  should be equal to the original balance, because they pulled it at the start of the epoch."
        );

        // Allow the amount to be transferred
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(_amount.toString()),
            { from: tester2 }
        );

        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()), {
            from: tester2,
        });

        await fastForward(secondsInFortnight);
        await Provider.removeLiquidity(web3.utils.toWei(_amount.toString()), {
            from: tester2,
        });

        const fastForwardedBalance = await UniSwapToken.balanceOf.call(tester2);
        assert.equal(
            Math.round(web3.utils.fromWei(fastForwardedBalance)),
            1000,
            "The balance of the user after another epoch should be the original amount because it was pulled at the start of the epoch again"
        );
    });

    it("Tests that a user who invested in an earlier epoch, then pulled their epoch amounts, that they have the correct values", async () => {
        await UniSwapToken.transfer(jeff, web3.utils.toWei(_amount.toString()));
        // Allow the amount to be transferred
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(_amount.toString()),
            { from: jeff }
        );

        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()), {
            from: jeff,
        });

        await fastForward(secondsInFortnight * 4);

        const usersTotalBeforePulling =
            await Provider.returnUsersInvestmentTotal(jeff);

        assert.equal(
            web3.utils.fromWei(usersTotalBeforePulling),
            1000,
            "The user's total should be the original amount"
        );

        await Provider.removeLiquidity(web3.utils.toWei(_amount.toString()), {
            from: jeff,
        });

        const balance = await UniSwapToken.balanceOf.call(jeff);
        assert.equal(
            Math.round(web3.utils.fromWei(balance)),
            1000,
            "The balance of the user invested  should be equal to the original balance, because they pulled it at the start of the epoch."
        );

        const usersTotal = await Provider.returnUsersInvestmentTotal(jeff);

        assert.equal(
            web3.utils.fromWei(usersTotal),
            0,
            "Now that they have pulled their amounts"
        );
    });

    it("Tests that a user who pulls a partial amount of their investment amount in the same epoch it was added, has their values set correctly", async () => {
        await UniSwapToken.transfer(
            stevo,
            web3.utils.toWei(_amount.toString())
        );
        // Allow the amount to be transferred
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(_amount.toString()),
            { from: stevo }
        );

        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()), {
            from: stevo,
        });

        const usersTotalBeforePulling =
            await Provider.returnUsersInvestmentTotal(stevo);

        assert.equal(
            web3.utils.fromWei(usersTotalBeforePulling),
            1000,
            "The user's total should be the original amount"
        );

        await Provider.removeLiquidity(
            web3.utils.toWei((_amount / 2).toString()),
            {
                from: stevo,
            }
        );

        const balance = await UniSwapToken.balanceOf.call(stevo);
        assert.equal(
            Math.round(web3.utils.fromWei(balance)),
            500,
            "The balance balance of the user should be the amount that was withdrawn."
        );

        const usersTotal = await Provider.returnUsersInvestmentTotal(stevo);

        assert.equal(
            web3.utils.fromWei(usersTotal),
            500,
            "Now that they have pulled their amounts"
        );

        const epochTotals = await Provider.returnUsersEpochTotals(7, stevo);

        const { currentInvestmentTotal } = epochTotals;

        assert.equal(
            web3.utils.fromWei(currentInvestmentTotal),
            500,
            "The users current investment total should be the remaining amount"
        );
    });
});
