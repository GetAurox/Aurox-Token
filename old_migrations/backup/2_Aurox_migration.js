const uniSwapAddress = "0x82C01fEac95776e099530a81fEdE18265229319a";
const teamRewardAddress = "0x82C01fEac95776e099530a81fEdE18265229319a";
const exchangeListingReserve = "0x82C01fEac95776e099530a81fEdE18265229319a";
const reservesAddress = "0x82C01fEac95776e099530a81fEdE18265229319a";

const AuroxToken = artifacts.require("../contracts/Token/AuroxToken.sol");

const returnEthPrice = require("./helpers/returnEthPrice");
const returnEthAmount = require("./helpers/returnEthAmount");

const StakingMaster = artifacts.require(
    "../contracts/StakingMaster/StakingMaster.sol"
);

const Provider = artifacts.require("../contracts/Provider/Provider.sol");

const UniSwapRouter = artifacts.require(
    "../contracts/Uniswap/IUniswapV2Router02.sol"
);
const UniSwapFactory = artifacts.require(
    "../contracts/Uniswap/IUniswapV2Factory.sol"
);

const mainnet = "0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95";
const goerli = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

const uniSwapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const wethAddress = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6";

module.exports = async function (deployer, network, accounts) {
    // Deploy the aurox token
    await deployer.deploy(
        AuroxToken,
        uniSwapAddress,
        teamRewardAddress,
        exchangeListingReserve,
        reservesAddress
    );

    const epochStart = Math.round(new Date().getTime() / 1000);
    // Grab the aurox token contract
    const AuroxTokenContract = await AuroxToken.deployed();

    // Approve the amount for setting up the liquidity pool
    await AuroxTokenContract.approve(uniSwapRouter, web3.utils.toWei("1"));

    const UniSwapRouterContract = await UniSwapRouter.at(uniSwapRouter);

    const ethPrice = await returnEthPrice();
    const ethAmount = returnEthAmount(ethPrice);

    await UniSwapRouterContract.addLiquidityETH(
        AuroxTokenContract.address,
        web3.utils.toWei("1"),
        web3.utils.toWei("1"),
        web3.utils.toWei(ethAmount.toString()),
        accounts[0],
        epochStart + 3600,
        { value: web3.utils.toWei(ethAmount.toString()) }
    );

    // Get the uniswap factory and the associated pair address
    const UniSwapFactoryContract = await UniSwapFactory.at(goerli);

    // Grab the uniswap pair address
    const UniSwapPairAddress = await UniSwapFactoryContract.getPair(
        wethAddress,
        AuroxTokenContract.address
    );

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
        UniSwapPairAddress,
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
