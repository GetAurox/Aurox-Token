import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Token } from "../../types/typechain/Token";
import { StakingMaster } from "../../types/typechain/StakingMaster";
import createAPI from "../helpers/createAPI";
import {
    StakingAPI,
    StakingState,
} from "../helpers/api/StakingAPI/createStakingAPI";
import { SECONDS_PER_MONTH, VEST_DURATION } from "../helpers/constants";
import chaiAsPromised from "chai-as-promised";
import chai, { AssertionError } from "chai";
import {
    fastForward,
    returnCurrentHardhatTime,
    returnEntireVestAndStakeDuration,
    sequentialAsync,
} from "../helpers/common";
import forEach from "mocha-each";
import { TokenAPI } from "../helpers/api/TokenAPI/createTokenAPI";
import { assertionWithRangeAndFetchFunction } from "../helpers/assertions";
import { returnTestableStakingState } from "../helpers/api/StakingAPI/helpers";
import faker from "faker";
import { add, lte, sum } from "lodash";
import { BigNumber } from "ethers";
import { Provider } from "../../types/typechain/Provider";
import { ProviderAPI } from "../helpers/api/ProviderAPI/createProviderAPI";

chai.use(chaiAsPromised);
const { expect } = chai;

faker.seed(1);

describe("addToStake", () => {
    let User: SignerWithAddress;

    let Token: Token;

    let StakingMaster: StakingMaster;

    let StakingAPI: StakingAPI;

    let TokenAPI: TokenAPI;

    let Provider: Provider;

    let ProviderAPI: ProviderAPI;

    const amount = 100000000000;
    const duration = 12;

    before(async () => {
        [User] = await ethers.getSigners();

        ({
            StakingMaster: { StakingAPI, StakingMaster },
            Token: { Token, TokenAPI },
            Provider: { Provider, ProviderAPI },
        } = await createAPI(User, true, User.address));
    });

    it("create a stake store the rewards in it then the user should be returned the correct amount", async () => {
        await ProviderAPI.migrateUsersLPPositions([
            {
                _amount: BigNumber.from(amount),
                _user: User.address,
                _bonusRewardMultiplier: 0,
            },
        ]);

        // await ProviderAPI.addLiquidity(amount);

        await fastForward(SECONDS_PER_MONTH);

        await Provider.claimRewards(true, duration);

        const [validStake] = await StakingMaster.returnUsersStakes(
            User.address
        );

        const stakingState = await StakingAPI.returnStaking(validStake);

        await fastForward(returnEntireVestAndStakeDuration(duration));

        await StakingMaster.claimRewards(validStake);

        expect((await TokenAPI.myBalance()).toString()).eq(
            stakingState.totalLocked
        );
    });

    it("tests that a stake can have its balance updated twice and the correct amount is returned and only one stake is created", async () => {
        await TokenAPI.resetBalance();

        await ProviderAPI.addLiquidity(amount);

        // Claim rewards twice
        await fastForward(SECONDS_PER_MONTH);

        await Provider.claimRewards(true, duration);

        let usersStakes = await StakingMaster.returnUsersStakes(User.address);

        const beforeState = await StakingAPI.returnStaking(usersStakes[0]);

        await fastForward(SECONDS_PER_MONTH);

        await Provider.claimRewards(true, duration);

        usersStakes = await StakingMaster.returnUsersStakes(User.address);

        expect(usersStakes.length).eq(1);

        const stakingState = await StakingAPI.returnStaking(usersStakes[0]);

        if (!stakingState.totalLocked.gt(beforeState.totalLocked)) {
            throw new AssertionError(
                `expected ${stakingState.totalLocked.toString()} to be less than ${beforeState.totalLocked.toString()}`
            );
        }

        await fastForward(returnEntireVestAndStakeDuration(duration));

        await StakingMaster.claimRewards(usersStakes[0]);

        expect((await TokenAPI.myBalance()).toString()).eq(
            stakingState.totalLocked
        );

        expect((await StakingMaster.investedTotal()).toNumber()).eq(0);
    });
});
