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

contract("Provider - Claiming rewards adding liquidity", async (accounts) => {
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
    });

    const addLiquidityForAll = async (items) => {
        if (items.length) {
            const user = items[0];

            //   Increase allowances
            await UniSwapToken.increaseAllowance(
                Provider.address,
                web3.utils.toWei(testMoney.toString()),
                { from: user }
            );
            await UniSwapToken.mint(user, web3.utils.toWei(_amount.toString()));

            //   add the liquidity
            await Provider.addLiquidity(web3.utils.toWei(_amount.toString()), {
                from: user,
            });

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

    it("Tests that adding liquidity, then claiming rewards on that liquidity, followed by adding liquidity again returns the correct rewards", async () => {
        await addLiquidityForAll(users);

        await fastForward(secondsInFortnight / 2);
        await claimAllRewards();

        // 50% of epoch duration, 750 / 3
        const expectedAmount = 250;

        await Promise.all(
            users.map(async (user, idx) => {
                const balance = await AuroxToken.balanceOf.call(user);
                assert.equal(
                    Math.round(web3.utils.fromWei(balance)),
                    expectedAmount,
                    `All users should have the same reward amount at the middle of the epoch`
                );
            })
        );
        // Add liquidity again for all users
        await addLiquidityForAll(users);
        await fastForward(secondsInFortnight / 2);

        await claimAllRewards();

        // Expected amount should be above amount * 2
        await Promise.all(
            users.map(async (user, idx) => {
                const balance = await AuroxToken.balanceOf.call(user);
                assert.equal(
                    Math.round(web3.utils.fromWei(balance)),
                    500,
                    `All users should have the same reward amount at  the end of the epoch`
                );
            })
        );
    });

    it("Tests that claiming multiple times and adding liquidity multiple times, results in the correct final balance", async () => {
        await addLiquidityForAll(users);
        await fastForward(secondsInFortnight / 4);

        await addLiquidityForAll(users);
        await fastForward(secondsInFortnight / 4);

        await addLiquidityForAll(users);
        await fastForward(secondsInFortnight / 4);

        await addLiquidityForAll(users);
        await fastForward(secondsInFortnight / 4);

        await claimAllRewards();
        const expectedAmount = 513;
        await Promise.all(
            users.map(async (user, idx) => {
                const balance = await AuroxToken.balanceOf.call(user);
                assert.equal(
                    Math.round(web3.utils.fromWei(balance)),
                    expectedAmount,
                    `All users should have the same reward amount at the middle of the epoch`
                );
            })
        );
    });

    it("Tests that claiming multiple times over large epoch gaps and adding liquidity over large gaps returns the correct values", async () => {
        await addLiquidityForAll(users);
        await fastForward(secondsInFortnight);

        await addLiquidityForAll(users);
        await fastForward(secondsInFortnight * 2);

        await addLiquidityForAll(users);
        await fastForward(secondsInFortnight * 3);

        await addLiquidityForAll(users);
        await fastForward(secondsInFortnight * 4);

        await claimAllRewards();
        // 1300 + 1200 + 1100+ 1000+ 900+800+700+600+600+600
        // = 8800 / 3 = 2933
        const expectedAmount = 4584;
        await Promise.all(
            users.map(async (user, idx) => {
                const balance = await AuroxToken.balanceOf.call(user);
                assert.equal(
                    Math.round(web3.utils.fromWei(balance)),
                    expectedAmount,
                    `All users should have the same reward amount at the middle of the epoch`
                );
            })
        );
    });
});
