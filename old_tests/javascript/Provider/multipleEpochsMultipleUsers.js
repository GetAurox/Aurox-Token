const ProviderContract = artifacts.require("./contracts/Provider/Provider.sol");
const StakingMasterContract = artifacts.require(
    "./contracts/StakingMaster/StakingMaster.sol"
);

const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);

const {
    isCallTrace,
} = require("hardhat/internal/hardhat-network/stack-traces/message-trace");
const fastForward = require("../helpers/fastForward");

const ERC20Contract = artifacts.require(
    "./contracts/TestHelpers/ERC20Mintable.sol"
);

contract("Provider - Multiple Epochs Multiple Users", async (accounts) => {
    const me = accounts[0];
    const tester = accounts[1];
    const jeff = accounts[2];
    const users = [me, tester, jeff];

    const burn = accounts[9];

    const _amount = 1000;
    let testMoney = 1000;
    const secondsInFortnight = 1209600;

    let Provider;

    let AuroxToken;
    let UniSwapToken;

    before(async () => {
        UniSwapToken = await ERC20Contract.new();

        AuroxToken = await AuroxTokenContract.new(
            "0x82C01fEac95776e099530a81fEdE18265229319a",
            "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
            "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
        );

        const epochStart = Math.round(new Date().getTime() / 1000) - 10000;
        Provider = await ProviderContract.new(
            UniSwapToken.address,
            AuroxToken.address,
            accounts[0],
            epochStart,
            UniSwapToken.address
        );
        await AuroxToken.setAllowance(Provider.address);
        await AuroxToken.setAllowance(me);

        await Promise.all(
            users.map(async (user) => {
                await UniSwapToken.increaseAllowance(
                    Provider.address,
                    web3.utils.toWei(testMoney.toString()),
                    { from: user }
                );
                UniSwapToken.mint(user, web3.utils.toWei(_amount.toString()));
            })
        );
    });

    const addLiquidityForAll = async (items) => {
        if (items.length) {
            //   console.log(items.shift());
            const user = items[0];
            await Provider.addLiquidity(web3.utils.toWei(_amount.toString()), {
                from: user,
            });
            await fastForward(Math.round(secondsInFortnight / users.length));

            //   Remove first item from array
            //   items.shift();
            await addLiquidityForAll(items.slice(1));
        } else {
            return;
        }
    };

    const claimAllRewards = async () => {
        await Promise.all(
            users.map(async (user) => {
                await Provider.claimRewards(false, 12, { from: user });
            })
        );
    };

    beforeEach(async () => {
        // Reset balances
        await Promise.all(
            users.map(async (user) => {
                const balance = await AuroxToken.balanceOf.call(user);
                AuroxToken.transfer(burn, balance, { from: user });
            })
        );
    });

    it("Tests that three user's adding liquidity at varying times receive the correct rewards", async () => {
        let epoch = await Provider.returnCurrentEpoch.call();

        assert.equal(epoch.toString(), 1, "Should be in epoch 1 now");
        await addLiquidityForAll(users);

        // await fastForward(10000);

        epoch = await Provider.returnCurrentEpoch.call();

        assert.equal(epoch.toString(), 2, "Should be in epoch 2 now");

        await claimAllRewards();

        // User 1: 750 + 10% = 825
        // User 2: 333 + 10% = 366
        // User 3: 83 + 10% = 93
        const expectedResults = [751, 333, 84];

        await Promise.all(
            users.map(async (user, idx) => {
                const balance = await AuroxToken.balanceOf.call(user);
                assert.equal(
                    Math.round(web3.utils.fromWei(balance)),
                    expectedResults[idx],
                    `${user} should have ${
                        expectedResults[idx]
                    } as they added ${
                        1 / idx
                    } through the duration of the epoch`
                );
            })
        );
    });

    it("Tests that three user's who added rewards receive the same rewards at the end of the next epoch", async () => {
        const epoch = await Provider.returnCurrentEpoch.call();

        assert.equal(epoch.toString(), 2, "Should be in epoch 2 now");
        await fastForward(secondsInFortnight);

        await claimAllRewards();

        // 1400 / 3 = 466 + 10% = 513
        const expectedAmount = 513;

        const meBalance = await AuroxToken.balanceOf.call(me);
        assert.equal(
            Math.round(web3.utils.fromWei(meBalance)),
            expectedAmount,
            `Me should have a third of the rewards + 20% bonus for the epoch`
        );

        const testerBalance = await AuroxToken.balanceOf.call(tester);
        assert.equal(
            Math.round(web3.utils.fromWei(testerBalance)),
            expectedAmount,
            `Tester should have a third of the rewards + 20% bonus for the epoch`
        );

        const jeffBalance = await AuroxToken.balanceOf.call(jeff);
        assert.equal(
            Math.round(web3.utils.fromWei(jeffBalance)),
            expectedAmount,
            `Jeff should have a third of the rewards + 20% bonus for the epoch`
        );
    });

    it("Tests that three user's who added rewards receive the the correct rewards after 3 epochs", async () => {
        await fastForward(secondsInFortnight * 3);
        const epoch = await Provider.returnCurrentEpoch.call();
        assert.equal(epoch.toString(), 6, "Should be in epoch 6 now");

        await claimAllRewards();

        // 1300 / 3 + 20% + 1200 / 3 + 30% + 1100 / 3 + 40% =
        // 519 + 520 + 512
        const expectedAmount = 1552;

        const meBalance = await AuroxToken.balanceOf.call(me);
        assert.equal(
            Math.round(web3.utils.fromWei(meBalance)),
            expectedAmount,
            `Me should have a third of the rewards + 20% bonus for the epoch`
        );

        const testerBalance = await AuroxToken.balanceOf.call(tester);
        assert.equal(
            Math.round(web3.utils.fromWei(testerBalance)),
            expectedAmount,
            `Tester should have a third of the rewards + 20% bonus for the epoch`
        );

        const jeffBalance = await AuroxToken.balanceOf.call(jeff);
        assert.equal(
            Math.round(web3.utils.fromWei(jeffBalance)),
            expectedAmount,
            `Jeff should have a third of the rewards + 20% bonus for the epoch`
        );
    });

    it("Tests that three user's who have added liquidity, get the correct rewards after 10 epochs", async () => {
        await fastForward(secondsInFortnight * 10);
        const epoch = await Provider.returnCurrentEpoch.call();
        assert.equal(epoch.toString(), 16, "Should be in epoch 16 now");

        await claimAllRewards();

        // 7000 Total + 1000 + 900 + 800 + 700 + 6 * 600 (all epoch reward totals)
        // 7000 / 3 = 2333.333 + 100% = 4666
        const expectedAmount = 4231;

        const meBalance = await AuroxToken.balanceOf.call(me);
        assert.equal(
            Math.round(web3.utils.fromWei(meBalance)),
            expectedAmount,
            `Me should have a third of the rewards + 20% bonus for the epoch`
        );

        const testerBalance = await AuroxToken.balanceOf.call(tester);
        assert.equal(
            Math.round(web3.utils.fromWei(testerBalance)),
            expectedAmount,
            `Tester should have a third of the rewards + 20% bonus for the epoch`
        );

        const jeffBalance = await AuroxToken.balanceOf.call(jeff);
        assert.equal(
            Math.round(web3.utils.fromWei(jeffBalance)),
            expectedAmount,
            `Jeff should have a third of the rewards + 20% bonus for the epoch`
        );
    });

    it("Tests that three user's who have added liquidity get the correct rewards after 100 epochs", async () => {
        await fastForward(secondsInFortnight * 100);
        const epoch = await Provider.returnCurrentEpoch.call();
        assert.equal(epoch.toString(), 116, "Should be in epoch 16 now");

        await claimAllRewards();

        // 600 * 100 = 60,000
        // 60,000 / 3 = 20,000 + 100% = 40,000
        const expectedAmount = 39998;

        const meBalance = await AuroxToken.balanceOf.call(me);
        assert.equal(
            Math.round(web3.utils.fromWei(meBalance)),
            expectedAmount,
            `Me should have a third of the rewards + 20% bonus for the epoch`
        );

        const testerBalance = await AuroxToken.balanceOf.call(tester);
        assert.equal(
            Math.round(web3.utils.fromWei(testerBalance)),
            expectedAmount,
            `Tester should have a third of the rewards + 20% bonus for the epoch`
        );

        const jeffBalance = await AuroxToken.balanceOf.call(jeff);
        assert.equal(
            Math.round(web3.utils.fromWei(jeffBalance)),
            expectedAmount,
            `Jeff should have a third of the rewards + 20% bonus for the epoch`
        );
    });
});
