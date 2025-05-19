require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Lens Chain
    lens: {
      url: process.env.LENS_RPC_URL || "https://rpc.lens.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Lens Chain testnet (if available)
    lensTestnet: {
      url: process.env.LENS_TESTNET_RPC_URL || "https://rpc-testnet.lens.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Base Chain testnet
    baseGoerli: {
      url: process.env.BASE_GOERLI_RPC_URL || "https://goerli.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Base Mainnet
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      lens: process.env.LENS_EXPLORER_API_KEY,
      lensTestnet: process.env.LENS_TESTNET_EXPLORER_API_KEY,
      base: process.env.BASESCAN_API_KEY,
      baseGoerli: process.env.BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: "lens",
        chainId: 1337, // Update with actual Lens Chain ID when available
        urls: {
          apiURL: "https://api.explorer.lens.xyz/api",
          browserURL: "https://explorer.lens.xyz",
        },
      },
      {
        network: "lensTestnet",
        chainId: 1338, // Update with actual Lens Testnet Chain ID when available
        urls: {
          apiURL: "https://api.testnet.explorer.lens.xyz/api",
          browserURL: "https://testnet.explorer.lens.xyz",
        },
      },
    ],
  },
  paths: {
    sources: "./",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
