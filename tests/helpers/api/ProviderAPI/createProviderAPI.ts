import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish, ContractTransaction } from "ethers";
import { sumBy } from "lodash";
import { Provider } from "../../../../types/typechain/Provider";
import { Token } from "../../../../types/typechain/Token";
import {
    fastForward,
    parseFloatWithFormatEthers,
    sequentialAsync,
} from "../../common";
import skipEpochHelper from "./helpers/skipEpoch";
import returnTotalRewardsForPastEpochsHelper from "./returnTotalRewardsForPastEpochs";

export interface ProviderBinding {
    Provider: Provider;
    ProviderAPI: ProviderAPI;
}

interface UserState {
    lastLiquidityAddedEpochReference: number;
    lastEpochUpdate: number;
    lastClaimedTimestamp: number;
    lastEpochLiquidityWithdrawn: number;
    rewardMultiplier: number;
    bonusRewardMultiplier: number;
}

export interface UserAddedLiquidity {
    amount: BigNumber;
    User: SignerWithAddress;
}

export interface MigrateArgs {
    _user: string;
    _amount: BigNumber;
    _bonusRewardMultiplier: number;
}

export interface ProviderAPI {
    addLiquidity: (
        amount: BigNumberish,
        OverrideUser?: SignerWithAddress
    ) => Promise<void>;
    claimRewards: (
        OverrideUser?: SignerWithAddress,
        createStakeParams?: {
            sendRewardsToStaking: boolean;
            stakeDuration: number;
        }
    ) => Promise<ContractTransaction>;
    skipEpoch: (numEpochs?: number) => Promise<void>;
    returnUserState: (address: string) => Promise<UserState>;
    returnTotalRewardsForPastEpochs: (
        numEpochs: number | undefined
    ) => Promise<BigNumber>;
    returnExpectedEpochRewards: (
        { User, amount }: UserAddedLiquidity,
        totalAdded: BigNumberish,
        numEpochs?: number
    ) => Promise<BigNumber>;
    migrateUsersLPPositions: (migrateArgs: MigrateArgs[]) => Promise<void>;
}

export default (
    LPToken: Token,
    Provider: Provider,
    User: SignerWithAddress
): ProviderBinding => ({
    Provider,
    ProviderAPI: {
        skipEpoch: async (epochs = 1) => skipEpochHelper(Provider, epochs),
        returnUserState: async (address: string) => {
            const {
                lastEpochLiquidityWithdrawn,
                lastClaimedTimestamp,
                lastEpochUpdate,
                lastLiquidityAddedEpochReference,
                bonusRewardMultiplier,
            } = await Provider.userInvestments(address);

            const currentEpoch = await Provider.returnCurrentEpoch();

            const rewardMultiplier = currentEpoch
                .sub(lastEpochLiquidityWithdrawn)
                .add(bonusRewardMultiplier);

            return {
                lastEpochLiquidityWithdrawn:
                    lastEpochLiquidityWithdrawn.toNumber(),
                lastClaimedTimestamp: lastClaimedTimestamp.toNumber(),
                lastEpochUpdate: lastEpochUpdate.toNumber(),
                lastLiquidityAddedEpochReference:
                    lastLiquidityAddedEpochReference.toNumber(),
                rewardMultiplier: rewardMultiplier.toNumber(),
                bonusRewardMultiplier: bonusRewardMultiplier.toNumber(),
            };
        },
        migrateUsersLPPositions: async (migrateArgs) => {
            const total = migrateArgs.reduce((sum, args) => {
                return sum.add(args._amount);
            }, BigNumber.from(0));

            await LPToken.mint(User.address, total);

            await LPToken.approve(Provider.address, total);

            await Provider.migrateUsersLPPositions(migrateArgs);
        },
        returnTotalRewardsForPastEpochs: async (numEpochs?: number) =>
            returnTotalRewardsForPastEpochsHelper(Provider, numEpochs),
        returnExpectedEpochRewards: async (
            { User, amount }: UserAddedLiquidity,
            totalAdded: BigNumberish,
            numEpochs?: number
        ) => {
            const epochRewardTotal =
                await returnTotalRewardsForPastEpochsHelper(
                    Provider,
                    numEpochs
                );

            console.log(
                "🚀 ~ file: createProviderAPI.ts ~ line 106 ~ epochRewardTotal",
                parseFloatWithFormatEthers(epochRewardTotal)
            );

            const { lastEpochLiquidityWithdrawn } =
                await Provider.userInvestments(User.address);

            const currentEpoch = await Provider.returnCurrentEpoch();

            const numEpochsInvested = currentEpoch
                .sub(lastEpochLiquidityWithdrawn)
                .toNumber();

            const epochRewardShare = epochRewardTotal
                .mul(amount)
                .div(totalAdded);

            const rewardBonus = epochRewardShare
                .mul(numEpochsInvested > 10 ? 10 : numEpochsInvested)
                .div(10);

            return epochRewardShare.add(rewardBonus);
        },
        addLiquidity: async (amount: BigNumberish, OverrideUser = User) => {
            await LPToken.mint(OverrideUser.address, amount);
            await LPToken.connect(OverrideUser).increaseAllowance(
                Provider.address,
                amount
            );

            await Provider.connect(OverrideUser).addLiquidity(amount);
        },
        claimRewards: async (
            OverrideUser = User,
            {
                sendRewardsToStaking,
                stakeDuration,
            }: { sendRewardsToStaking: boolean; stakeDuration: number } = {
                sendRewardsToStaking: false,
                stakeDuration: 0,
            }
        ) =>
            Provider.connect(OverrideUser).claimRewards(
                sendRewardsToStaking,
                stakeDuration
            ),
    },
});
