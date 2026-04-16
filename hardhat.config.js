require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.33", settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true } },
      { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true } },
      { version: "0.8.20", settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true } },
    ],
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/your-key",
      },
    },
    localhost: { url: "http://127.0.0.1:8545" },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY },
  gasReporter: { enabled: process.env.REPORT_GAS !== undefined, currency: "USD" },
  paths: {
    sources: "./contracts",
    tests: "./__tests__",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
