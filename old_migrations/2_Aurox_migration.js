const uniSwapAddress = "0x82C01fEac95776e099530a81fEdE18265229319a";
const teamRewardAddress = "0x82C01fEac95776e099530a81fEdE18265229319a";
const exchangeListingReserve = "0x82C01fEac95776e099530a81fEdE18265229319a";
const reservesAddress = "0x82C01fEac95776e099530a81fEdE18265229319a";

const AuroxToken = artifacts.require("../contracts/Token/AuroxToken.sol");

module.exports = async function (deployer, network, accounts) {
    // Deploy the aurox token
    await deployer.deploy(
        AuroxToken,
        uniSwapAddress,
        teamRewardAddress,
        exchangeListingReserve,
        reservesAddress
    );
};
