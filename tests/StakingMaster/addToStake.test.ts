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
import chai from "chai";
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

chai.use(chaiAsPromised);
const { expect } = chai;

faker.seed(1);

describe("addToStake", () => {
    let User: SignerWithAddress;

    let Token: Token;

    let StakingMaster: StakingMaster;

    let StakingAPI: StakingAPI;

    let TokenAPI: TokenAPI;

    const amount = 100000000000000;
    const duration = 12;

    before(async () => {
        [User] = await ethers.getSigners();

        ({
            StakingMaster: { StakingAPI, StakingMaster },
            Token: { Token, TokenAPI },
        } = await createAPI(User, User.address));
    });

    it("tests that adding to a stake at the start and claiming rewards at the end behaves as normal", async () => {
        const { stakingAddress } = await StakingAPI.createStaking({
            amount,
            duration,
        });

        await StakingMaster.addToStake(stakingAddress, 340910000880);

        await fastForward(duration * SECONDS_PER_MONTH + VEST_DURATION);

        const updatedStakingState = await StakingAPI.returnStaking(
            stakingAddress
        );

        await TokenAPI.resetBalance();

        await StakingMaster.claimRewards(stakingAddress);

        expect(updatedStakingState.totalLocked.toString()).eq(
            (await TokenAPI.myBalance()).toString()
        );

        expect((await Token.balanceOf(StakingMaster.address)).toNumber()).eq(0);
    });

    it("tests that adding to a stake many times doesn't cause issues", async () => {
        const { stakingAddress } = await StakingAPI.createStaking({
            amount,
            duration,
        });

        const totalFastForwardTime =
            duration * SECONDS_PER_MONTH + VEST_DURATION;

        // 10% -> 30% -> 60% -> 80% -> 95%
        await Promise.all(
            [0.1, 0.2, 0.3, 0.2, 0.15].map(async (fastForwardPercentage) => {
                await fastForward(fastForwardPercentage * totalFastForwardTime);

                await StakingMaster.addToStake(
                    stakingAddress,
                    faker.datatype.number(1000000000)
                );
            })
        );

        // Fast forward to completion time
        await fastForward(0.05 * totalFastForwardTime);

        const updatedStakingState = await StakingAPI.returnStaking(
            stakingAddress
        );

        await TokenAPI.resetBalance();

        await StakingMaster.claimRewards(stakingAddress);

        expect(updatedStakingState.totalLocked.toString()).eq(
            (await TokenAPI.myBalance()).toString()
        );

        expect((await Token.balanceOf(StakingMaster.address)).toNumber()).eq(0);

        expect((await StakingMaster.investedTotal()).toNumber()).eq(0);

        expect(await StakingMaster.returnUsersStakes(User.address)).eql([]);
    });
});
