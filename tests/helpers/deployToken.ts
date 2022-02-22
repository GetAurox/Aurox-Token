import { ethers } from "hardhat";
import { Token } from "../../types/typechain/Token";

export default async (): Promise<Token> => {
    const TokenDeployer = await ethers.getContractFactory("Token");

    const Token = (await TokenDeployer.deploy()) as Token;

    return Token;
};
