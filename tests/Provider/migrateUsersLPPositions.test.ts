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
import { parseEther } from "ethers/lib/utils";
import {
    EPOCH_1_START_TIME,
    SECONDS_PER_MONTH,
    VEST_DURATION,
} from "../helpers/constants";

chai.use(chaiAsPromised);
const { expect } = chai;

faker.seed(1);

describe("Provider - migrateUsersLPPositions", () => {
    let Deployer: SignerWithAddress;
    let TestUsers: SignerWithAddress[];

    let Token: Token;

    let StakingMaster: StakingMaster;

    let StakingAPI: StakingAPI;

    let TokenAPI: TokenAPI;

    let Provider: Provider;

    let ProviderAPI: ProviderAPI;

    beforeEach(async () => {
        [Deployer, ...TestUsers] = await ethers.getSigners();

        ({
            StakingMaster: { StakingAPI, StakingMaster },
            Token: { Token, TokenAPI },
            Provider: { Provider, ProviderAPI },
        } = await createAPI(Deployer, true, Deployer.address));
    });

    it("should save the same details when migrating an LP position, compared to calling the addLiquidity function", async () => {
        const testAmount = parseEther("5");
        const TestUser = TestUsers[0];
        await ProviderAPI.migrateUsersLPPositions([
            {
                _amount: testAmount,
                _user: Deployer.address,
                _bonusRewardMultiplier: 0,
            },
        ]);

        await ProviderAPI.addLiquidity(testAmount, TestUser);

        const { lastClaimedTimestamp, ...expectedState } =
            await ProviderAPI.returnUserState(TestUser.address);

        const { lastClaimedTimestamp: _, ...migrateState } =
            await ProviderAPI.returnUserState(Deployer.address);

        expect(expectedState).eql(migrateState);

        const migratedInvestmentTotal =
            await Provider.returnUsersInvestmentTotal(Deployer.address);
        const expectedInvestmentTotal =
            await Provider.returnUsersInvestmentTotal(TestUser.address);

        expect(expectedInvestmentTotal.toString()).eq(
            migratedInvestmentTotal.toString()
        );

        const {
            shareTotal: migrateShareTotal,
            currentInvestmentTotal: migrateCurrentInvestmentTotal,
        } = await Provider.returnUsersEpochTotals(1, Deployer.address);
        const {
            shareTotal: expectedShareTotal,
            currentInvestmentTotal: expectedCurrentInvestmentTotal,
        } = await Provider.returnUsersEpochTotals(1, TestUser.address);

        assertionWithRangeForBigNumber(expectedShareTotal, migrateShareTotal);

        expect(expectedCurrentInvestmentTotal.toString()).eq(
            migrateCurrentInvestmentTotal.toString()
        );
    });

    it("should save all the test users details correctly", async () => {
        const Users = TestUsers;
        const migrateArgs: MigrateArgs[] = Users.map((user, idx) => ({
            _amount: parseEther(faker.datatype.number(30).toString()),
            _bonusRewardMultiplier: 5,
            _user: user.address,
        }));

        const currentTime = await returnCurrentHardhatTime();

        await ProviderAPI.migrateUsersLPPositions(migrateArgs);

        let expectedShareTotal = BigNumber.from(0);
        let expectedCurrentInvestmentTotal = BigNumber.from(0);

        await Promise.all(
            migrateArgs.map(async (args) => {
                const {
                    lastEpochLiquidityWithdrawn,
                    lastLiquidityAddedEpochReference,
                    rewardMultiplier,
                    bonusRewardMultiplier,
                    lastClaimedTimestamp,
                    lastEpochUpdate,
                } = await ProviderAPI.returnUserState(args._user);

                expect({
                    lastEpochLiquidityWithdrawn,
                    lastLiquidityAddedEpochReference,
                    rewardMultiplier,
                    bonusRewardMultiplier,
                    lastEpochUpdate,
                }).eql({
                    lastEpochLiquidityWithdrawn: 1,
                    lastLiquidityAddedEpochReference: 1,
                    rewardMultiplier: 5,
                    bonusRewardMultiplier: 5,
                    lastEpochUpdate: 1,
                });

                assertionWithRange(currentTime, lastClaimedTimestamp);

                const usersInvestmentTotal =
                    await Provider.returnUsersInvestmentTotal(args._user);

                expect(usersInvestmentTotal.toString()).eq(args._amount);

                const epochTotal = await Provider.returnUsersEpochTotals(
                    1,
                    args._user
                );

                expect(args._amount).eq(
                    epochTotal.currentInvestmentTotal.toString()
                );
                assertionWithRangeForBigNumber(
                    args._amount,
                    epochTotal.shareTotal
                );

                expectedShareTotal = expectedShareTotal.add(
                    epochTotal.shareTotal
                );

                expectedCurrentInvestmentTotal =
                    expectedCurrentInvestmentTotal.add(
                        epochTotal.currentInvestmentTotal
                    );
            })
        );

        const { shareTotal, currentInvestmentTotal, allPrevInvestmentTotals } =
            await Provider.epochAmounts(1);

        expect(allPrevInvestmentTotals.toNumber()).eq(0);

        expect(expectedShareTotal.toString()).eq(shareTotal.toString());
        expect(expectedCurrentInvestmentTotal.toString()).eq(
            currentInvestmentTotal.toString()
        );
    });
});

