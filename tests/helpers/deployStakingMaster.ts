import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { StakingMaster } from "../../types/typechain/StakingMaster";
import { Token } from "../../types/typechain/Token";
import { returnTimeToDate } from "./common";

export default async (Token: Token): Promise<StakingMaster> => {
    const StakingMasterDeployer = await ethers.getContractFactory(
        "StakingMaster"
    );

    const StakingMaster = (await StakingMasterDeployer.deploy(
        Token.address,
        returnTimeToDate(new Date())
    )) as StakingMaster;

    return StakingMaster;
};
