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
import { fastForward } from "../helpers/common";
import forEach from "mocha-each";
import { TokenAPI } from "../helpers/api/TokenAPI/createTokenAPI";
import { assertionWithRangeAndFetchFunction } from "../helpers/assertions";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("returnStakesClaimableRewards.test", () => {
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

    // const claimableRewardsAssertion = async (expectedValue: number) =>
    //     assertionWithRangeAndFetchFunction(
    //         expectedValue,
    //         async () =>
    //             StakingMaster.returnStakesClaimableRewards(stakingAddress),
    //         0.0001
    //     );

    const claimableRewardsAssertion = async (expectedValue: number) => {
        const claimableRewards =
            await StakingMaster.returnStakesClaimableRewards(stakingAddress);

        const buffer = amount * 0.0001;

        expect(Math.round(claimableRewards.toNumber()))
            .greaterThan(expectedValue - buffer)
            .lessThan(expectedValue + buffer);
    };

    const pipe_fastForwardWithAssertion = async (
        fastForwardLength: number,
        expectedValue: number
    ) => {
        await fastForward(fastForwardLength);
        await claimableRewardsAssertion(expectedValue);
    };

    it("tests that the claimable rewards are 0 when the vest hasn't started yet", async () =>
        claimableRewardsAssertion(0));

    it("tests that the claimable rewards are 0 when the vest hasn't started yet", async () =>
        pipe_fastForwardWithAssertion(duration * SECONDS_PER_MONTH, 0));

    let totalProgress = 0;

    // 10% -> 50% -> 75% -> 100% -> 150%
    forEach([0.0001, 0.001, 0.1, 0.4, 0.25, 0.25, 0.5, 1, 5, 10]).it(
        `tests that the claimable amount is calculated correctly are different periods through the vest ${totalProgress}`,
        async (value) => {
            totalProgress += value;

            const expectedTotal =
                totalProgress > 1
                    ? stakingState.totalLocked.toNumber()
                    : stakingState.totalLocked.toNumber() * totalProgress;

            await pipe_fastForwardWithAssertion(
                VEST_DURATION * value,
                expectedTotal
            );
        }
    );
});
