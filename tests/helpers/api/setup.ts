import { Token } from "../../../types/typechain/Token";
import { StakingMaster } from "../../../types/typechain/StakingMaster";
import { Provider } from "../../../types/typechain/Provider";
import { ethers } from "hardhat";

export default async (
    Token: Token,
    StakingMaster: StakingMaster,
    Provider: Provider
) => {
    await Token.setAllowance(StakingMaster.address);
    await Token.setAllowance(Provider.address);
    await Token.mint(Token.address, ethers.utils.parseUnits("3000000000"));
};
