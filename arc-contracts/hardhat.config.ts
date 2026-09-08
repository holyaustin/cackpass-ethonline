import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

// Arc Testnet Configuration
// Based on: https://docs.arc.io/arc/references/connect-to-arc
const ARC_TESTNET_CONFIG = {
  chainId: 12345, // Arc Testnet Chain ID
  rpcUrl: process.env.ARC_RPC_URL || "https://rpc-testnet.arc.io",
  explorerUrl: "https://testnet.arcscan.app",
  gasPrice: 20_000_000_000, // 20 Gwei (Arc's minimum)
};

// Validate required environment variables
if (!process.env.PRIVATE_KEY) {
  console.warn("⚠️ PRIVATE_KEY not set in .env file. Deployments will fail.");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      viaIR: true, // Enable IR-based compilation for optimization
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Arc Testnet Configuration
    arcTestnet: {
      url: ARC_TESTNET_CONFIG.rpcUrl,
      chainId: ARC_TESTNET_CONFIG.chainId,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: ARC_TESTNET_CONFIG.gasPrice,
      timeout: 60000, // 60 seconds
    },
    // Local Hardhat network (for testing)
    hardhat: {
      chainId: 31337,
      gasPrice: 20_000_000_000,
    },
  },
  etherscan: {
    apiKey: {
      arcTestnet: process.env.ARC_API_KEY || "empty",
    },
    customChains: [
      {
        network: "arcTestnet",
        chainId: ARC_TESTNET_CONFIG.chainId,
        urls: {
          apiURL: `${ARC_TESTNET_CONFIG.explorerUrl}/api`,
          browserURL: ARC_TESTNET_CONFIG.explorerUrl,
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;