const StakingMaster = artifacts.require(
    "../contracts/StakingMaster/StakingMaster.sol"
);
const Provider = artifacts.require("../contracts/Provider/Provider.sol");
const AuroxToken = artifacts.require("../contracts/Token/AuroxToken.sol");

const DeployedAuroxAddress = "0x346A5340022b03428846500F63446fa18913970f";
const epochStart = 1614315436;
const uniSwapPairAddress = "0x6f1ef67de537dd7059849c63a9ff8a529cc9cadf";

module.exports = async function (deployer, network, accounts) {
    const AuroxTokenContract = await AuroxToken.at(DeployedAuroxAddress);
    // Deploy the staking master
    await deployer.deploy(
        StakingMaster,
        AuroxTokenContract.address,
        epochStart
    );

    // Get the staking master contract
    const StakingMasterContract = await StakingMaster.deployed();

    // Deploy the provider contract
    await deployer.deploy(
        Provider,
        uniSwapPairAddress,
        AuroxTokenContract.address,
        StakingMasterContract.address,
        epochStart
    );

    // Get the provider contract
    const ProviderContract = await Provider.deployed();

    // Set the provider address on the staking master
    await StakingMasterContract.setProviderAddress(ProviderContract.address);

    // Setup the allowances of the user's
    await AuroxTokenContract.setAllowance(ProviderContract.address);
    await AuroxTokenContract.setAllowance(StakingMasterContract.address);
};
