import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "hardhat";
import { SECONDS_PER_MONTH, VEST_DURATION } from "./constants";

export const returnTimeToDate = (date: Date) =>
    Math.floor(date.getTime() / 1000);

export const parseFloatWithFormatEthers = (amount: BigNumber) =>
    parseFloat(ethers.utils.formatEther(amount));

/**
 *  Increases the time in the EVM.
 *  @param seconds Number of seconds to increase the time by
 */
export const fastForward = async (seconds: number) => {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
};

/**
 * Function to return the timestamp of the hardhat node
 * @returns The current timestamp of the hardhat fork
 */
export const returnCurrentHardhatTime = async () => {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    return (await ethers.provider.getBlock(blockNumBefore)).timestamp;
};

// Function to sequentially resolve an array of functions that return promises

export const sequentialAsync = async (items: (() => Promise<any>)[]) => {
    const results: any[] = [];

    await items.reduce(
        async (prev: Promise<any>, asyncFunction: () => Promise<any>) => {
            await prev;
            results.push(await asyncFunction());
        },
        Promise.resolve()
    );

    return results;
};

export const returnEntireVestAndStakeDuration = (duration: number) =>
    duration * SECONDS_PER_MONTH + VEST_DURATION;

export const returnGasCostInETH = (gasPrice: number, gasLimit: number) => {
    const total = gasPrice * gasLimit;
    return ethers.utils.formatUnits(total.toString(), "gwei");
};
