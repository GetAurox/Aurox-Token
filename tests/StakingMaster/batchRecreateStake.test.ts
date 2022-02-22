import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Token } from "../../types/typechain/Token";
import { StakingMaster } from "../../types/typechain/StakingMaster";
import createAPI from "../helpers/createAPI";
import {
    RecreateStakingArgs,
    StakingAPI,
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
    sequentialAsync,
} from "../helpers/common";
import { emptyStake } from "./__mocks__/stakes.mock";
import { returnTestableStakingState } from "../helpers/api/StakingAPI/helpers";
import { chunk, flatten, orderBy } from "lodash";
import { assertionWithRangeForBigNumber } from "../helpers/assertions";
import { VEST_DURATION } from "../helpers/constants";

chai.use(chaiAsPromised);
const { expect } = chai;
const GAS_PRICE = 107;

describe("StakingMaster - batchRecreateStake", () => {
    let User: SignerWithAddress;

    let Token: Token;

    let StakingMaster: StakingMaster;

    let StakingAPI: StakingAPI;

    let TokenAPI: TokenAPI;

    beforeEach(async () => {
        [User] = await ethers.getSigners();

        ({
            StakingMaster: { StakingAPI, StakingMaster },
            Token: { Token, TokenAPI },
        } = await createAPI(User));
    });

    it("should transfer the correct amount of tokens to cover all the created stakes", async () => {
        const testStakes = TestJSON.stakes.slice(0, 10);

        const { createdStakes } = await StakingAPI.batchRecreateStake(
            testStakes
        );

        const realTotal = createdStakes.reduce(
            (sum, stake) => sum.add(stake.stakingState.totalLocked),
            BigNumber.from(0)
        );

        expect((await Token.balanceOf(StakingMaster.address)).toString()).eq(
            realTotal.toString()
        );
    });

    it("closes each real stake and expects the correct balance is claimed", async () => {
        const stakes: RecreateStakingArgs[] = TestJSON.stakes.map((stake) => ({
            ...stake,
            recipient: User.address,
        }));

        let totalGas = 0;

        // Chunk the array into 50 length chunks, then flatten it back down to one array
        const createdStakes = flatten(
            await Promise.all(
                chunk(stakes, 50).map(async (chunkStakes) => {
                    const { createdStakes, gasUsed } =
                        await StakingAPI.batchRecreateStake(chunkStakes);

                    totalGas += gasUsed;

                    return createdStakes;
                })
            )
        );

        const realTotal = createdStakes.reduce(
            (sum, stake) => sum.add(stake.stakingState.totalLocked),
            BigNumber.from(0)
        );

        expect((await Token.balanceOf(StakingMaster.address)).toString()).eq(
            realTotal.toString()
        );

        const orderedStakes = orderBy(
            createdStakes,
            "stakingState.stakeEndTime"
        );

        console.log(orderedStakes.length);

        await sequentialAsync(
            orderedStakes.map(
                ({ stakingState, stakingAddress }) =>
                    async () => {
                        await TokenAPI.resetBalance();

                        const now = await returnCurrentHardhatTime();

                        if (VEST_DURATION + stakingState.stakeEndTime > now) {
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

        console.log(`Batch recreating stakes: Total Gas Used: ${totalGas}`);

        console.log(
            `Total ETH cost: ${returnGasCostInETH(GAS_PRICE, totalGas)}`
        );

        expect(await Token.balanceOf(StakingMaster.address)).eq(0);
    });
});