describe("Provider - migrateUsersLPPositions - addLiquidity", () => {
    let Deployer: SignerWithAddress;
    let TestUsers: SignerWithAddress[];

    let Token: Token;

    let StakingMaster: StakingMaster;

    let StakingAPI: StakingAPI;

    let TokenAPI: TokenAPI;

    let Provider: Provider;

    let ProviderAPI: ProviderAPI;

    beforeEach(async () => {
        [Deployer, ...TestUsers] = await ethers.getSigners();

        ({
            StakingMaster: { StakingAPI, StakingMaster },
            Token: { Token, TokenAPI },
            Provider: { Provider, ProviderAPI },
        } = await createAPI(Deployer, true, Deployer.address));
    });

    it("should migrate the users position and if the user adds more liquidity the values should update correctly", async () => {
        const addAmount = parseEther("3");
        await ProviderAPI.migrateUsersLPPositions([
            {
                _amount: addAmount,
                _user: Deployer.address,
                _bonusRewardMultiplier: 3,
            },
        ]);

        await fastForward(VEST_DURATION / 2);

        await ProviderAPI.addLiquidity(addAmount);

        const {
            lastEpochLiquidityWithdrawn,
            lastLiquidityAddedEpochReference,
            rewardMultiplier,
            bonusRewardMultiplier,
            lastEpochUpdate,
        } = await ProviderAPI.returnUserState(Deployer.address);

        expect({
            lastEpochLiquidityWithdrawn,
            lastLiquidityAddedEpochReference,
            rewardMultiplier,
            bonusRewardMultiplier,
            lastEpochUpdate,
        }).eql({
            lastEpochLiquidityWithdrawn: 1,
            lastLiquidityAddedEpochReference: 1,
            rewardMultiplier: 3,
            bonusRewardMultiplier: 3,
            lastEpochUpdate: 1,
        });

        const { currentInvestmentTotal, shareTotal } =
            await Provider.returnUsersEpochTotals(1, Deployer.address);

        expect(currentInvestmentTotal.toString()).eq(
            addAmount.mul(2).toString()
        );

        // The expected amount is addAmount * 1.5, because the same amount was added again midway through the epoch
        assertionWithRangeForBigNumber(
            addAmount.add(addAmount.div(2)),
            shareTotal,
            0.1
        );
    });
});

