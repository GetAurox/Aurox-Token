# Deployment

Deploying to a testnet vs a mainnet is a very similar process, the different steps will be highlighted below.

First clone the repo to your computer.

Once the repo is cloned to your computer, run the following command: `npm install`. This was initialize the folder to contain the required modules.

## Deployment Credentials

Now create a file called `secrets.json` in the root location of this directory.

This file must contain two fields inside the json object; projectId and mnemonic.

The `projectId` field is obtained by going to the [infura webpage](https://infura.io/).

Once there create an account and sign in, when you're signed in create a project for Aurox. Once the project is created head to the project settings and find the Keys header, inside there will be a unique project ID. Copy the project ID and place it inside the `secrets.json` file in the projectID field.

The `mnemonic` field is obtained by installing the metamask extension for chrome. Once installed create an account and follow the setup procedure. When that is complete you will need to get your mnemonic from the created metamask account, you can do this by following the instructions [here](https://metamask.zendesk.com/hc/en-us/articles/360015290032-How-to-Reveal-Your-Seed-Phrase).

Now take that `mnemonic` value and paste it into your secrets.json file.

## Goerli Deployment

Goerli is probably one of the best functioning test networks and has been the choice throughout testing. To deploy to this network simply run the following command:

### Goerli Deployment Command

`truffle deploy --network goerli --reset`

## Mainnet Deployment

Deploying to mainnet involves a few additional steps, these steps ensure that the transaction will go through.

To ensure a smooth deployment you want to guarantee that you have the correct `gasPrice` and `gas` value, both of these are found in the `truffle-config.js` file. Specifically for mainnet deployment look at the networks -> mainnet object, inside that object will contain both of those fields.

### Specifying Aurox Addresses

At the very top of the file found at: ./migrations/2_Aurox_migrations.js there are 4 variables: uniSwapAddress, teamRewardAddress, exchangeListingReserve, reservesAddress. Ensure that you set these variables to be equal to the correct addresses for each. These are the same addresses used in the Aurox contract for transferring the amounts.

### Gas Price

To specify the correct `gasPrice` it is worthwhile going to this [link](https://ethgasstation.info/index.php). This link contains current gas prices on the ethereum network and tells you what gas price to specify to ensure that the transaction goes through. Oftentimes the gas prices on the network fluctuate throughout the day, in off-peak times the price could down a bit. Potentially recheck the webpage throughout the day until the price is valid.

Once you settle on a gas price you must set the field in gwei units, which is ^9, for example a gas price of 50 would require you to set the field as 50e9.

### Gas

When specifying a gas value, it is always good to over supply with gas, this is because if you under-supply the transaction with gas and the transaction runs out of gas it will revert and you will lose the supplied gas money.

Past deployments of this contract have cost around ~3,145,296 worth of gas, typically the gas limit is about ~4,465,030.

To prevent the reverting of this deployment I would recommend setting the `gas` field to be at least `4,465,030`. All additional unused gas in the transaction is refunded, so there is no cost to over-supplying the transaction with gas.

### Mainnet deployment command

To Deploy to mainnet use this command:

`truffle deploy --network mainnet`

# Sending Liquidity into the Provider

First get the Uniswap token address, do this by going to the etherscan page for my [deployment account](https://goerli.etherscan.io/address/0x82C01fEac95776e099530a81fEdE18265229319a)

Find the transaction that creates the Uniswap pool and funds it, typically this is the 5th transaction in the deployment process.

Then the amount that is to be transferred into the Provider needs to be approved first, do this by compiling the ERC20 contract at /contracts/lib/ERC20.sol with remix then go to the "Deploy and Run Transactions" tab. Once there point the compiled contract at the Uniswap address.

Then use the approve function taking in the address of the Provider and the amount to transfer.

Then you can addLiquidity

# Creating a stake

Similar with creating a stake the amount to be transfered into the stake must be approved first, follow the steps above but compile the Aurox Token at ./contracts/Token/AuroxToken.sol.

Then point the compiled Token at the deployed address of the Aurox token and use the approve function taking in the address of the Staking Master and the amount to fund.

# Notes

Usually when I load a contract with remix I've been using the interface files, that only exposes the functions the frontend would need. If you want to see all functions use the actual contract file
