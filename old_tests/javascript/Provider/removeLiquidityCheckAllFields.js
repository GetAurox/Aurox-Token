const ProviderContract = artifacts.require("./contracts/Provider/Provider.sol");
const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);

const fastForward = require("../helpers/fastForward");

const ERC20Contract = artifacts.require(
    "./contracts/TestHelpers/ERC20Mintable.sol"
);

contract("Provider - Removing Liquidity", async (accounts) => {
    // const _amount = 1000;
    let testMoney = 1000000;

    const secondsInFortnight = 1209600;
    const me = accounts[0];
    const steve = accounts[1];
    const jeff = accounts[2];
    const robot = accounts[3];
    const walle = accounts[4];
    const ironMan = accounts[5];
    const gale = accounts[6];
    const burn = accounts[9];

    let Provider;

    let AuroxToken;
    let UniSwapToken;

    async function addLiquidity(user, _amount) {
        //   Increase allowances
        await UniSwapToken.increaseAllowance(
            Provider.address,
            web3.utils.toWei(_amount.toString()),
            { from: user }
        );
        await UniSwapToken.mint(user, web3.utils.toWei(_amount.toString()));

        //   add the liquidity
        await Provider.addLiquidity(web3.utils.toWei(_amount.toString()), {
            from: user,
        });
    }

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

    beforeEach(async () => {
        // const currentEpoch = await Provider.returnCurrentEpoch();
        // console.log(currentEpoch.toString());
        // console.log("EEE");
        // const secondsToEpochEnd = await Provider._getSecondsToEpochEnd(
        //   currentEpoch
        // );
        // console.log(secondsToEpochEnd.toString());
        // console.log("TTTT");
        // await fastForward(secondsToEpochEnd.toString());
        // console.log("AFTER");
        // Reset balances
        // await Promise.all(
        //   users.map(async (user) => {
        //     const balance = await AuroxToken.balanceOf.call(user);
        //     AuroxToken.transfer(burn, balance, { from: user });
        //   })
        // );
    });

    it("Tests that when pulling liquidity in the middle of an epoch, the values are set correctly", async () => {
        const _amount = 1000;
        await addLiquidity(me, _amount);
        await fastForward(secondsInFortnight / 2);

        await Provider.removeLiquidity(web3.utils.toWei(_amount.toString()));

        const epochTotals = await Provider.returnUsersEpochTotals(1, me);

        const { shareTotal, currentInvestmentTotal, allPrevInvestmentTotals } =
            epochTotals;

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

        assert.equal(
            web3.utils.fromWei(allPrevInvestmentTotals),
            0,
            "The allPrevInvestmentTotals epoch total should be removed"
        );

        const overallEpochTotals = await Provider.epochAmounts(1);
        const {
            shareTotal: overallShareTotal,
            currentInvestmentTotal: overallCurrentInvestmentTotal,
            allPrevInvestmentTotals: overallAllPrevInvestmentTotals,
        } = overallEpochTotals;

        assert.equal(
            Math.round(web3.utils.fromWei(overallShareTotal)),
            500,
            "The balance of the share amount should be deducted so they only get rewards up until the share was removed"
        );
        assert.equal(
            web3.utils.fromWei(overallCurrentInvestmentTotal),
            0,
            "The current epoch total should be removed"
        );
        assert.equal(
            web3.utils.fromWei(overallAllPrevInvestmentTotals),
            0,
            "The overall epoch total should be removed"
        );

        await fastForward(secondsInFortnight / 2);
    });

    it("Tests that all fields are set correctly when removing liquidity from a previous epoch", async () => {
        const _amount = 1000;
        const currentEpoch = await Provider.returnCurrentEpoch();

        assert.equal(currentEpoch, 2, "Should be epoch 2");
        const oldTotals = await Provider.returnUsersEpochTotals(
            currentEpoch,
            me
        );

        const { shareTotal: oldShareTotal } = oldTotals;

        assert.equal(
            oldShareTotal,
            0,
            "Should be in the next epoch, so no share total"
        );

        await addLiquidity(me, _amount);

        await fastForward(secondsInFortnight);

        const nextEpoch = await Provider.returnCurrentEpoch();

        assert.equal(nextEpoch, 3, "Should be in the next epoch now");

        // const claimSeconds = await Provider._returnClaimSecondsForPulledLiquidity(
        //   lastClaimedTimestamp,
        //   nextEpoch
        // );

        await Provider.removeLiquidity(web3.utils.toWei(_amount.toString()));

        const overallLastEpochUpdate = await Provider.lastEpochUpdate();

        assert.equal(
            overallLastEpochUpdate,
            3,
            "The last epoch update should be this epoch"
        );

        const { lastEpochUpdate } = await Provider.userInvestments(me);

        assert.equal(
            lastEpochUpdate,
            3,
            "The last epoch update for the user should be this epoch"
        );

        const epochTotals = await Provider.returnUsersEpochTotals(
            nextEpoch,
            me
        );

        const { shareTotal, currentInvestmentTotal, allPrevInvestmentTotals } =
            epochTotals;

        assert.equal(
            Math.round(web3.utils.fromWei(shareTotal)),
            8,
            "The balance of the share amount should be deducted so they only get rewards up until the share was removed"
        );

        assert.equal(
            Math.round(web3.utils.fromWei(currentInvestmentTotal)),
            0,
            "The balance of current investment total should be 0 because all funds were removed"
        );
        assert.equal(
            Math.round(web3.utils.fromWei(allPrevInvestmentTotals)),
            0,
            "The balance of the allPrevInvestmentTotals should be 0 because all funds were removed"
        );

        const balance = await UniSwapToken.balanceOf(me);
    });

    it("Tests that when adding liquidity to an epoch, skipping to the next adding more liquidity than the previous epoch and removing it all returns the correct values", async () => {
        const _amount = 1000;
        await addLiquidity(steve, _amount);

        const prevEpoch = await Provider.returnCurrentEpoch();

        await fastForward(secondsInFortnight);

        const _nextAmount = 2000;
        await addLiquidity(steve, _nextAmount);

        const totalAmount = _amount + _nextAmount;

        await Provider.removeLiquidity(
            web3.utils.toWei(totalAmount.toString()),
            {
                from: steve,
            }
        );

        const currentEpoch = await Provider.returnCurrentEpoch();

        assert.isTrue(prevEpoch < currentEpoch, "Should be the next epoch");

        const { lastEpochUpdate } = await Provider.userInvestments(steve);

        assert.equal(
            lastEpochUpdate.toString(),
            currentEpoch.toString(),
            "The last epoch update should be this epoch"
        );

        const epochTotals = await Provider.returnUsersEpochTotals(
            currentEpoch,
            steve
        );

        const { shareTotal, currentInvestmentTotal, allPrevInvestmentTotals } =
            epochTotals;

        assert.equal(
            Math.round(web3.utils.fromWei(shareTotal)),
            25,
            "Share total after all pulled liquidity should be 0"
        );

        assert.equal(
            currentInvestmentTotal,
            0,
            "Current total should be zero after pulled liquidity"
        );

        assert.equal(
            allPrevInvestmentTotals,
            0,
            "All Prev investment total should be zero after pulled liquidity"
        );

        const overallLastEpochUpdate = await Provider.lastEpochUpdate();

        assert.equal(
            overallLastEpochUpdate.toString(),
            currentEpoch.toString(),
            "The overall last epoch update should be this epoch"
        );

        const overallEpochTotals = await Provider.epochAmounts(currentEpoch);
        const {
            shareTotal: overallShareTotal,
            currentInvestmentTotal: overallCurrentInvestmentTotal,
            allPrevInvestmentTotals: overallAllPrevInvestmentTotals,
        } = overallEpochTotals;

        assert.equal(
            Math.round(web3.utils.fromWei(overallShareTotal)),
            25,
            "The balance of the share amount should be deducted so they only get rewards up until the share was removed"
        );
        assert.equal(
            web3.utils.fromWei(overallAllPrevInvestmentTotals),
            0,
            "The overall epoch total should be removed"
        );
        assert.equal(
            web3.utils.fromWei(overallCurrentInvestmentTotal),
            0,
            "The current epoch total should be removed"
        );

        const balance = await UniSwapToken.balanceOf(steve);

        assert.equal(
            web3.utils.fromWei(balance),
            totalAmount,
            "Balance of the user should be the original amount"
        );

        const providerBalance = await UniSwapToken.balanceOf(Provider.address);

        assert.equal(
            web3.utils.fromWei(providerBalance),
            0,
            "Balance of the provider should be 0"
        );
        // Skip to next epoch
        await fastForward(secondsInFortnight);
    });

    it("Tests that when adding liquidity to an epoch, then fast forwarding, then adding liquidity again then withdrawing only half the liquidity sets the correct values", async () => {
        const _amount = 1000;
        await addLiquidity(jeff, _amount);

        await fastForward(secondsInFortnight);

        const _nextAmount = 2000;
        await addLiquidity(jeff, _nextAmount);

        const totalAmount = _amount + _nextAmount;

        await Provider.removeLiquidity(web3.utils.toWei(_amount.toString()), {
            from: jeff,
        });

        const currentEpoch = await Provider.returnCurrentEpoch();

        const epochTotals = await Provider.returnUsersEpochTotals(
            currentEpoch,
            jeff
        );

        const { shareTotal, currentInvestmentTotal, allPrevInvestmentTotals } =
            epochTotals;

        assert.equal(
            Math.round(web3.utils.fromWei(shareTotal)),
            8,
            "Share total after all pulled liquidity should be 0"
        );

        assert.equal(
            Math.round(web3.utils.fromWei(currentInvestmentTotal)),
            _nextAmount,
            "Current total should whats left after the withdraw"
        );

        assert.equal(
            allPrevInvestmentTotals,
            0,
            "All Prev investment total should be zero after pulled liquidity"
        );
        const overallEpochTotals = await Provider.epochAmounts(currentEpoch);
        const {
            shareTotal: overallShareTotal,
            currentInvestmentTotal: overallCurrentInvestmentTotal,
            allPrevInvestmentTotals: overallAllPrevInvestmentTotals,
        } = overallEpochTotals;

        assert.equal(
            Math.round(web3.utils.fromWei(overallShareTotal)),
            8,
            "The balance of the share amount should be deducted so they only get rewards up until the share was removed"
        );
        assert.equal(
            web3.utils.fromWei(overallAllPrevInvestmentTotals),
            0,
            "The overall epoch total should be removed"
        );
        assert.equal(
            web3.utils.fromWei(overallCurrentInvestmentTotal),
            _nextAmount,
            "The current epoch total should be removed"
        );

        const balance = await UniSwapToken.balanceOf(jeff);

        assert.equal(
            web3.utils.fromWei(balance),
            _amount,
            "Balance of the user should be the original amount"
        );

        const providerBalance = await UniSwapToken.balanceOf(Provider.address);

        assert.equal(
            web3.utils.fromWei(providerBalance),
            _nextAmount,
            "Balance of the provider should be 0"
        );
        // Remove all the remaining liquidity
        await Provider.removeLiquidity(
            web3.utils.toWei(_nextAmount.toString()),
            {
                from: jeff,
            }
        );
        // Skip to next epoch
        await fastForward(secondsInFortnight);
    });

    it("Tests that when adding liquidity to an epoch, fast forwarding to the next epoch and half way into that epoch, then withdrawing all liquidity the correct values are set", async () => {
        const _amount = 1000;
        await addLiquidity(robot, _amount);
        await fastForward(secondsInFortnight + secondsInFortnight / 2);

        await Provider.removeLiquidity(web3.utils.toWei(_amount.toString()), {
            from: robot,
        });

        const currentEpoch = await Provider.returnCurrentEpoch();

        const epochTotals = await Provider.returnUsersEpochTotals(
            currentEpoch,
            robot
        );

        const { shareTotal, currentInvestmentTotal, allPrevInvestmentTotals } =
            epochTotals;

        assert.equal(
            Math.round(web3.utils.fromWei(shareTotal)),
            508,
            "Share total after all pulled liquidity should be 0"
        );

        assert.equal(
            Math.round(web3.utils.fromWei(currentInvestmentTotal)),
            0,
            "Current total should whats left after the withdraw"
        );

        assert.equal(
            allPrevInvestmentTotals,
            0,
            "All Prev investment total should be zero after pulled liquidity"
        );

        const overallEpochTotals = await Provider.epochAmounts(currentEpoch);
        const {
            shareTotal: overallShareTotal,
            currentInvestmentTotal: overallCurrentInvestmentTotal,
            allPrevInvestmentTotals: overallAllPrevInvestmentTotals,
        } = overallEpochTotals;

        assert.equal(
            Math.round(web3.utils.fromWei(overallShareTotal)),
            508,
            "The balance of the share amount should be deducted so they only get rewards up until the share was removed"
        );
        assert.equal(
            web3.utils.fromWei(overallAllPrevInvestmentTotals),
            0,
            "The overall epoch total should be removed"
        );
        assert.equal(
            web3.utils.fromWei(overallCurrentInvestmentTotal),
            0,
            "The current epoch total should be removed"
        );

        const balance = await UniSwapToken.balanceOf(robot);

        assert.equal(
            web3.utils.fromWei(balance),
            900,
            "Balance of the user should be 90% because funds were withdrawn in the middle of the epoch"
        );

        const burnBalance = await UniSwapToken.balanceOf(
            "0x0000000000000000000000000000000000000001"
        );

        assert.equal(
            web3.utils.fromWei(burnBalance),
            200,
            "Balance of the burn funds should be 100 from above + 100 from the other test"
        );

        const providerBalance = await UniSwapToken.balanceOf(Provider.address);

        assert.equal(
            web3.utils.fromWei(providerBalance),
            0,
            "Balance of the provider should be 0"
        );
        // Fast forward to the end
        await fastForward(secondsInFortnight + secondsInFortnight / 2);
    });

    it("Tests that when adding liquidity, then fast forwarding 100 epochs then withdrawing liquidity the correct values are set", async () => {
        const _amount = 1000;
        await addLiquidity(walle, _amount);
        await fastForward(secondsInFortnight * 100);
        await Provider.removeLiquidity(web3.utils.toWei(_amount.toString()), {
            from: walle,
        });
        const currentEpoch = await Provider.returnCurrentEpoch();
        const epochTotals = await Provider.returnUsersEpochTotals(
            currentEpoch,
            walle
        );
        const { shareTotal, currentInvestmentTotal, allPrevInvestmentTotals } =
            epochTotals;
        assert.equal(
            Math.round(web3.utils.fromWei(shareTotal)),
            8,
            "Share total after all pulled liquidity should be 0"
        );
        assert.equal(
            Math.round(web3.utils.fromWei(currentInvestmentTotal)),
            0,
            "Current total should whats left after the withdraw"
        );
        assert.equal(
            allPrevInvestmentTotals,
            0,
            "All Prev investment total should be zero after pulled liquidity"
        );
        const overallEpochTotals = await Provider.epochAmounts(currentEpoch);
        const {
            shareTotal: overallShareTotal,
            currentInvestmentTotal: overallCurrentInvestmentTotal,
            allPrevInvestmentTotals: overallAllPrevInvestmentTotals,
        } = overallEpochTotals;
        assert.equal(
            Math.round(web3.utils.fromWei(overallShareTotal)),
            8,
            "The balance of the share amount should be deducted so they only get rewards up until the share was removed"
        );
        assert.equal(
            web3.utils.fromWei(overallAllPrevInvestmentTotals),
            0,
            "The overall epoch total should be removed"
        );
        assert.equal(
            web3.utils.fromWei(overallCurrentInvestmentTotal),
            0,
            "The current epoch total should be removed"
        );
        const balance = await UniSwapToken.balanceOf(walle);
        assert.equal(
            web3.utils.fromWei(balance),
            _amount,
            "Balance of the user should be 90% because funds were withdrawn in the middle of the epoch"
        );
        const burnBalance = await UniSwapToken.balanceOf(
            "0x0000000000000000000000000000000000000001"
        );
        assert.equal(
            web3.utils.fromWei(burnBalance),
            200,
            "Balance of the burn funds should be 100 from above + 100 from the other test"
        );
        const providerBalance = await UniSwapToken.balanceOf(Provider.address);
        assert.equal(
            web3.utils.fromWei(providerBalance),
            0,
            "Balance of the provider should be 0"
        );
    });

    it("Tests that when adding liquidity to an epoch, then fast forwarding, then adding liquidity again, then fast forwarding half way through the epoch and withdrawing less than the newly invested amount. The correct values are set", async () => {
        const _amount = 2000;
        await addLiquidity(ironMan, _amount);

        await fastForward(secondsInFortnight);

        const _nextAmount = 2000;
        await addLiquidity(ironMan, _nextAmount);

        await fastForward(secondsInFortnight / 2);

        await Provider.removeLiquidity(web3.utils.toWei("1500"), {
            from: ironMan,
        });

        const currentEpoch = await Provider.returnCurrentEpoch();

        const epochTotals = await Provider.returnUsersEpochTotals(
            currentEpoch,
            ironMan
        );

        const { shareTotal, currentInvestmentTotal, allPrevInvestmentTotals } =
            epochTotals;

        assert.equal(
            Math.round(web3.utils.fromWei(shareTotal)),
            762,
            "Share total after all pulled liquidity should be 0"
        );
        assert.equal(
            Math.round(web3.utils.fromWei(currentInvestmentTotal)),
            2000,
            "Current total should whats left after the withdraw"
        );
        assert.equal(
            Math.round(web3.utils.fromWei(allPrevInvestmentTotals)),
            500,
            "All Prev investment total should be zero after pulled liquidity"
        );
        const overallEpochTotals = await Provider.epochAmounts(currentEpoch);

        const {
            shareTotal: overallShareTotal,
            currentInvestmentTotal: overallCurrentInvestmentTotal,
            allPrevInvestmentTotals: overallAllPrevInvestmentTotals,
        } = overallEpochTotals;
        assert.equal(
            Math.round(web3.utils.fromWei(overallShareTotal)),
            762,
            "The balance of the share amount should be deducted so they only get rewards up until the share was removed"
        );
        assert.equal(
            web3.utils.fromWei(overallCurrentInvestmentTotal),
            2000,
            "The current epoch total should be removed"
        );
        assert.equal(
            web3.utils.fromWei(overallAllPrevInvestmentTotals),
            500,
            "The overall epoch total should be removed"
        );

        const balance = await UniSwapToken.balanceOf(ironMan);
        assert.equal(
            web3.utils.fromWei(balance),
            1350,
            "Balance of the user should be 90% because funds were withdrawn in the middle of the epoch"
        );
        const burnBalance = await UniSwapToken.balanceOf(
            "0x0000000000000000000000000000000000000001"
        );
        assert.equal(
            web3.utils.fromWei(burnBalance),
            350,
            "Balance of the burn funds should be 100 from above + 100 from the other test"
        );
        const providerBalance = await UniSwapToken.balanceOf(Provider.address);
        assert.equal(
            web3.utils.fromWei(providerBalance),
            2500,
            "Balance of the provider should be 0"
        );
        await fastForward(secondsInFortnight / 2);
    });

    it("Tests when withdrawing liquidity multiple times within one epoch", async () => {
        const _amount = 2000;
        await addLiquidity(gale, _amount);

        await fastForward(secondsInFortnight);

        await Provider.removeLiquidity(web3.utils.toWei("250"), {
            from: gale,
        });

        await fastForward(secondsInFortnight / 4);

        await Provider.removeLiquidity(web3.utils.toWei("250"), {
            from: gale,
        });

        await fastForward(secondsInFortnight / 4);

        const currentEpoch = await Provider.returnCurrentEpoch();

        const epochTotals = await Provider.returnUsersEpochTotals(
            currentEpoch,
            gale
        );

        const { shareTotal, currentInvestmentTotal, allPrevInvestmentTotals } =
            epochTotals;

        assert.equal(
            Math.round(web3.utils.fromWei(shareTotal)),
            65,
            "Share total after all pulled liquidity should be 65, because its the amount of pulled liquity that was in the provider for $250 / 4 ~$65"
        );
        assert.equal(
            Math.round(web3.utils.fromWei(currentInvestmentTotal)),
            0,
            "Share total after all pulled liquidity should be 0"
        );
        assert.equal(
            Math.round(web3.utils.fromWei(allPrevInvestmentTotals)),
            1500,
            "Share total after all pulled liquidity should be 0"
        );

        await fastForward(secondsInFortnight / 4);

        await Provider.removeLiquidity(web3.utils.toWei("500"), {
            from: gale,
        });

        const newEpochTotals = await Provider.returnUsersEpochTotals(
            currentEpoch,
            gale
        );

        const {
            shareTotal: newShareTotal,
            currentInvestmentTotal: newCurrentInvestmentTotal,
            allPrevInvestmentTotals: newAllPrevInvestmentTotal,
        } = newEpochTotals;

        assert.equal(
            Math.round(web3.utils.fromWei(newShareTotal)),
            379,
            "Share total after all pulled liquidity should be 379, because its the amount of pulled liquity that was in the provider for $500 * 0.75 (since last claimed)"
        );
        assert.equal(
            Math.round(web3.utils.fromWei(newCurrentInvestmentTotal)),
            0,
            "Share total after all pulled liquidity should be 0"
        );
        assert.equal(
            Math.round(web3.utils.fromWei(newAllPrevInvestmentTotal)),
            1000,
            "Share total after all pulled liquidity should be 0"
        );
    });
});
