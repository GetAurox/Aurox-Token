import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Token } from "../../types/typechain/Token";
import { StakingMaster } from "../../types/typechain/StakingMaster";
import createAPI from "../helpers/createAPI";
import { StakingAPI } from "../helpers/api/StakingAPI/createStakingAPI";
import { BURN_ADDRESS, SECONDS_PER_MONTH } from "../helpers/constants";
import chaiAsPromised from "chai-as-promised";
import chai from "chai";
import { fastForward, returnCurrentHardhatTime } from "../helpers/common";
import { TokenAPI } from "../helpers/api/TokenAPI/createTokenAPI";
import { returnTestableStakingState } from "../helpers/api/StakingAPI/helpers";
import { emptyStake, inProgressTestStake } from "./__mocks__/stakes.mock";
import { change_inValue } from "../helpers/modifiers";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("closeStake", () => {
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

    beforeEach(async () => {
        await Token.transfer(BURN_ADDRESS, await Token.balanceOf(User.address));
    });

    const amount = 10000;
    const duration = 12;

    let poolRewardsCurrentTotal = 0;

    const returnUpdatedPoolRewards = async () => {
        const newPoolRewardTotal = (
            await StakingMaster.poolRewardsTotal()
        ).toNumber();

        const addedPoolRewards = newPoolRewardTotal - poolRewardsCurrentTotal;

        poolRewardsCurrentTotal = newPoolRewardTotal;

        return addedPoolRewards;
    };

    it("tests that calling the closeStake function with a stake address that isn't owned by the user reverts", async () => {
        await expect(
            StakingMaster.closeStake(
                "0x0000000000000000000000000000000000000001"
            )
        ).to.revertedWith("StakingMaster: User doesn't own the stake");
    });

    it("tests that the stakingState is reset and that recalling the closeStake function fails", async () => {
        const { stakingAddress } = await StakingAPI.createStaking({
            amount,
            duration,
        });

        await StakingMaster.closeStake(stakingAddress);

        const stakingState = await StakingAPI.returnStaking(stakingAddress);

        expect(returnTestableStakingState(stakingState)).eql(emptyStake);

        await expect(StakingMaster.closeStake(stakingAddress)).to.revertedWith(
            "StakingMaster: User doesn't own the stake"
        );

        // Update the pool reward total
        const poolRewardTotal = await returnUpdatedPoolRewards();

        expect(poolRewardTotal).eq((await StakingAPI.balance()).toNumber());

        expect((await StakingMaster.investedTotal()).toNumber()).eq(0);
    });

    it("tests that when closing a stake that was just started half of the original balance is returned", async () => {
        const { stakingAddress } = await StakingAPI.createStaking({
            amount,
            duration,
        });

        await StakingMaster.closeStake(stakingAddress);

        const myBalance = await TokenAPI.myBalance();

        expect(myBalance.toNumber()).greaterThanOrEqual(5000).lessThan(5010);

        const addedPoolRewards = await returnUpdatedPoolRewards();

        expect(addedPoolRewards).greaterThanOrEqual(5580).lessThan(5620);

        expect((await StakingMaster.investedTotal()).toNumber()).eq(0);
    });

    it("tests that closing a stake midway through returns 75% of the balance", async () => {
        const { stakingAddress, stakingState } = await StakingAPI.createStaking(
            {
                amount,
                duration,
            }
        );

        await fastForward((duration / 2) * SECONDS_PER_MONTH);

        await StakingMaster.closeStake(stakingAddress);

        const myBalance = await TokenAPI.myBalance();

        expect(myBalance.toNumber()).greaterThanOrEqual(7490).lessThan(7510);

        const addedPoolRewards = await returnUpdatedPoolRewards();

        expect(addedPoolRewards).eq(
            stakingState.totalLocked.sub(myBalance).toNumber()
        );

        expect((await StakingMaster.investedTotal()).toNumber()).eq(0);
    });

    it("tests that closing a stake 75% through returns 87.5% of the balance", async () => {
        const beforeAllBalance = await StakingAPI.balance();
        const { stakingAddress, stakingState } = await StakingAPI.createStaking(
            {
                amount,
                duration,
            }
        );

        await fastForward(duration * 0.75 * SECONDS_PER_MONTH);

        await StakingMaster.closeStake(stakingAddress);

        const afterAllBalance = await StakingAPI.balance();

        const myBalance = await TokenAPI.myBalance();

        expect(myBalance.toNumber()).greaterThanOrEqual(8740).lessThan(8760);

        const addedPoolRewards = await returnUpdatedPoolRewards();

        expect(addedPoolRewards).eq(
            stakingState.totalLocked.sub(myBalance).toNumber()
        );
        expect(addedPoolRewards).eq(
            afterAllBalance.sub(beforeAllBalance).toNumber()
        );

        expect((await StakingMaster.investedTotal()).toNumber()).eq(0);
    });

    it("tests that closing a re-create stake 75% through returns 87.5% of the balance", async () => {
        const beforeAllBalance = await StakingAPI.balance();
        const { stakingAddress, stakingState } =
            await StakingAPI.recreateStaking(
                await inProgressTestStake(
                    User.address,
                    (await returnCurrentHardhatTime()) +
                        duration * SECONDS_PER_MONTH
                )
            );

        await fastForward(duration * 0.75 * SECONDS_PER_MONTH);

        await StakingMaster.closeStake(stakingAddress);

        const afterAllBalance = await StakingAPI.balance();

        const myBalance = await TokenAPI.myBalance();

        // As the balance of the stake is 5e12, expect 87.5% of that to be the following
        expect(myBalance.toNumber())
            .greaterThanOrEqual(437400000000000)
            .lessThan(437600000000000);

        const addedPoolRewards = await returnUpdatedPoolRewards();

        expect(addedPoolRewards.toString()).eq(
            stakingState.totalLocked.sub(myBalance).toString()
        );
        expect(addedPoolRewards.toString()).eq(
            afterAllBalance.sub(beforeAllBalance).toString()
        );

        expect((await StakingMaster.investedTotal()).toString()).eq("0");
    });

    it("tests that closing a stake 100% throws an error as it has finished", async () => {
        const {
            stakingAddress,
            stakingState: { totalLocked },
        } = await StakingAPI.createStaking({
            amount,
            duration,
        });

        await fastForward(duration * SECONDS_PER_MONTH);

        await expect(StakingMaster.closeStake(stakingAddress)).to.revertedWith(
            "Staking contract has finished"
        );

        expect((await StakingMaster.investedTotal()).toNumber()).eq(
            totalLocked
        );
    });
});
