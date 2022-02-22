pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IStakingMaster.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// This contract contains a number of time-sensitive actions, it is widely known that time-sensitive actions can be manipulated by the miners reporting of time. This is not believed to be an issue within these contracts because it is dealing only with large time increments (weeks/months) and a miner can only influence the time reporting by ~15 seconds. It is accepted that time dependence events are allowed if they can vary by roughly 15 seconds and still maintain integrity.

contract StakingMaster is IStakingMaster, Context, Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    using SafeERC20 for IERC20;

    IERC20 private auroxToken;

    address private providerAddress;

    // Store the static to prevent re-calculation's later on
    uint256 private secondsPerMonth = 2629746;

    // uint256 private secondsInAFortnight = secondsPerMonth / 2;

    // Keep track of the total invested amount
    uint256 public investedTotal = 0;

    uint256 private epochStart;

    // Make this a uint160 so its compatible with the address conversion
    uint160 public localCreationCount = 0;

    uint256 public poolRewardsTotal = 0;

    mapping(address => Staking) public staking;

    mapping(address => address[]) private userInvestments;

    // If the user accidentally transfers ETH into the contract, revert the transfer
    fallback() external payable {
        revert();
    }

    event CreateStaking(
        address indexed _from,
        address stakeAddress,
        uint256 _stakeEndTime,
        uint256 _amount
    );

    event AddToStake(address indexed stakeAddress, uint256 _amount);

    event ClaimRewards(
        address indexed _from,
        address indexed stakeAddress,
        uint256 _claimableAmount,
        uint256 _claimablePoolRewards
    );

    event CloseStaking(
        address indexed _from,
        address stakeAddress,
        uint256 _claimAmount,
        uint256 _penaltyAmount
    );

    event UpdateProviderAddress(address indexed _newAddress);

    modifier onlyStakeOwner(address _stakingAddress) {
        require(
            _stakingAddress != address(0x0),
            "StakingMaster: Staking address can't be the 0 address"
        );

        address[] memory usersStakes = userInvestments[_msgSender()];

        address foundStake;

        for (uint8 index = 0; index < usersStakes.length; index++) {
            if (usersStakes[index] == _stakingAddress) {
                foundStake = usersStakes[index];
            }
        }

        require(
            foundStake != address(0),
            "StakingMaster: User doesn't own the stake"
        );

        _;
    }

    constructor(address _auroxAddress, uint256 _epochStart) {
        auroxToken = IERC20(_auroxAddress);
        epochStart = _epochStart;
    }

    /**
        @dev Allows the owner to set the provider address for checking if interactions are from the provider. Allow this to be overwritten in case of redeployments
        @param _providerAddress The contract address of the provider
     */
    function setProviderAddress(address _providerAddress)
        external
        nonReentrant
        onlyOwner
    {
        providerAddress = _providerAddress;

        emit UpdateProviderAddress(_providerAddress);
    }

    // Function to return a given user's total stake value including all interest earnt up until the current point
    function returnUsersTotalStakeValue(address _user)
        external
        view
        override
        returns (uint256)
    {
        uint256 totalStakeValue;

        address[] memory usersStakes = userInvestments[_user];

        for (uint8 index = 0; index < usersStakes.length; index++) {
            uint256 currentStakeValue = returnCurrentStakeValue(
                usersStakes[index]
            );

            totalStakeValue = totalStakeValue.add(currentStakeValue);
        }

        return totalStakeValue;
    }

    // This function is intended to be called by the provider contract when the provider contract is adding rewards to a stake. It takes in a user's address as a parameter and returns a "valid" stake; a stake that is in progress and was created by the provider previously.
    function returnValidUsersProviderStake(address _user)
        external
        view
        override
        returns (address)
    {
        address[] memory usersStakes = userInvestments[_user];

        for (uint8 index = 0; index < usersStakes.length; index++) {
            address currentStake = usersStakes[index];
            if (
                staking[currentStake].providerStake == true &&
                staking[currentStake].stakeEndTime > block.timestamp
            ) {
                return usersStakes[index];
            }
        }
        // If no valid stakes found
        return address(0);
    }

    // Returns the interest percentage that a user is entitled to, based on the parameters
    function returnInterestPercentage(
        uint256 _duration,
        bool _epochOne,
        bool _fromStakingContract
    ) public view returns (uint256) {
        uint256 interestRate;
        uint256 maxInterestRate = uint256(20 ether).div(100);
        // Convert the duration into the proper base so the returned interest value has 18 decimals and 1e18 = 100%
        uint256 updatedDuration = _duration.mul(uint256(1 ether).div(100));

        // Calculate the initial interest rate as the months / 2
        interestRate = updatedDuration.div(2);

        // If the interest rate exceeds 20% set it to 20%
        if (interestRate > maxInterestRate) {
            interestRate = maxInterestRate;
        }

        if (_epochOne && _duration >= 12) {
            // If the amount is from epoch 1 then add 50% to the APY
            interestRate = interestRate.add(interestRate.div(2));
        } else if (_fromStakingContract) {
            // If the amount is from the liquidity contract then add 25% to the APY
            interestRate = interestRate.add(interestRate.div(4));
        }

        return interestRate;
    }

    // Return the simple interest based on the given parameters
    function returnSimpleInterest(
        uint256 _amount,
        uint256 _interest,
        uint256 _duration
    ) public view returns (uint256) {
        // Divide by 1 ether to remove the added decimals from multiplying the interest with 18 decimals by the amount with 18 decimals
        return
            _amount.add(
                _interest
                    .mul(_amount)
                    .div(1 ether)
                    .mul(_duration)
                    .div(secondsPerMonth)
                    .div(uint256(12))
            );
    }

    // Return the compound interest based on the given parameters
    function returnCompoundInterest(
        uint256 _amount,
        uint256 _interest,
        uint256 _duration
    ) public view returns (uint256) {
        // Store this constant divider value so it doesn't get recomputed each loop
        uint256 divider = uint256(1 ether).mul(uint256(12));
        // Calculate the compound interest over all complete months
        for (uint256 i = 0; i < _duration.div(secondsPerMonth); i++) {
            // Calculate the simple interest for the entire year then divide by 12 (The number of times compounding per year)
            _amount = _amount.add(_interest.mul(_amount).div(divider));
        }

        uint256 leftOverMonthSeconds = _duration.mod(secondsPerMonth);
        // Calculate the interest for the last left-over month
        if (leftOverMonthSeconds > 0) {
            // Calculates the interest for the left-over incomplete  month: interest * amount * (leftOverSeconds/secondsPerMonth) / 12
            _amount = _amount.add(
                _interest
                    .mul(_amount)
                    .div(1 ether)
                    .mul(leftOverMonthSeconds)
                    .div(secondsPerMonth)
                    .div(uint256(12))
            );
        }
        return _amount;
    }

    // Function to delegate the call to either a simple interest calculation or compound depending on the compounding parameter
    function returnTotalInterestAmount(
        uint256 _durationInSeconds,
        uint256 _interestRate,
        uint256 _amount,
        bool compounding
    ) public view returns (uint256) {
        if (compounding) {
            uint256 total = returnCompoundInterest(
                _amount,
                _interestRate,
                _durationInSeconds
            );
            return total.sub(_amount);
        } else {
            uint256 total = returnSimpleInterest(
                _amount,
                _interestRate,
                _durationInSeconds
            );
            return total.sub(_amount);
        }
    }

    // Create a stake for the user given the parameters
    function createStaking(
        uint256 _amount,
        uint256 _duration,
        address _recipient
    ) external override nonReentrant {
        require(_amount > 0, "Amount to create stake must be greater than 0");
        require(_duration > 0, "Duration must be longer than 0 months");
        require(
            _duration <= 84,
            "Duration must be less than or equal to 7 years"
        );
        require(
            _recipient != address(0x0),
            "Recipient address can't be the 0x0 address"
        );

        bool _fromProviderContract = false;

        // If the sender was the provider contract then give the interest rate boost
        if (_msgSender() == providerAddress) {
            _fromProviderContract = true;
        }

        bool _epochOne = false;

        // If the current time is within the first epoch and the amount came from the provider contract
        if (
            block.timestamp <= epochStart.add(14 days) && _fromProviderContract
        ) {
            _epochOne = true;
        }

        // The expected interest rate for the user
        uint256 interestRate = returnInterestPercentage(
            _duration,
            _epochOne,
            _fromProviderContract
        );

        bool compounding = true;

        // If the duration is less than 12 months then it is not compounding
        if (_duration < 12) {
            compounding = false;
        }

        // The entire staking duration in seconds
        uint256 durationInSeconds = _duration.mul(secondsPerMonth);
        // The total earned interest on the stake
        uint256 interest = returnTotalInterestAmount(
            durationInSeconds,
            interestRate,
            _amount,
            compounding
        );

        if (_fromProviderContract == false) {
            // Do this in this manner so you don't need to check for math underflows
            // Add the interest amount to the public funds balance
            uint256 auroxBalance = auroxToken.balanceOf(address(auroxToken));

            require(
                auroxBalance >= uint256(30000 ether).add(interest),
                "Balance of Aurox Token must be greater than 30k"
            );
        }

        uint256 totalLocked = _amount.add(interest);

        localCreationCount = localCreationCount + 1;

        address vestingContract = address(localCreationCount);

        // Increase the overall invested total to include the additional amount + interest
        investedTotal = investedTotal.add(totalLocked);

        // Transfer the user's investment amount into the vesting contract, or transfer it from the public funds it the creator is the provider contract
        if (_fromProviderContract) {
            auroxToken.safeTransferFrom(
                address(auroxToken),
                address(this),
                totalLocked
            );
        } else {
            auroxToken.safeTransferFrom(_msgSender(), address(this), _amount);

            auroxToken.safeTransferFrom(
                address(auroxToken),
                address(this),
                interest
            );
        }

        uint256 stakeEndTime = block.timestamp.add(durationInSeconds);

        // Create the staking master struct to include the additional data
        staking[vestingContract] = Staking(
            _amount,
            stakeEndTime,
            interestRate,
            block.timestamp,
            compounding,
            _amount,
            block.timestamp,
            _fromProviderContract,
            0,
            false,
            totalLocked
        );

        // Add the created vesting contract to the user's investment mapping
        userInvestments[_recipient].push(vestingContract);
        // Emit event for creation if required
        emit CreateStaking(
            _msgSender(),
            vestingContract,
            stakeEndTime,
            _amount
        );
    }

    function saveRecreateStakeDetails(
        RecreateStakeArgs calldata recreateStakeArgs
    ) private {
        investedTotal = investedTotal.add(recreateStakeArgs._balance);

        localCreationCount = localCreationCount + 1;

        address vestingContract = address(localCreationCount);

        staking[vestingContract] = Staking(
            recreateStakeArgs._investedAmount,
            recreateStakeArgs._stakeEndTime,
            recreateStakeArgs._interestRate,
            recreateStakeArgs._lastUpdate,
            recreateStakeArgs._compounded,
            recreateStakeArgs._rawInvestedAmount,
            recreateStakeArgs._stakeStartTime,
            recreateStakeArgs._providerStake,
            0,
            false,
            recreateStakeArgs._balance
        );

        userInvestments[recreateStakeArgs._recipient].push(vestingContract);

        // Emit event for creation
        emit CreateStaking(
            _msgSender(),
            vestingContract,
            recreateStakeArgs._stakeEndTime,
            recreateStakeArgs._rawInvestedAmount
        );
    }

    function batchRecreateStake(RecreateStakeArgs[] calldata recreateStakeArgs)
        external
        override
        nonReentrant
        onlyOwner
    {
        uint256 transferTotal;

        for (uint8 i = 0; i < recreateStakeArgs.length; i++) {
            saveRecreateStakeDetails(recreateStakeArgs[i]);
            transferTotal += recreateStakeArgs[i]._balance;
        }

        auroxToken.safeTransferFrom(_msgSender(), address(this), transferTotal);
    }

    function recreateStake(RecreateStakeArgs calldata recreateStakeArgs)
        external
        override
        nonReentrant
        onlyOwner
    {
        saveRecreateStakeDetails(recreateStakeArgs);

        auroxToken.safeTransferFrom(
            _msgSender(),
            address(this),
            recreateStakeArgs._balance
        );
    }

    function addToStake(address _stakingAddress, uint256 _amount)
        external
        override
        nonReentrant
    {
        require(
            _stakingAddress != address(0x0),
            "Staking address can't be the 0x0 address"
        );
        require(
            _amount > 0,
            "Amount must be greater than 0 when adding to a stake"
        );

        require(
            _msgSender() == providerAddress,
            "Only the Provider contract can add to a stake"
        );

        Staking storage stakingContract = staking[_stakingAddress];

        require(
            stakingContract.providerStake,
            "StakingMaster: To add to a stake it must be a provider stake"
        );
        require(
            stakingContract.stakeEndTime > block.timestamp,
            "StakingMaster: Staking contract has finished"
        );
        // Calculate seconds left in the stake, so that the interest calculation isn't from the start of the stake and is from now
        uint256 secondsLeft = stakingContract.stakeEndTime.sub(block.timestamp);

        // The expected interest for the additional amount
        uint256 interest = returnTotalInterestAmount(
            secondsLeft,
            stakingContract.interestRate,
            _amount,
            stakingContract.compounded
        );

        uint256 totalAddedToLocked = _amount.add(interest);

        uint256 timeElapsedSinceLastUpdate = block.timestamp.sub(
            stakingContract.lastUpdate
        );

        // Calculate the earned interest up to now.
        uint256 currentInterestAmount = returnTotalInterestAmount(
            timeElapsedSinceLastUpdate,
            stakingContract.interestRate,
            stakingContract.investedAmount,
            stakingContract.compounded
        );

        // Add the new amount to the invested total + the expected interest on that additional amount
        investedTotal = investedTotal.add(totalAddedToLocked);

        // Update the user's invested amount to include interest up to now + the new amount. This simplifies calculating interest later on.
        stakingContract.investedAmount = stakingContract.investedAmount.add(
            _amount.add(currentInterestAmount)
        );

        // Used to calculate the stake value later on
        stakingContract.lastUpdate = block.timestamp;
        // Add the raw value to the amount
        stakingContract.rawInvestedAmount = stakingContract
            .rawInvestedAmount
            .add(_amount);

        stakingContract.totalLocked = stakingContract.totalLocked.add(
            totalAddedToLocked
        );

        auroxToken.safeTransferFrom(
            address(auroxToken),
            address(this),
            totalAddedToLocked
        );

        emit AddToStake(_stakingAddress, _amount);
    }

    function returnStakeState(address _stakingAddress)
        external
        view
        override
        returns (
            uint256 currentStakeValue,
            uint256 stakeEndTime,
            uint256 interestRate,
            uint256 lastUpdate,
            bool compounding,
            uint256 rawInvestedAmount,
            uint256 stakeStartTime
        )
    {
        Staking memory stake = staking[_stakingAddress];

        // Return the current stake value including interest up until this point
        uint256 stakesValue = returnCurrentStakeValue(_stakingAddress);
        return (
            stakesValue,
            stake.stakeEndTime,
            stake.interestRate,
            stake.lastUpdate,
            stake.compounded,
            stake.rawInvestedAmount,
            stake.stakeStartTime
        );
    }

    // Return all the user's created Staking Contracts
    function returnUsersStakes(address _user)
        external
        view
        override
        returns (address[] memory usersStakes)
    {
        return userInvestments[_user];
    }

    // The alternative to this loop is creating a mapping of indexes and an array of addresses. This allows fetching the stakes index directly without looping. But to enable that you must write and delete an additional time, this increases the gas cost more than this loop.
    function removeUsersStake(address stakeToRemove) private {
        address[] memory usersStakes = userInvestments[_msgSender()];
        uint8 index = 0;
        // Interate over each stake to find the matching one
        for (uint256 i = 0; i < usersStakes.length; i++) {
            if (usersStakes[i] == stakeToRemove) {
                index = uint8(i);
                break;
            }
        }
        // If the stake is found update the array
        if (usersStakes.length > 1) {
            userInvestments[_msgSender()][index] = usersStakes[
                usersStakes.length - 1
            ];
        }
        // Remove last item
        userInvestments[_msgSender()].pop();
    }

    // Function to return the staked value including all generated interest up until the now
    function returnCurrentStakeValue(address _stakingAddress)
        public
        view
        override
        returns (uint256)
    {
        Staking memory stake = staking[_stakingAddress];
        uint256 timeElapsedSinceLastUpdate;

        // If the stake is complete
        if (stake.stakeEndTime < block.timestamp) {
            timeElapsedSinceLastUpdate = stake.stakeEndTime.sub(
                stake.lastUpdate
            );
        } else {
            timeElapsedSinceLastUpdate = block.timestamp.sub(stake.lastUpdate);
        }

        uint256 interest = returnTotalInterestAmount(
            timeElapsedSinceLastUpdate,
            stake.interestRate,
            stake.investedAmount,
            stake.compounded
        );

        return stake.investedAmount.add(interest);
    }

    function returnStakesClaimablePoolRewards(address _stakingAddress)
        public
        view
        override
        returns (uint256)
    {
        Staking memory stakingContract = staking[_stakingAddress];

        // If the user has claimed pool rewards before
        if (stakingContract.poolRewardsClaimed) {
            return 0;
        }

        // The user's share of the pool rewards
        return
            poolRewardsTotal.mul(stakingContract.totalLocked).div(
                investedTotal
            );
    }

    // This function returns a user's total claimable reward amount for any given time
    function returnStakesClaimableRewards(address _stakingAddress)
        public
        view
        override
        returns (uint256)
    {
        Staking memory stakingContract = staking[_stakingAddress];

        // If the vesting hasn't started yet, vesting starts when the stake completes
        if (stakingContract.stakeEndTime > block.timestamp) {
            return 0;
        }

        uint256 vestingDuration = secondsPerMonth.div(2);

        uint256 vestingEndTime = stakingContract.stakeEndTime.add(
            vestingDuration
        );

        // If the vesting duration is complete return the amount - the amount that has been already released
        if (block.timestamp >= vestingEndTime) {
            return stakingContract.totalLocked.sub(stakingContract.released);
        }

        return
            (
                (
                    stakingContract.totalLocked.mul(
                        (block.timestamp.sub(stakingContract.stakeEndTime))
                    )
                ).div(vestingDuration)
            ).sub(stakingContract.released);
    }

    // Function to claim rewards for a user, it releases the funds from the Vesting contract and calculates the user's share of the pool rewards
    function claimRewards(address _stakingAddress)
        external
        override
        nonReentrant
        onlyStakeOwner(_stakingAddress)
    {
        Staking storage stakingContract = staking[_stakingAddress];

        require(
            stakingContract.stakeEndTime < block.timestamp,
            "StakingMaster: Stake is still in progress"
        );

        uint256 claimablePoolRewards = 0;

        if (!stakingContract.poolRewardsClaimed) {
            // Pool rewards calculation here
            claimablePoolRewards = returnStakesClaimablePoolRewards(
                _stakingAddress
            );

            stakingContract.poolRewardsClaimed = true;

            // Remove the user's amount from the investedTotal and from the poolRewardsTotal
            investedTotal = investedTotal.sub(stakingContract.totalLocked);

            poolRewardsTotal = poolRewardsTotal.sub(claimablePoolRewards);
        }

        uint256 claimableAmount = returnStakesClaimableRewards(_stakingAddress);

        stakingContract.released = stakingContract.released.add(
            claimableAmount
        );

        // If the user doesn't have additional rewards to claim from the vesting contract, delete it from the array and delete the struct
        if (stakingContract.released == stakingContract.totalLocked) {
            removeUsersStake(_stakingAddress);
            // Delete the struct item
            delete staking[_stakingAddress];
        }

        auroxToken.safeTransfer(_msgSender(), claimableAmount);
        if (!stakingContract.poolRewardsClaimed && claimablePoolRewards > 0) {
            auroxToken.safeTransfer(_msgSender(), claimablePoolRewards);
        }

        emit ClaimRewards(
            _msgSender(),
            _stakingAddress,
            claimableAmount,
            claimablePoolRewards
        );
    }

    // This function calculates how much the user is entitled to when a stake is closed early
    function returnClaimAmountForEarlyStakeClose(address _stakingAddress)
        public
        view
        returns (uint256)
    {
        Staking memory stake = staking[_stakingAddress];

        uint256 incompleteStakeTime = stake.stakeEndTime.sub(block.timestamp);

        uint256 stakeTotalTime = stake.stakeEndTime.sub(stake.stakeStartTime);

        uint256 penaltyTotal = stake
            .rawInvestedAmount
            .mul(incompleteStakeTime)
            .div(stakeTotalTime)
            .div(2);

        // Return the raw amount and subtract the penalty total
        return stake.rawInvestedAmount.sub(penaltyTotal);
    }

    // Close the staking contract with penalties
    function closeStake(address _stakingAddress)
        external
        override
        nonReentrant
        onlyStakeOwner(_stakingAddress)
    {
        Staking storage stakingContract = staking[_stakingAddress];
        // Require that the staking contract hasn't ended
        require(
            stakingContract.stakeEndTime > block.timestamp,
            "Staking contract has finished"
        );

        investedTotal = investedTotal.sub(stakingContract.totalLocked);

        // Calculate what the user is owed
        uint256 claimAmount = returnClaimAmountForEarlyStakeClose(
            _stakingAddress
        );

        uint256 penaltyAmount = stakingContract.totalLocked.sub(claimAmount);

        poolRewardsTotal = poolRewardsTotal.add(penaltyAmount);

        removeUsersStake(_stakingAddress);
        // Delete the item from the array
        delete staking[_stakingAddress];

        // Transfer the amount the user is owed
        auroxToken.safeTransfer(_msgSender(), claimAmount);

        emit CloseStaking(
            _msgSender(),
            _stakingAddress,
            claimAmount,
            penaltyAmount
        );
    }
}
