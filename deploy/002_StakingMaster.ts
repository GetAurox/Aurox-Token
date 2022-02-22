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
    const { epochStartTime } = loadConfig(network.name);

    const [DeployerAddress] = await getUnnamedAccounts();

    const Deployer = ethers.provider.getSigner(DeployerAddress);

    const AuroxToken = await ethers.getContractAt(
        "AuroxToken",
        Deployer._address
    );

    await deploy("StakingMaster", {
        from: Deployer._address,
        args: [AuroxToken.address, epochStartTime],
        log: true,
        autoMine: true,
    });
};
export default func;
func.tags = ["testbed", "_stakingMaster"];

// npx hardhat node --hostname 127.0.0.1
