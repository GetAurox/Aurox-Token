import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import chaiAsPromised from "chai-as-promised";
import chai, { AssertionError } from "chai";
import { parseFloatWithFormatEthers } from "./common";

const { expect } = chai;
chai.use(chaiAsPromised);

export const assertionWithRange = (
    expectedValue: number,
    actualValue: number,
    range = 0.0001
) => {
    const buffer = expectedValue * range;

    expect(actualValue)
        .greaterThanOrEqual(expectedValue - buffer)
        .lessThanOrEqual(expectedValue + buffer);
};

export const assertionWithRangeAndFetchFunction = async (
    expectedValue: number,
    fetchFunction: () => Promise<BigNumber | number>,
    range = 0.0001
) => {
    let claimableRewards = await fetchFunction();

    const buffer = expectedValue * range;

    if (claimableRewards instanceof BigNumber) {
        claimableRewards = claimableRewards.toNumber();
    }

    expect(Math.round(claimableRewards))
        .greaterThanOrEqual(expectedValue - buffer)
        .lessThanOrEqual(expectedValue + buffer);
};

export const assertionWithRangeForBigNumber = async (
    expectedValue: BigNumber,
    fetchFunction: (() => Promise<BigNumber>) | BigNumber,
    range = 0.0001
) => {
    const returnedValue =
        fetchFunction instanceof BigNumber
            ? fetchFunction
            : await fetchFunction();

    const buffer = expectedValue.div(1 / range);

    if (!returnedValue.gte(expectedValue.sub(buffer))) {
        throw new AssertionError(
            `expected ${parseFloatWithFormatEthers(
                returnedValue
            )} to be greater than ${parseFloatWithFormatEthers(
                expectedValue.add(buffer)
            )}`
        );
    }

    if (!returnedValue.lte(expectedValue.add(buffer))) {
        throw new AssertionError(
            `expected ${parseFloatWithFormatEthers(
                returnedValue
            )} to be less than ${parseFloatWithFormatEthers(
                expectedValue.add(buffer)
            )}`
        );
    }

    expect(true).eq(true);
};
