import { returnCurrentHardhatTime } from "../../helpers/common";

export const completedTestStake = (recipient: string) => ({
    balance: "50020833333333333333",
    recipient,
    investedAmount: "50000000000000000000",
    stakeEndTime: 1620651679,
    interestRate: "5000000000000000",
    lastUpdate: 1618021933,
    compounded: false,
    rawInvestedAmount: "50000000000000000000",
    stakeStartTime: 1618021933,
    providerStake: false,
});

export const inProgressTestStake = async (
    recipient: string,
    stakeEndTime: number
) => ({
    balance: "500208333333333",
    recipient,
    investedAmount: "500000000000000",
    stakeEndTime,
    interestRate: "5000000000000000",
    lastUpdate: await returnCurrentHardhatTime(),
    compounded: false,
    rawInvestedAmount: "500000000000000",
    stakeStartTime: await returnCurrentHardhatTime(),
    providerStake: false,
});

export const emptyStake = {
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
};
