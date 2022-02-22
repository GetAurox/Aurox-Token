import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Token } from "../../types/typechain/Token";
import { StakingMaster } from "../../types/typechain/StakingMaster";
import createAPI from "../helpers/createAPI";
import { StakingAPI } from "../helpers/api/StakingAPI/createStakingAPI";
import faker from "faker";
import StakeState from "../../constants/StakeStates.json";
import { SECONDS_PER_MONTH } from "../helpers/constants";
import { returnGasCostInETH } from "../helpers/common";
import { sumBy } from "lodash";
import { BigNumber } from "@ethersproject/bignumber";

faker.seed(1);

const GAS_PRICE = 60;

describe("StakingMaster - createStaking", () => {
    let User: SignerWithAddress;

    let Token: Token;

    let StakingMaster: StakingMaster;

    let StakingAPI: StakingAPI;

    before(async () => {
        [User] = await ethers.getSigners();

        ({
            StakingMaster: { StakingAPI, StakingMaster },
            Token: { Token },
        } = await createAPI(User));
    });

    it.skip("measures gas cost for the createStaking function", async () => {
        // Max value -> 100,000
        // Max duration 72

        let totalSum = BigNumber.from(0);

        const totalGas = (
            await Promise.all(
                StakeState.stakes.map(
                    ({
                        rawInvestedAmount,
                        stakeEndTime,
                        stakeStartTime,
                        balance,
                    }) => {
                        const duration =
                            (stakeEndTime - stakeStartTime) / SECONDS_PER_MONTH;

                        totalSum = totalSum.add(rawInvestedAmount);

                        return StakingAPI.createStaking({
                            amount: rawInvestedAmount,
                            duration,
                        });
                    }
                )
            )
        ).reduce((total, current) => (total += current.gasUsed), 0);

        console.log(`Total Gas Used: ${totalGas}`);
        console.log(
            `Total ETH cost: ${returnGasCostInETH(GAS_PRICE, totalGas)}`
        );
        console.log(`Total tokens:  ${ethers.utils.formatEther(totalSum)}`);
        // console.log(`Blocks required: ${ethers.utils.par}`);

        // await Promise.all(
        //     [...new Array(30)].map(async () => {
        //         const amount = ethers.utils.parseEther(
        //             (faker.datatype.number(10000) || 10).toString()
        //         );

        //         return StakingAPI.createStaking({
        //             amount,
        //             duration: faker.datatype.number(72),
        //         });
        //     })
        // );
    });
});
