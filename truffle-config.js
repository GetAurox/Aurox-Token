const { projectId, mnemonic } = require("./secrets.json");
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
    solc: { optimizer: { enabled: true, runs: 200 } },
    compilers: {
        solc: {
            version: "0.8.10",
        },
    },
    test_directory: "./old_tests/javascript/Integration",
    plugins: ["solidity-coverage"],
    mocha: {
        enableTimeouts: false,
    },
    /**
     * Networks define how you connect to your ethereum client and let you set the
     * defaults web3 uses to send transactions. If you don't specify one truffle
     * will spin up a development blockchain for you on port 9545 when you
     * run `develop` or `test`. You can ask a truffle command to use a specific
     * network from the command line, e.g
     *
     * $ truffle test --network <network-name>
     */

    networks: {
        // development: {
        //   host: "localhost", // Localhost (default: none)
        //   port: 7545, // Standard Ethereum port (default: none)
        //   network_id: "*", // Any network (default: none)
        // },
        goerli: {
            provider: () =>
                new HDWalletProvider(
                    mnemonic,
                    `https://goerli.infura.io/v3/${projectId}`
                ),
            network_id: 5, // eslint-disable-line camelcase
            gas: 4465030,
            gasPrice: 10000000000,
            confirmations: 0, // # of confs to wait between deployments. (default: 0)
            timeoutBlocks: 200, // # of blocks before a deployment times out  (minimum/default: 50)
            skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
        },
        mainnet: {
            provider: () =>
                new HDWalletProvider(
                    mnemonic,
                    `https://mainnet.infura.io/v3/${projectId}`
                ),
            network_id: 1, // Mainnet's id
            gas: 6500000,
            gasPrice: 5e9,
            confirmations: 0, // # of confs to wait between deployments. (default: 0)
            timeoutBlocks: 500, // # of blocks before a deployment times out  (minimum/default: 50)
            skipDryRun: true,
        },
    },
};
