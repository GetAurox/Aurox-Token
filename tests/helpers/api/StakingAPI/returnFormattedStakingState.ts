import { StakingMaster } from "../../../../types/typechain/StakingMaster";
import { StakingState } from "./createStakingAPI";

export default async (
    StakingMaster: StakingMaster,
    stakeAddress: string
): Promise<StakingState> => {
    const [
        investedAmount,
        stakeEndTime,
        interestRate,
        lastUpdate,
        compounded,
        rawInvestedAmount,
        stakeStartTime,
        providerStake,
        released,
        poolRewardsClaimed,
        totalLocked,
    ] = await StakingMaster.staking(stakeAddress);

    return {
        investedAmount,
        stakeEndTime: stakeEndTime.toNumber(),
        interestRate,
        lastUpdate: lastUpdate.toNumber(),
        compounded,
        rawInvestedAmount,
        stakeStartTime: stakeStartTime.toNumber(),
        providerStake,
        released,
        poolRewardsClaimed,
        totalLocked,
    };
};
