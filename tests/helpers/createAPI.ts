import deployAuroxToken from "./deployToken";
import deployStakingMaster from "./deployStakingMaster";
import createStakingAPI, {
    StakingBinding,
} from "./api/StakingAPI/createStakingAPI";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import setup from "./api/setup";
import createTokenAPI, { TokenBinding } from "./api/TokenAPI/createTokenAPI";
import deployLiquidityProvider from "./deployLiquidityProvider";
import createProviderAPI, {
    ProviderBinding,
} from "./api/ProviderAPI/createProviderAPI";
import { IERC20 } from "../../types/typechain";

export interface API {
    Token: TokenBinding;
    StakingMaster: StakingBinding;
    Provider: ProviderBinding;
    LPToken: IERC20;
}

export default async (
    User: SignerWithAddress,
    providerAddress?: string | boolean,
    migrationContractAddress?: string,
    overrideEpochStartTime?: number
): Promise<API> => {
    const Token = await deployAuroxToken();

    const StakingMaster = await deployStakingMaster(Token);

    const LPToken = await deployAuroxToken();

    const Provider = await deployLiquidityProvider(
        LPToken,
        Token,
        StakingMaster,
        migrationContractAddress,
        overrideEpochStartTime
    );

    if (providerAddress === true) {
        await StakingMaster.setProviderAddress(Provider.address);
    } else if (providerAddress) {
        await StakingMaster.setProviderAddress(providerAddress);
    }

    await setup(Token, StakingMaster, Provider);

    return {
        StakingMaster: createStakingAPI(Token, StakingMaster, User),
        Token: createTokenAPI(User, Token),
        Provider: createProviderAPI(LPToken, Provider, User),
        LPToken,
    };
};
