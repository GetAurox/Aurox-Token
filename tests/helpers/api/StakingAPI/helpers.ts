import { StakingState } from "./createStakingAPI";

export const returnTestableStakingState = (stakingState: StakingState) => ({
    ...stakingState,
    investedAmount: stakingState.investedAmount.toString(),
    interestRate: stakingState.interestRate.toString(),
    rawInvestedAmount: stakingState.rawInvestedAmount.toString(),
    released: stakingState.released.toString(),
    totalLocked: stakingState.totalLocked.toString(),
});
