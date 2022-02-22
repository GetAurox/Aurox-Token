import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import loadConfig from "../helpers/loadConfig";

const func: DeployFunction = async function ({
    deployments: { deploy },
    getUnnamedAccounts,
    network,
}: HardhatRuntimeEnvironment) {
    const { auroxTokenArgs } = loadConfig(network.name);

    console.log("Deploying Contract with these arguments:");
    console.log(auroxTokenArgs);

    const [DeployerAddress] = await getUnnamedAccounts();

    const Deployer = ethers.provider.getSigner(DeployerAddress);

    await deploy("AuroxToken", {
        from: Deployer._address,
        args: [
            auroxTokenArgs.uniSwapAddress,
            auroxTokenArgs.teamRewardAddress,
            auroxTokenArgs.exchangeListingReserve,
            auroxTokenArgs.reservesAddress,
        ],
        log: true,
        autoMine: true,
    });
};
export default func;
func.tags = ["testbed", "_auroxToken"];

// npx hardhat node --hostname 127.0.0.1
