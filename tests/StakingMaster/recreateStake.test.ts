import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Token } from "../../types/typechain/Token";
import { StakingMaster } from "../../types/typechain/StakingMaster";
import createAPI from "../helpers/createAPI";
import {
    RecreateStakingArgs,
    StakingAPI,
    StakingState,
} from "../helpers/api/StakingAPI/createStakingAPI";
import chaiAsPromised from "chai-as-promised";
import chai from "chai";

import { TokenAPI } from "../helpers/api/TokenAPI/createTokenAPI";
import TestJSON from "../../constants/New.json";
import { BigNumber } from "@ethersproject/bignumber";
import {
    fastForward,
    returnCurrentHardhatTime,
    returnGasCostInETH,
    returnTimeToDate,
    sequentialAsync,
} from "../helpers/common";
import { completedTestStake, emptyStake } from "./__mocks__/stakes.mock";
import { returnTestableStakingState } from "../helpers/api/StakingAPI/helpers";
import { orderBy } from "lodash";
import {
    assertionWithRangeAndFetchFunction,
    assertionWithRangeForBigNumber,
} from "../helpers/assertions";
import { VEST_DURATION } from "../helpers/constants";

chai.use(chaiAsPromised);
const { expect } = chai;
const GAS_PRICE = 60;

describe("StakingMaster - recreateStake", () => {
    let User: SignerWithAddress;

    let Token: Token;

    let StakingMaster: StakingMaster;

    let StakingAPI: StakingAPI;

    let TokenAPI: TokenAPI;

    const amount = 100000000000;
    const duration = 12;

    before(async () => {
        [User] = await ethers.getSigners();

        ({
            StakingMaster: { StakingAPI, StakingMaster },
            Token: { Token, TokenAPI },
        } = await createAPI(User));
    });

    // const formatData = (
    //     state: typeof TestJSON.stakes[0]
    // ): RecreateStakingArgs => ({
    //     ...state
    // });

    it("tests that a stake that has finished its duration and is re-created through the recreate function has its values set correctly", async () => {
        const { stakingState } = await StakingAPI.recreateStaking(
            completedTestStake(User.address)
        );

        expect(returnTestableStakingState(stakingState)).eql({
            investedAmount: "50000000000000000000",
            stakeEndTime: 1620651679,
            interestRate: "5000000000000000",
            lastUpdate: 1618021933,
            compounded: false,
            rawInvestedAmount: "50000000000000000000",
            stakeStartTime: 1618021933,
            providerStake: false,
            released: "0",
            poolRewardsClaimed: false,
            totalLocked: "50020833333333333333",
        });

        expect((await StakingMaster.investedTotal()).toString()).to.eq(
            stakingState.totalLocked
        );

        const stakingMasterBalance = await Token.balanceOf(
            StakingMaster.address
        );

        expect(stakingMasterBalance.toString()).to.eq(stakingState.totalLocked);
    });

    it("tests that the stakes can be recreated", async () => {
        const totalGas = (
            await Promise.all(
                TestJSON.stakes.map((stakeState) => {
                    return StakingAPI.recreateStaking(stakeState);
                })
            )
        ).reduce((total, current) => (total += current.gasUsed), 0);

        console.log(`Recreating stakes: Total Gas Used: ${totalGas}`);
        console.log(
            `Total ETH cost: ${returnGasCostInETH(GAS_PRICE, totalGas)}`
        );
    });
});

describe("StakingMaster - recreateStake - closeStake", () => {
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
    });

    it("tests that calling the closeStake function on the completed stake fails and calling the claimRewards function returns all the rewards", async () => {
        const { stakingAddress, stakingState } =
            await StakingAPI.recreateStaking(completedTestStake(User.address));

        await expect(StakingMaster.closeStake(stakingAddress)).to.revertedWith(
            "Staking contract has finished"
        );

        await StakingMaster.claimRewards(stakingAddress);

        expect(await TokenAPI.myBalance()).eq(stakingState.totalLocked);

        expect((await StakingMaster.investedTotal()).toNumber()).eq(0);
    });

    it("closes each real stake and expects the correct balance is claimed", async () => {
        await TokenAPI.resetBalance();
        const stakes = TestJSON.stakes;

        const createdStakes = await Promise.all(
            stakes.map((stake) =>
                StakingAPI.recreateStaking({
                    ...stake,
                    recipient: User.address,
                })
            )
        );

        const orderedStakes = orderBy(
            createdStakes,
            "stakingState.stakeEndTime"
        );

        await sequentialAsync(
            orderedStakes.map(
                ({ stakingState, stakingAddress }) =>
                    async () => {
                        await TokenAPI.resetBalance();

                        const now = await returnCurrentHardhatTime();

                        if (VEST_DURATION + stakingState.stakeEndTime > now) {
                            // console.log(
                            //     `Fast forwarding: ${
                            //         stakingState.stakeEndTime +
                            //         VEST_DURATION -
                            //         now
                            //     }`
                            // );

                            await fastForward(
                                stakingState.stakeEndTime - now + VEST_DURATION
                            );
                        }

                        await StakingMaster.claimRewards(stakingAddress);

                        const state = returnTestableStakingState(
                            await StakingAPI.returnStaking(stakingAddress)
                        );

                        expect(state).eql(emptyStake);

                        await assertionWithRangeForBigNumber(
                            stakingState.totalLocked,
                            TokenAPI.myBalance,
                            0.001
                        );
                    }
            )
        );

        expect(await Token.balanceOf(StakingMaster.address)).eq(0);
    });
});
