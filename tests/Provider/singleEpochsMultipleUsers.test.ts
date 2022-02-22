import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Token } from "../../types/typechain/Token";
import { StakingMaster } from "../../types/typechain/StakingMaster";
import createAPI from "../helpers/createAPI";
import { StakingAPI } from "../helpers/api/StakingAPI/createStakingAPI";
import chaiAsPromised from "chai-as-promised";
import chai from "chai";
import {
    fastForward,
    parseFloatWithFormatEthers,
    sequentialAsync,
} from "../helpers/common";
import { TokenAPI } from "../helpers/api/TokenAPI/createTokenAPI";
import {
    assertionWithRange,
    assertionWithRangeAndFetchFunction,
    assertionWithRangeForBigNumber,
} from "../helpers/assertions";
import faker from "faker";
import { sumBy } from "lodash";
import { BigNumber, BigNumberish } from "ethers";
import { Provider } from "../../types/typechain/Provider";
import {
    ProviderAPI,
    UserAddedLiquidity,
} from "../helpers/api/ProviderAPI/createProviderAPI";
import { SECONDS_PER_MONTH } from "../helpers/constants";

chai.use(chaiAsPromised);
const { expect } = chai;

faker.seed(1);

describe("Provider - multiple epochs, multiple users ", () => {
    let Users: SignerWithAddress[];

    let Token: Token;

    let StakingMaster: StakingMaster;

    let StakingAPI: StakingAPI;

    let TokenAPI: TokenAPI;

    let Provider: Provider;

    let ProviderAPI: ProviderAPI;

    beforeEach(async () => {
        Users = await ethers.getSigners();

        ({
            StakingMaster: { StakingAPI, StakingMaster },
            Token: { Token, TokenAPI },
            Provider: { Provider, ProviderAPI },
        } = await createAPI(Users[0], true));

        await TokenAPI.resetBalance();
    });
});
