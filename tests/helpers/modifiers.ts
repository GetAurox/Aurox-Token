import { BigNumber } from "@ethersproject/bignumber";

export const change_inValue = async (
    sideEffectFunction: () => Promise<any>,
    fetchValueFunction: () => Promise<BigNumber>
) => {
    const beforeValue = await fetchValueFunction();
    await sideEffectFunction();
    const afterValue = await fetchValueFunction();

    return afterValue.sub(beforeValue);
};
