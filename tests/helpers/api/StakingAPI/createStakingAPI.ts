import { Token } from "../../../../types/typechain/Token";
import { StakingMaster } from "../../../../types/typechain/StakingMaster";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import returnFormattedStakingState from "./returnFormattedStakingState";
import { ContractReceipt } from "ethers";

export interface StakingAPI {
    balance: () => Promise<BigNumber>;
    createStaking: (stakingArgs: StakingArgs) => Promise<{
        stakingAddress: string;
        gasUsed: number;
        stakingState: StakingState;
    }>;
    returnStaking: (stakeAddress: string) => Promise<StakingState>;
    recreateStaking: (recreateStakingArgs: RecreateStakingArgs) => Promise<{
        stakingAddress: string;
        gasUsed: number;
        stakingState: StakingState;
    }>;
    batchRecreateStake: (
        recreateStakingArgs: RecreateStakingArgs[]
    ) => Promise<{ createdStakes: BatchCreateStaking[]; gasUsed: number }>;
}

export interface StakingBinding {
    StakingMaster: StakingMaster;
    StakingAPI: StakingAPI;
}

interface StakingArgs {
    amount: BigNumberish;
    duration: number;
    recipient?: string;
}

export interface RecreateStakingArgs {
    balance: BigNumberish;
    recipient: string;
    investedAmount: BigNumberish;
    stakeEndTime: number;
    interestRate: BigNumberish;
    lastUpdate: number;
    compounded: boolean;
    rawInvestedAmount: BigNumberish;
    stakeStartTime: number;
    providerStake: boolean;
}

export interface StakingState {
    investedAmount: BigNumber;
    stakeEndTime: number;
    interestRate: BigNumber;
    lastUpdate: number;
    compounded: boolean;
    rawInvestedAmount: BigNumber;
    stakeStartTime: number;
    providerStake: boolean;
    released: BigNumber;
    poolRewardsClaimed: boolean;
    totalLocked: BigNumber;
}

export interface BatchCreateStaking {
    stakingAddress: string;
    stakingState: StakingState;
}

const returnCreatedStakeAddress = (tx: ContractReceipt) => {
    const newStakeEvent = tx.events?.find(
        (event) => event.event === "CreateStaking"
    );

    const stakingAddress = newStakeEvent?.args?.[1];

    if (!stakingAddress)
        throw new Error(
            "Custom: No stake address emitted from creating stake event"
        );

    return stakingAddress;
};

const returnStakeCreatedData = async (
    StakingMaster: StakingMaster,
    tx: ContractReceipt
) => {
    const stakingAddress = returnCreatedStakeAddress(tx);

    return {
        stakingAddress,
        stakingState: await returnFormattedStakingState(
            StakingMaster,
            stakingAddress
        ),
    };
};

const formatStakeArgs = (recreateArgs: RecreateStakingArgs) => ({
    _balance: recreateArgs.balance,
    _recipient: recreateArgs.recipient,
    _investedAmount: recreateArgs.investedAmount,
    _stakeEndTime: recreateArgs.stakeEndTime,
    _interestRate: recreateArgs.interestRate,
    _lastUpdate: recreateArgs.lastUpdate,
    _compounded: recreateArgs.compounded,
    _rawInvestedAmount: recreateArgs.rawInvestedAmount,
    _stakeStartTime: recreateArgs.stakeStartTime,
    _providerStake: recreateArgs.providerStake,
});

export default (
    Token: Token,
    StakingMaster: StakingMaster,
    User: SignerWithAddress
): StakingBinding => ({
    StakingMaster,
    StakingAPI: {
        balance: () => Token.balanceOf(StakingMaster.address),
        returnStaking: async (stakeAddress: string) =>
            returnFormattedStakingState(StakingMaster, stakeAddress),
        createStaking: async ({
            amount,
            duration,
            recipient,
        }: StakingArgs): Promise<{
            stakingAddress: string;
            gasUsed: number;
            stakingState: StakingState;
        }> => {
            const address = recipient ?? User.address;

            await Token.mint(address, amount);
            await Token.increaseAllowance(StakingMaster.address, amount);

            await Token.increaseTokenAllowance(StakingMaster.address, amount);
            await Token.mint(Token.address, amount);

            const tx = await (
                await StakingMaster.createStaking(amount, duration, address)
            ).wait();

            const { stakingAddress, stakingState } =
                await returnStakeCreatedData(StakingMaster, tx);

            return {
                stakingAddress,
                stakingState,
                gasUsed: tx.cumulativeGasUsed.toNumber(),
            };
        },
        recreateStaking: async (recreateArgs: RecreateStakingArgs) => {
            await Token.mint(User.address, recreateArgs.balance);

            await Token.increaseAllowance(
                StakingMaster.address,
                recreateArgs.balance
            );

            // To fund the rewards for the staking contracts
            await Token.mint(Token.address, recreateArgs.balance);

            const tx = await (
                await StakingMaster.recreateStake(formatStakeArgs(recreateArgs))
            ).wait();

            const { stakingAddress, stakingState } =
                await returnStakeCreatedData(StakingMaster, tx);

            return {
                stakingAddress,
                stakingState,
                gasUsed: tx.cumulativeGasUsed.toNumber(),
            };
        },
        batchRecreateStake: async (
            recreateStakingArgs: RecreateStakingArgs[]
        ) => {
            const totalTransferAmount = recreateStakingArgs.reduce(
                (sum, args) => sum.add(args.balance),
                BigNumber.from(0)
            );

            await Token.mint(User.address, totalTransferAmount);

            await Token.increaseAllowance(
                StakingMaster.address,
                totalTransferAmount
            );

            await Token.mint(Token.address, totalTransferAmount);

            const tx = await (
                await StakingMaster.batchRecreateStake(
                    recreateStakingArgs.map(formatStakeArgs)
                )
            ).wait();

            const stakingAddresses: string[] = tx.events
                ?.filter((event) => event.event === "CreateStaking")
                .map(
                    (createStakingEvent) => createStakingEvent?.args?.[1]
                ) as string[];

            const createdStakes = await Promise.all(
                stakingAddresses.map(async (stakingAddress) => ({
                    stakingAddress,
                    stakingState: await returnFormattedStakingState(
                        StakingMaster,
                        stakingAddress
                    ),
                }))
            );

            return { createdStakes, gasUsed: tx.cumulativeGasUsed.toNumber() };
        },
    },
});
