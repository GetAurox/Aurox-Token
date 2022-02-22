import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import loadConfig from "../helpers/loadConfig";
import { AuroxToken } from "../types/typechain";

const func: DeployFunction = async function ({
    deployments: { deploy },
    getUnnamedAccounts,
    network,
}: HardhatRuntimeEnvironment) {
    const { providerArgs, epochStartTime } = loadConfig(network.name);

    const [DeployerAddress] = await getUnnamedAccounts();

    const Deployer = ethers.provider.getSigner(DeployerAddress);

    const AuroxToken = await ethers.getContractAt(
        "AuroxToken",
        Deployer._address
    );

    const StakingMaster = await ethers.getContractAt(
        "StakingMaster",
        Deployer._address
    );

    await deploy("Provider", {
        from: Deployer._address,
        args: [
            providerArgs.uniSwapTokenAddress,
            AuroxToken.address,
            StakingMaster.address,
            epochStartTime,
            providerArgs.migrationContractAddress,
        ],
        log: true,
        autoMine: true,
    });
};
export default func;
func.tags = ["testbed", "_provider"];

// npx hardhat node --hostname 127.0.0.1
