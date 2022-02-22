import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Token } from "../../types/typechain/Token";
import { StakingMaster } from "../../types/typechain/StakingMaster";
import createAPI from "../helpers/createAPI";
import { StakingAPI } from "../helpers/api/StakingAPI/createStakingAPI";
import { SECONDS_PER_MONTH } from "../helpers/constants";
import chaiAsPromised from "chai-as-promised";
import chai from "chai";
import { returnCurrentHardhatTime } from "../helpers/common";
import { returnTestableStakingState } from "../helpers/api/StakingAPI/helpers";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("createStake", () => {
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

    it("tests that a stake is created and the values are set correctly", async () => {
        const amount = 10000;
        const duration = 12;

        const { stakingAddress, stakingState } = await StakingAPI.createStaking(
            {
                amount,
                duration,
            }
        );

        expect(stakingAddress).to.eq(
            "0x0000000000000000000000000000000000000001"
        );

        const currentHardhatTime = await returnCurrentHardhatTime();

        const totalLocked = "10612";

        expect(returnTestableStakingState(stakingState)).to.eql({
            investedAmount: "10000",
            stakeEndTime: currentHardhatTime + duration * SECONDS_PER_MONTH,
            interestRate: "60000000000000000",
            lastUpdate: currentHardhatTime,
            compounded: true,
            rawInvestedAmount: "10000",
            stakeStartTime: currentHardhatTime,
            providerStake: false,
            released: "0",
            poolRewardsClaimed: false,
            totalLocked,
        });

        expect((await StakingMaster.investedTotal()).toString()).to.eq(
            totalLocked
        );

        const stakingMasterBalance = await Token.balanceOf(
            StakingMaster.address
        );

        expect(stakingMasterBalance.toString()).to.eq(totalLocked);
    });
});
