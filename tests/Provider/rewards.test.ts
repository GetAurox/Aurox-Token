import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Token } from "../../types/typechain/Token";
import { StakingMaster } from "../../types/typechain/StakingMaster";
import createAPI from "../helpers/createAPI";
import { StakingAPI } from "../helpers/api/StakingAPI/createStakingAPI";
import chaiAsPromised from "chai-as-promised";
import chai from "chai";
import { fastForward, parseFloatWithFormatEthers } from "../helpers/common";
import { TokenAPI } from "../helpers/api/TokenAPI/createTokenAPI";
import {
    assertionWithRange,
    assertionWithRangeAndFetchFunction,
    assertionWithRangeForBigNumber,
} from "../helpers/assertions";
import faker from "faker";
import { sumBy } from "lodash";
import { BigNumber, BigNumberish } from "ethers";
import { Provider } from "../../types/typechain/Provider";
import {
    ProviderAPI,
    UserAddedLiquidity,
} from "../helpers/api/ProviderAPI/createProviderAPI";

chai.use(chaiAsPromised);
const { expect } = chai;

faker.seed(1);

describe("Provider - bonuses - claiming rewards ", () => {
    let Users: SignerWithAddress[];

    let Token: Token;

    let StakingMaster: StakingMaster;

    let StakingAPI: StakingAPI;

    let TokenAPI: TokenAPI;

    let Provider: Provider;

    let ProviderAPI: ProviderAPI;

    beforeEach(async () => {
        Users = await ethers.getSigners();

        ({
            StakingMaster: { StakingAPI, StakingMaster },
            Token: { Token, TokenAPI },
            Provider: { Provider, ProviderAPI },
        } = await createAPI(Users[0], true));

        await TokenAPI.resetBalance();
    });

    it("tests that claiming rewards for a few epochs is calculated correctly", async () => {
        await ProviderAPI.addLiquidity(1000);

        await ProviderAPI.skipEpoch(5);

        await ProviderAPI.claimRewards();

        const balance = await TokenAPI.myBalance();

        // 1500 + 0%, 1400 + 10%, 1300 + 20%, 1200 + 30%, 1100 + 40%
        // 1500 + 1540 + 1560 + 1560 + 1540
        assertionWithRange(
            1500 + 1540 + 1560 + 1560 + 1540,
            parseFloatWithFormatEthers(balance)
        );
    });

    it("tests that fast forwarding a few epochs and then adding liquidity, that no rewards are generated for those previous epochs", async () => {
        await ProviderAPI.skipEpoch(5);

        await ProviderAPI.addLiquidity(1000);

        await ProviderAPI.skipEpoch(5);

        await ProviderAPI.claimRewards();

        const balance = await TokenAPI.myBalance();

        // 1000 + 0%, 900 + 10%, 800 + 20%, 700 + 30%, 600 + 40%
        assertionWithRange(
            1000 + 990 + 960 + 910 + 840,
            parseFloatWithFormatEthers(balance)
        );
    });

    it("tests that adding liquidity for a couple epochs, then removing it and having no liquidity for a few epochs, then finally adding liquidity back in, no rewards were generated whilst no liquidity was added", async () => {
        await ProviderAPI.addLiquidity(1000);

        await ProviderAPI.skipEpoch(2);

        await Provider.removeLiquidity(1000);

        console.log("-----Claiming new rewards------");

        await ProviderAPI.claimRewards();

        await TokenAPI.resetBalance();

        await ProviderAPI.addLiquidity(1000);

        await ProviderAPI.skipEpoch(4);

        console.log("-----Claiming new rewards------");

        await ProviderAPI.claimRewards();

        let myBalance = await TokenAPI.myBalance();

        // 1300 + 0%, 1200 + 10%, 1100 + 20%, 1000 + 30%, 900 + 40%
        assertionWithRange(
            1300 + 1320 + 1320 + 1300,
            parseFloatWithFormatEthers(myBalance)
        );
    });

    it("tests that when a user has liquidity, then removes half of it after a couple epochs, then claims rewards in a few epochs time, they have the correct bonus assigned", async () => {
        await ProviderAPI.addLiquidity(1000);

        await ProviderAPI.skipEpoch(2);

        await Provider.removeLiquidity(500);

        console.log("-----Claiming new rewards------");

        await ProviderAPI.claimRewards();

        await TokenAPI.resetBalance();

        await ProviderAPI.addLiquidity(500);

        await ProviderAPI.skipEpoch(4);

        console.log("-----Claiming new rewards------");

        await ProviderAPI.claimRewards();

        let myBalance = await TokenAPI.myBalance();

        // 1300 + 0%, 1200 + 10%, 1100 + 20%, 1000 + 30%
        assertionWithRange(
            1300 + 1320 + 1320 + 1300,
            parseFloatWithFormatEthers(myBalance)
        );

        await TokenAPI.resetBalance();

        await ProviderAPI.skipEpoch(2);

        console.log("-----Claiming new rewards------");

        await ProviderAPI.claimRewards();

        myBalance = await TokenAPI.myBalance();

        // 900 + 40%, 800 + 50%
        assertionWithRange(1260 + 1200, parseFloatWithFormatEthers(myBalance));
    });

    it("tests that when the epoch completes there is a spike in rewards claimable equal to the bonus amount", async () => {
        const secondsToCurrentEpochEnd = async () => {
            const currentEpoch = await Provider.returnCurrentEpoch();
            return Provider._getSecondsToEpochEnd(currentEpoch);
        };

        await ProviderAPI.addLiquidity(1000);

        // Fast forward 5 epochs so that we can expect a 50% bonus
        await ProviderAPI.skipEpoch(5);

        const secondsToEpochEnd = await secondsToCurrentEpochEnd();

        // Fast forward just to the end of the epoch
        await fastForward(secondsToEpochEnd.toNumber() - 1000);

        const { rewardTotal: beforeClaimableRewards } =
            await Provider.returnAllClaimableRewardAmounts(Users[0].address);

        const currentEpoch = await Provider.returnCurrentEpoch();

        const rewardForEpoch = await Provider.returnTotalRewardForEpoch(
            currentEpoch
        );

        // Fast forward to the next epoch
        await fastForward(1000);

        const { rewardTotal: afterClaimbleRewards } =
            await Provider.returnAllClaimableRewardAmounts(Users[0].address);

        // Expect that the increase in rewards is equal to 50% of the epoch rewards for that epoch
        assertionWithRangeForBigNumber(
            afterClaimbleRewards.sub(beforeClaimableRewards),
            rewardForEpoch.div(2),
            0.01
        );
    });

    it("tests that the total rewards never exceeds 100%", async () => {
        await ProviderAPI.addLiquidity(1000);

        await ProviderAPI.skipEpoch(20);

        await ProviderAPI.claimRewards();

        const myBalance = await TokenAPI.myBalance();

        assertionWithRange(26400, parseFloatWithFormatEthers(myBalance));
    });
});
