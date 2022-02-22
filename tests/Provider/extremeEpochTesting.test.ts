import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Token } from "../../types/typechain/Token";
import { StakingMaster } from "../../types/typechain/StakingMaster";
import createAPI from "../helpers/createAPI";
import { StakingAPI } from "../helpers/api/StakingAPI/createStakingAPI";
import chaiAsPromised from "chai-as-promised";
import chai, { AssertionError } from "chai";
import {
    fastForward,
    parseFloatWithFormatEthers,
    returnCurrentHardhatTime,
    returnEntireVestAndStakeDuration,
} from "../helpers/common";
import { TokenAPI } from "../helpers/api/TokenAPI/createTokenAPI";
import {
    assertionWithRange,
    assertionWithRangeForBigNumber,
} from "../helpers/assertions";
import faker from "faker";
import { BigNumber } from "ethers";
import { Provider } from "../../types/typechain/Provider";
import {
    MigrateArgs,
    ProviderAPI,
} from "../helpers/api/ProviderAPI/createProviderAPI";
import { formatEther, parseEther } from "ethers/lib/utils";
import {
    EPOCH_1_START_TIME,
    SECONDS_PER_MONTH,
    VEST_DURATION,
} from "../helpers/constants";
import { IERC20 } from "../../types/typechain";

chai.use(chaiAsPromised);
const { expect } = chai;

faker.seed(1);

describe("Provider - extremeEpochTesting", () => {
    let Deployer: SignerWithAddress;
    let TestUsers: SignerWithAddress[];

    let Token: Token;

    let StakingMaster: StakingMaster;

    let StakingAPI: StakingAPI;

    let TokenAPI: TokenAPI;

    let Provider: Provider;

    let ProviderAPI: ProviderAPI;

    let LPToken: IERC20;

    beforeEach(async () => {
        [Deployer, ...TestUsers] = await ethers.getSigners();

        ({
            StakingMaster: { StakingAPI, StakingMaster },
            Token: { Token, TokenAPI },
            Provider: { Provider, ProviderAPI },
            LPToken,
        } = await createAPI(
            Deployer,
            true,
            Deployer.address,
            EPOCH_1_START_TIME
        ));
    });

    it("should allow a user to migrate and then claim rewards after +100 epochs", async () => {
        await ProviderAPI.migrateUsersLPPositions([
            {
                _amount: parseEther(faker.datatype.number(30).toString()),
                _user: Deployer.address,
                _bonusRewardMultiplier: 5,
            },
        ]);

        await ProviderAPI.skipEpoch(110);

        await Provider.claimRewards(false, 0);

        await TokenAPI.resetBalance();

        await ProviderAPI.skipEpoch(5);

        await Provider.claimRewards(false, 0);

        // 1200 * 5
        assertionWithRange(
            parseFloatWithFormatEthers(await TokenAPI.myBalance()),
            6000
        );
    });

    it("should allow a user to migrate and add additional liquidity after 100+ epochs", async () => {
        await ProviderAPI.migrateUsersLPPositions([
            {
                _amount: parseEther(faker.datatype.number(30).toString()),
                _user: Deployer.address,
                _bonusRewardMultiplier: 5,
            },
        ]);

        await ProviderAPI.skipEpoch(110);

        await Provider.claimRewards(false, 0);

        await TokenAPI.resetBalance();

        await ProviderAPI.addLiquidity(parseEther("1"));

        await ProviderAPI.skipEpoch(5);

        await Provider.claimRewards(false, 0);

        // 1200 * 5
        assertionWithRange(
            parseFloatWithFormatEthers(await TokenAPI.myBalance()),
            6000
        );
    });

    it("should allow a user to migrate and remove liquidity after 100+ epochs", async () => {
        const amount = parseEther(faker.datatype.number(30).toString());
        await ProviderAPI.migrateUsersLPPositions([
            {
                _amount: amount,
                _user: Deployer.address,
                _bonusRewardMultiplier: 5,
            },
        ]);

        await ProviderAPI.skipEpoch(110);

        await Provider.claimRewards(false, 0);

        await TokenAPI.resetBalance();

        await Provider.removeLiquidity(amount);

        expect(formatEther(await LPToken.balanceOf(Deployer.address))).eq(
            formatEther(amount)
        );
    });
});
