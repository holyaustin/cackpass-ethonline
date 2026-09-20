import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat"; // ✅ ADD THIS
import * as dotenv from "dotenv";

dotenv.config();


// Arc Testnet Configuration
const ARC_MAINNET_CONFIG = {
  chainId: 5042, // Arc Mainnet Chain ID
  rpcUrl: process.env.ARC_MAINET_RPC_URL || "https://rpc.mainnet.arc.io",
  explorerUrl: "https://explorer.arc.io/", // Also available at https://arc.etherscan.io  
  gasPrice: 20_000_000_000, // 20 Gwei minimum (Gas is paid natively in USDC)
}

// Based on: https://docs.arc.io/arc/references/connect-to-arc
const ARC_TESTNET_CONFIG = {
  chainId: 5042002, // Arc Testnet Chain ID
  rpcUrl: process.env.ARC_RPC_URL || "https://rpc.testnet.arc.io",
  explorerUrl: "https://testnet.arcscan.app",
  gasPrice: 20_000_000_000, // 20 Gwei (Arc's minimum)
};

// Validate required environment variables
if (!process.env.PRIVATE_KEY) {
  console.warn("⚠️ PRIVATE_KEY not set in .env file. Deployments will fail.");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Arc Mainnet Configuration
    arcMainnet: {
      url: ARC_MAINNET_CONFIG.rpcUrl,
      chainId: ARC_MAINNET_CONFIG.chainId,
      accounts: process.env.PRIVATE_KEY_MAINNET ? [process.env.PRIVATE_KEY_MAINNET] : [],
      gasPrice: ARC_MAINNET_CONFIG.gasPrice,
      timeout: 60000, // 60 seconds
    },
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
      arcTestnet: process.env.ARC_TESTNET_EXPLORER_API_KEY ?? "arcscan",
      arcMainnet: process.env.ARC_MAINNET_EXPLORER_API_KEY ?? "arcscan",
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
      {
        network: "arcMainnet",
        chainId: 5042,
        urls: {
          apiURL:
            process.env.ARC_MAINNET_EXPLORER_API_URL ??
            "https://arcscan.app/api",
          browserURL: "https://arcscan.app",
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