describe("Provider - migrateUsersLPPositions - claimRewards (original epoch start time)", () => {
    let Deployer: SignerWithAddress;
    let TestUsers: SignerWithAddress[];

    let Token: Token;

    let StakingMaster: StakingMaster;

    let StakingAPI: StakingAPI;

    let TokenAPI: TokenAPI;

    let Provider: Provider;

    let ProviderAPI: ProviderAPI;

    beforeEach(async () => {
        [Deployer, ...TestUsers] = await ethers.getSigners();

        ({
            StakingMaster: { StakingAPI, StakingMaster },
            Token: { Token, TokenAPI },
            Provider: { Provider, ProviderAPI },
        } = await createAPI(
            Deployer,
            true,
            Deployer.address,
            EPOCH_1_START_TIME
        ));

        await ProviderAPI.skipEpoch();
    });

    it("should migrate the users position and allow rewards to be claimed", async () => {
        const duration = 12;
        await ProviderAPI.migrateUsersLPPositions([
            {
                _amount: parseEther(faker.datatype.number(30).toString()),
                _user: Deployer.address,
                _bonusRewardMultiplier: 0,
            },
        ]);

        await fastForward(SECONDS_PER_MONTH);

        await Provider.claimRewards(true, duration);

        const [validStake] = await StakingMaster.returnUsersStakes(
            Deployer.address
        );

        const stakingState = await StakingAPI.returnStaking(validStake);

        await fastForward(returnEntireVestAndStakeDuration(duration));

        await StakingMaster.claimRewards(validStake);

        expect((await TokenAPI.myBalance()).toString()).eq(
            stakingState.totalLocked
        );
    });

    it("should migrate the users position and allow a stake to be added to multiple times", async () => {
        const duration = 12;

        await ProviderAPI.migrateUsersLPPositions([
            {
                _amount: parseEther(faker.datatype.number(30).toString()),
                _user: Deployer.address,
                _bonusRewardMultiplier: 0,
            },
        ]);

        // Claim rewards twice
        await fastForward(SECONDS_PER_MONTH);

        await Provider.claimRewards(true, duration);

        let usersStakes = await StakingMaster.returnUsersStakes(
            Deployer.address
        );

        const beforeState = await StakingAPI.returnStaking(usersStakes[0]);

        await fastForward(SECONDS_PER_MONTH);

        await Provider.claimRewards(true, duration);

        usersStakes = await StakingMaster.returnUsersStakes(Deployer.address);

        expect(usersStakes.length).eq(1);

        const stakingState = await StakingAPI.returnStaking(usersStakes[0]);

        if (!stakingState.totalLocked.gt(beforeState.totalLocked)) {
            throw new AssertionError(
                `expected ${stakingState.totalLocked.toString()} to be less than ${beforeState.totalLocked.toString()}`
            );
        }

        await fastForward(returnEntireVestAndStakeDuration(duration));

        await StakingMaster.claimRewards(usersStakes[0]);

        expect((await TokenAPI.myBalance()).toString()).eq(
            stakingState.totalLocked
        );

        expect((await StakingMaster.investedTotal()).toNumber()).eq(0);
    });

    it("should add the bonus reward multiplier to a users LP position if they have their position re-created", async () => {
        await ProviderAPI.migrateUsersLPPositions([
            {
                _amount: parseEther(faker.datatype.number(30).toString()),
                _user: Deployer.address,
                _bonusRewardMultiplier: 10,
            },
        ]);

        await ProviderAPI.skipEpoch();

        await Provider.claimRewards(false, 12);

        assertionWithRange(
            parseFloatWithFormatEthers(await TokenAPI.myBalance()),
            1200
        );
    });

    it("should cap the reward multiplier to 10x even when migrating a position with a bonusRewardMultiplier greater than 10", async () => {
        await ProviderAPI.migrateUsersLPPositions([
            {
                _amount: parseEther(faker.datatype.number(30).toString()),
                _user: Deployer.address,
                _bonusRewardMultiplier: 20,
            },
        ]);

        await ProviderAPI.skipEpoch();

        await Provider.claimRewards(false, 12);

        assertionWithRange(
            parseFloatWithFormatEthers(await TokenAPI.myBalance()),
            1200
        );
    });

    it("should sum the bonus correctly when providing a bonus reward multiplier and the user has invested their LP tokens for 5 epochs", async () => {
        await ProviderAPI.migrateUsersLPPositions([
            {
                _amount: parseEther(
                    faker.datatype.number({ max: 30, min: 1 }).toString()
                ),
                _user: Deployer.address,
                _bonusRewardMultiplier: 5,
            },
        ]);

        await ProviderAPI.skipEpoch(5);

        await Provider.claimRewards(false, 12);

        await TokenAPI.resetBalance();

        await ProviderAPI.skipEpoch();

        await Provider.claimRewards(false, 12);

        assertionWithRange(
            parseFloatWithFormatEthers(await TokenAPI.myBalance()),
            1200
        );
    });

    it("should only apply the bonus from the reward multiplier when a user removes liquidity after a few epochs", async () => {
        const amount = parseEther("10");
        await ProviderAPI.migrateUsersLPPositions([
            {
                _amount: amount,
                _user: Deployer.address,
                _bonusRewardMultiplier: 5,
            },
        ]);

        await ProviderAPI.skipEpoch(5);
        await Provider.claimRewards(false, 12);

        await TokenAPI.resetBalance();

        await Provider.removeLiquidity(amount.div(2));

        await ProviderAPI.skipEpoch();
        await Provider.claimRewards(false, 12);

        // 600 + 50%
        assertionWithRange(
            parseFloatWithFormatEthers(await TokenAPI.myBalance()),
            900
        );
    });
});
