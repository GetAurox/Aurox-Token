import { Provider } from "../../../../../types/typechain/Provider";
import { fastForward, sequentialAsync } from "../../../common";

export default async (Provider: Provider, epochs = 1) => {
    const skipEpochHelper = async () => {
        const currentEpoch = await Provider.returnCurrentEpoch();
        const secondsToEnd = await Provider._getSecondsToEpochEnd(currentEpoch);
        await fastForward(secondsToEnd.toNumber());
    };

    await sequentialAsync([...new Array(epochs)].map(() => skipEpochHelper));
};
