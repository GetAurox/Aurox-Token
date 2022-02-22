import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
import "hardhat-gas-reporter";
import "solidity-coverage";

import { HardhatUserConfig } from "hardhat/types";

const config: HardhatUserConfig = {
    defaultNetwork: "hardhat",
    solidity: {
        compilers: [
            {
                version: "0.8.10",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    paths: {
        sources: "contracts",
        tests: "./tests",
    },
    networks: {
        hardhat: {
            accounts: { mnemonic: process.env.MNEMONIC },
            // forking: {
            //   url: `https://eth-mainnet.alchemyapi.io/v2/${
            //     process.env.ALCHEMY_API_KEY ?? ""
            //   }`,
            //   blockNumber: ETH_FORK_BLOCK_NUMBER,
            // },
        },
        // goerli: {
        //     url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
        //     accounts: { mnemonic: process.env.MNEMONIC },
        //     gas: 21000000,
        //     gasPrice: 80000000000,
        //     saveDeployments: true,
        // },
        // mainnet: {
        //   gas: 8500000,
        //   gasPrice: 5e9,
        //   accounts: { mnemonic: MNEMONIC },
        //   chainId: 1,
        //   timeout: 500,
        //   url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
        // },
        // coverage: {
        //   url: "http://127.0.0.1:8555", // Coverage launches its own ganache-cli client
        // },
    },
    typechain: {
        outDir: "types/typechain",
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS === "true" ? true : false,
    },
    mocha: {
        timeout: 10000000,
    },
};

export default config;
