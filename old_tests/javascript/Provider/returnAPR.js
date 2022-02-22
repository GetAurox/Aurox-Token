const ProviderContract = artifacts.require("./contracts/Provider/Provider.sol");

const AuroxTokenContract = artifacts.require(
    "./contracts/Token/AuroxToken.sol"
);

const fastForward = require("../helpers/fastForward");

const ERC20Contract = artifacts.require(
    "./contracts/TestHelpers/ERC20Mintable.sol"
);

contract("Provider - Return User's APR", async (accounts) => {
    let Provider;
    let AuroxToken;
    let UniSwapToken;

    const me = accounts[0];
    const guy = accounts[1];
    const ironman = accounts[2];
    const pizza = accounts[3];
    const secondsInFortnight = 1209600;

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
    });

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

    async function removeLiquidity(user, _amount) {
        await Provider.removeLiquidity(web3.utils.toWei(_amount.toString()), {
            from: user,
        });
    }

    it("Tests that when one user has added liquidity they get the correct APR", async () => {
        await addLiquidity(me, 10);
        const apr = await Provider.returnCurrentAPY();
        // console.log(web3.utils.fromWei(apr));
        assert.equal(
            web3.utils.fromWei(apr),
            2010,
            "Because the user invested 1 their APR is simply the total rewards"
        );
    });

    it("Tests that when another user adds liquidity the APR adjusts, and when the user removes liquidity the APR is updated", async () => {
        await addLiquidity(guy, 10);
        let guysAPR = await Provider.returnCurrentAPY({ from: guy });

        assert.equal(
            web3.utils.fromWei(guysAPR),
            1005,
            "Because another user is invested with the same amount the APR should be halved"
        );
        let myAPR = await Provider.returnCurrentAPY();
        assert.equal(
            web3.utils.fromWei(myAPR),
            1005,
            "Because another user is invested with the same amount the APR should be halved"
        );

        await removeLiquidity(guy, 10);

        myAPR = await Provider.returnCurrentAPY();
        assert.equal(
            web3.utils.fromWei(myAPR),
            2010,
            "Because this is the only user invested"
        );
        await removeLiquidity(me, 10);
    });

    it("Tests that multiple users who have added liquidity at varying amounts have the correct APR", async () => {
        const users = [ironman, guy, pizza, me];
        const amounts = [100, 500, 2000, 100];
        await addLiquidity(ironman, 100);
        await addLiquidity(guy, 500);
        await addLiquidity(pizza, 2000);
        await addLiquidity(me, 100);
        await Promise.all(
            users.map(async (user) => {
                const apr = await Provider.returnCurrentAPY({ from: user });
                assert.equal(
                    web3.utils.fromWei(apr),
                    7.444444444444444444,
                    "The APR should be split accordingly"
                );
            })
        );
        await Promise.all(
            users.map(async (user, idx) => {
                await removeLiquidity(user, amounts[idx]);
            })
        );
    });

    it("Tests that when returning current APR after one epoch the correct value is returned", async () => {
        await addLiquidity(me, 1);
        await fastForward(secondsInFortnight * 2);
        const apr = await Provider.returnCurrentAPY();
        assert.equal(
            web3.utils.fromWei(apr),
            18400,
            "APR should be less as the eopoch is later"
        );
    });

    it("Tests that when returning current APR after a few epochs the correct value is returned", async () => {
        await fastForward(secondsInFortnight * 3);
        const apr = await Provider.returnCurrentAPY();
        assert.equal(
            web3.utils.fromWei(apr),
            16600,
            "APR should be less as the eopoch is later"
        );
    });

    it("Tests that when returning current APR after a few more epochs the correct value is returned", async () => {
        await fastForward(secondsInFortnight * 3);
        const apr = await Provider.returnCurrentAPY();
        assert.equal(
            web3.utils.fromWei(apr),
            15700,
            "APR should be less as the eopoch is later"
        );
    });

    it("Tests that when returning current APR after the first 10 epochs the correct value is returned", async () => {
        await fastForward(secondsInFortnight * 3);
        const apr = await Provider.returnCurrentAPY();
        assert.equal(
            web3.utils.fromWei(apr),
            15600,
            "APR should be less as the eopoch is later"
        );
    });

    it("Tests that when no users have liquidity in the pool the APR percent is still returned", async () => {
        await removeLiquidity(me, 1);
        const apr = await Provider.returnCurrentAPY();
        assert.equal(
            web3.utils.fromWei(apr),
            15600,
            "APR should be less as the eopoch is later"
        );
    });
});
