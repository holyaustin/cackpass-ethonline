require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const ARC_RPC_URL = process.env.ARC_RPC_URL || "https://rpc-testnet.arc.io";
const ARC_API_KEY = process.env.ARC_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: true,
    },

    localhost: {
      url: "http://127.0.0.1:8545",
    },

    arcTestnet: {
      url: ARC_RPC_URL,
      chainId: 1234, // Verify this is the correct Arc testnet chain ID
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000000" 
        ? [PRIVATE_KEY] 
        : [],
      gasPrice: "auto",
      timeout: 40000,
      httpHeaders: {
        "User-Agent": "hardhat-cack-pass",
      },
    },
  },

  etherscan: {
    apiKey: {
      arcTestnet: ARC_API_KEY,
    },
    customChains: [
      {
        network: "arcTestnet",
        chainId: 1234,
        urls: {
          apiURL: "https://testnet.arcscan.app/api",
          browserURL: "https://testnet.arcscan.app",
        },
      },
    ],
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 40000,
  },
};
