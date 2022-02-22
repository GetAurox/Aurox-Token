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

contract("Provider - Single Epoch Multiple Users", async (accounts) => {
    const me = accounts[0];
    const tester = accounts[1];
    const jeff = accounts[2];

    const burn = accounts[9];

    const _amount = 1000;
    let testMoney = 1000;
    const secondsInFortnight = 1210000;

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
        await AuroxToken.setAllowance(me);
        await AuroxToken.setAllowance(Provider.address);
        // Allow the amount to be transferred
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(testMoney.toString())
        );
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(testMoney.toString()),
            { from: tester }
        );
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(testMoney.toString()),
            { from: jeff }
        );
    }

    before(async () => {
        UniSwapToken = await ERC20Contract.new();

        AuroxToken = await AuroxTokenContract.new(
            "0x82C01fEac95776e099530a81fEdE18265229319a",
            "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
            "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
        );

        await createNewProviderContract();
    });

    beforeEach(async () => {
        // Reset balances
        const meBalance = await AuroxToken.balanceOf.call(me);
        AuroxToken.transfer(burn, meBalance);
        const testerBalance = await AuroxToken.balanceOf.call(tester);

        AuroxToken.transfer(burn, testerBalance, { from: tester });

        const jeffBalance = await AuroxToken.balanceOf.call(jeff);

        AuroxToken.transfer(burn, jeffBalance, { from: jeff });

        // // Add back in balance
        await UniSwapToken.mint(me, web3.utils.toWei(_amount.toString()));
        await UniSwapToken.mint(tester, web3.utils.toWei(_amount.toString()));
        await UniSwapToken.mint(jeff, web3.utils.toWei(_amount.toString()));
    });

    it("Tests that all the rewards for an epoch are allocated when a user adds liquidity at the start, followed by a second user adding liquidity in the middle of an epoch", async () => {
        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()), {
            from: tester,
        });

        await fastForward(secondsInFortnight / 2);
        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()));

        await fastForward(secondsInFortnight / 2);

        await Provider.claimRewards(false, 12);
        await Provider.claimRewards(false, 12, { from: tester });

        const afterBalanceTester = await AuroxToken.balanceOf.call(tester);

        const afterBalanceMe = await AuroxToken.balanceOf.call(me);

        assert.equal(
            Math.round(web3.utils.fromWei(afterBalanceTester)),
            1001,
            "The rewards gained for the first user should be $1000"
        );

        assert.equal(
            Math.round(web3.utils.fromWei(afterBalanceMe)),
            250,
            "The second user should have 250 in rewards"
        );
    });

    it("Tests that when the user's have their liquidity amount in there for the entire epoch they get allocated the correct rewards", async () => {
        await fastForward(secondsInFortnight);

        await Provider.claimRewards(false, 12);
        await Provider.claimRewards(false, 12, { from: tester });

        const afterBalanceTester = await AuroxToken.balanceOf.call(tester);

        const afterBalanceMe = await AuroxToken.balanceOf.call(me);

        assert.equal(
            Math.round(web3.utils.fromWei(afterBalanceTester)),
            769,
            "The rewards gained for the first user after this epoch should be about 700 (50% of 1400) + 10% of 700 (bonus) = 770"
        );

        assert.equal(
            Math.round(web3.utils.fromWei(afterBalanceMe)),
            769,
            "The rewards gained for the second user after this epoch should be about 700 (50% of 1400) + 10% of 700 (bonus) = 770"
        );
    });

    it("Tests that now when an additional user adds an amount to the middle of the epoch, the rewards are again allocated correctly", async () => {
        await fastForward(secondsInFortnight / 2);

        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()), {
            from: jeff,
        });

        await fastForward(secondsInFortnight / 2);

        await Provider.claimRewards(false, 12);
        await Provider.claimRewards(false, 12, { from: tester });
        await Provider.claimRewards(false, 12, { from: jeff });

        const afterBalanceTester = await AuroxToken.balanceOf.call(tester);

        const afterBalanceMe = await AuroxToken.balanceOf.call(me);

        const afterBalanceJeff = await AuroxToken.balanceOf.call(jeff);

        assert.equal(
            Math.round(web3.utils.fromWei(afterBalanceTester)),
            624,
            "The rewards gained for the first user after this epoch should be about 520 (40% of 1300) + 20% of 520 (bonus) = 620"
        );

        assert.equal(
            Math.round(web3.utils.fromWei(afterBalanceMe)),
            624,
            "The rewards gained for the second user after this epoch should be about 520 (40% of 1300) + 20% of 520 (bonus) = 620"
        );

        assert.equal(
            Math.round(web3.utils.fromWei(afterBalanceJeff)),
            129,
            "The rewards gained for the third user after this epoch should be about 20% of 1300 = 260 / 50% = 130"
        );
    });
});
