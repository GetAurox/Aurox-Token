import { Provider } from "../../../../types/typechain/Provider";
import { BigNumber } from "ethers";

export default async (Provider: Provider, numEpochs?: number) => {
    const currentEpoch = (await Provider.returnCurrentEpoch()).toNumber();

    if (!numEpochs) numEpochs = currentEpoch - 1;

    const startEpoch = currentEpoch - numEpochs;

    if (startEpoch <= 0)
        throw new Error(
            "Provider number of epochs is larger than the current epoch"
        );

    let totalRewards = BigNumber.from(0);

    await Promise.all(
        [...new Array(numEpochs)].map(async (_, idx) => {
            const currentEpochRewards =
                await Provider.returnTotalRewardForEpoch(idx + startEpoch);

            totalRewards = totalRewards.add(currentEpochRewards);
        })
    );

    return totalRewards;
};
