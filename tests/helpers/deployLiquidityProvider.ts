import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Provider } from "../../types/typechain/Provider";
import { StakingMaster } from "../../types/typechain/StakingMaster";
import { Token } from "../../types/typechain/Token";
import { returnCurrentHardhatTime, returnTimeToDate } from "./common";

export default async (
    LPToken: Token,
    AuroxToken: Token,
    StakingMaster: StakingMaster,
    migrationContractAddress: string | undefined,
    overrideEpochStartTime: number | undefined
): Promise<Provider> => {
    const ProviderDeployer = await ethers.getContractFactory("Provider");

    const Provider = (await ProviderDeployer.deploy(
        LPToken.address,
        AuroxToken.address,
        StakingMaster.address,
        overrideEpochStartTime ?? returnCurrentHardhatTime(),
        // If a migration contract address wasn't passed in set the address to the LP token just to pass the constructor
        migrationContractAddress ?? LPToken.address
    )) as Provider;

    return Provider;
};
