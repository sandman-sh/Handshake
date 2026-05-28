require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
        },
      },
      {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
        },
      },
    ],
  },
  networks: {
    hardhat: {
      // Hardhat network configuration
    },
    xlayerTestnet: {
      url: "https://testrpc.xlayer.tech/terigon",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1952,
    },
  },
  sourcify: {
    enabled: true,
  },
  etherscan: {
    apiKey: {
      xlayerTestnet: "any-value",
    },
    customChains: [
      {
        network: "xlayerTestnet",
        chainId: 1952,
        urls: {
          apiURL: "https://www.oklink.com/api/v5/explorer/xlayer/api",
          browserURL: "https://www.oklink.com/xlayer-test",
        },
      },
    ],
  },
};
