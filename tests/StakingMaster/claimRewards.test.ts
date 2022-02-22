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
    returnEntireVestAndStakeDuration,
    sequentialAsync,
} from "../helpers/common";
import forEach from "mocha-each";
import { TokenAPI } from "../helpers/api/TokenAPI/createTokenAPI";
import { assertionWithRangeAndFetchFunction } from "../helpers/assertions";
import { returnTestableStakingState } from "../helpers/api/StakingAPI/helpers";
import faker from "faker";
import { sum } from "lodash";
import { BigNumber } from "ethers";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("returnStakesClaimableRewards", () => {
    let User: SignerWithAddress;

    let Token: Token;

    let StakingMaster: StakingMaster;

    let StakingAPI: StakingAPI;

    let TokenAPI: TokenAPI;

    const amount = 100000000000;
    const duration = 12;

    let stakingAddress: string;
    let stakingState: StakingState;

    before(async () => {
        [User] = await ethers.getSigners();

        ({
            StakingMaster: { StakingAPI, StakingMaster },
            Token: { Token, TokenAPI },
        } = await createAPI(User));

        ({ stakingAddress, stakingState } = await StakingAPI.createStaking({
            amount,
            duration,
        }));
    });

    it("tests that the claimRewards function reverts when trying to claim rewards for a stake that isn't mine", async () =>
        expect(StakingMaster.claimRewards(stakingAddress)).revertedWith(
            "StakingMaster: Stake is still in progress"
        ));

    it("skips forward", async () => {
        await fastForward(duration * SECONDS_PER_MONTH);
    });

    let totalProgress = 0;
    //  0.5, 1, 5, 10
    // 0.4, 0.25, 0.25
    forEach([0.1, 0.4, 0.25, 0.25]).it("", async (value) => {
        const complete = totalProgress > 1;
        totalProgress += value;

        const expectedTotal = complete
            ? stakingState.totalLocked.toNumber()
            : stakingState.totalLocked.toNumber() * totalProgress;

        await fastForward(VEST_DURATION * value);

        await StakingMaster.claimRewards(stakingAddress);

        await assertionWithRangeAndFetchFunction(
            expectedTotal,
            TokenAPI.myBalance
        );

        if (complete) {
            const stakingState = await StakingAPI.returnStaking(stakingAddress);

            expect(returnTestableStakingState(stakingState)).eql({
                investedAmount: "0",
                stakeEndTime: 0,
                interestRate: "0",
                lastUpdate: 0,
                compounded: false,
                rawInvestedAmount: "0",
                stakeStartTime: 0,
                providerStake: false,
                released: "0",
                poolRewardsClaimed: false,
                totalLocked: "0",
            });

            await expect(
                StakingMaster.claimRewards(stakingAddress)
            ).to.revertedWith("StakingMaster: User doesn't own the stake");
        }
    });
});

faker.seed(1);

describe("claimRewards", () => {
    let User: SignerWithAddress;

    let Token: Token;

    let StakingMaster: StakingMaster;

    let StakingAPI: StakingAPI;

    let TokenAPI: TokenAPI;

    before(async () => {
        [User] = await ethers.getSigners();

        ({
            StakingMaster: { StakingAPI, StakingMaster },
            Token: { Token, TokenAPI },
        } = await createAPI(User));

        // ({ stakingAddress, stakingState } = await StakingAPI.createStaking({
        //     amount,
        //     duration,
        // }));
    });

    // const resetState = async () => {
    //     await TokenAPI.resetBalance();
    //     ({ stakingAddress, stakingState } = await StakingAPI.createStaking({
    //         amount,
    //         duration,
    //     }));
    // };

    const stakeLifecycle = async (
        amount: number,
        duration: number,
        closeStake?: { closeStakeDelay: number }
    ) => {
        const createdStake = await StakingAPI.createStaking({
            amount,
            duration,
        });

        if (closeStake) {
            await fastForward(
                closeStake.closeStakeDelay * duration * SECONDS_PER_MONTH
            );
            await StakingMaster.closeStake(createdStake.stakingAddress);

            await TokenAPI.resetBalance();
        }

        return createdStake;
    };

    const createAndCloseRandomStakes = async (length: number) => {
        const items = [...new Array(length)].map(() => async () => {
            const delay =
                faker.datatype.number({ max: 1, precision: 0.001 }) || 0.1;

            await stakeLifecycle(
                faker.datatype.number(10000000000000),
                faker.datatype.number(84) || 1,
                {
                    closeStakeDelay: delay,
                }
            );
        });

        await sequentialAsync(items);
    };

    it("tests that when one user closes a stake early the pool rewards are sent correctly", async () => {
        await stakeLifecycle(10000000, 12, { closeStakeDelay: 0.5 });

        const duration = 12;

        const { stakingState, stakingAddress } = await stakeLifecycle(
            10000000,
            duration
        );

        await fastForward(returnEntireVestAndStakeDuration(12));

        const totalPoolRewards = (
            await StakingMaster.poolRewardsTotal()
        ).toNumber();

        await StakingMaster.claimRewards(stakingAddress);

        await assertionWithRangeAndFetchFunction(totalPoolRewards, async () => {
            const balance = await TokenAPI.myBalance();

            return balance.sub(stakingState.totalLocked);
        });
    });

    it("tests that when multiple users close stake early, the one user gets all the rewards", async () => {
        await createAndCloseRandomStakes(6);

        const duration = 12;

        const { stakingState, stakingAddress } = await stakeLifecycle(
            200341300000,
            duration
        );

        await fastForward(returnEntireVestAndStakeDuration(12));

        const totalPoolRewards = (
            await StakingMaster.poolRewardsTotal()
        ).toNumber();

        await StakingMaster.claimRewards(stakingAddress);

        await assertionWithRangeAndFetchFunction(totalPoolRewards, async () => {
            const balance = await TokenAPI.myBalance();

            return balance.sub(stakingState.totalLocked);
        });
    });

    it("tests that when multiple users close stake early and multiple users have money within the pool, it all gets split correctly", async () => {
        await createAndCloseRandomStakes(5);

        const duration = 12;

        const amounts = [1000000000, 134099343134, 3409103413431, 343198];

        const stakes = await Promise.all(
            amounts.map((amount) => stakeLifecycle(amount, duration))
        );

        await TokenAPI.resetBalance();

        await fastForward(returnEntireVestAndStakeDuration(12));

        await sequentialAsync(
            stakes.map(
                ({ stakingAddress, stakingState: { totalLocked } }) =>
                    async () => {
                        const totalInvested =
                            await StakingMaster.investedTotal();

                        const poolRewardTotal =
                            await StakingMaster.poolRewardsTotal();

                        await StakingMaster.claimRewards(stakingAddress);

                        const expectedValue = poolRewardTotal
                            .mul(totalLocked)
                            .div(totalInvested);

                        await assertionWithRangeAndFetchFunction(
                            expectedValue.add(totalLocked).toNumber(),
                            TokenAPI.myBalance,
                            0.001
                        );

                        await TokenAPI.resetBalance();
                    }
            )
        );
    });
});
