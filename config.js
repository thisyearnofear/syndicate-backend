const never = require("never");
const { chains } = require("@lens-chain/sdk/viem");

exports.PORT = process.env.PORT || 3003;

exports.PRIVATE_KEY = process.env.PRIVATE_KEY ?? never("PRIVATE_KEY env variable is required");

exports.SHARED_SECRET =
  process.env.SHARED_SECRET ?? never("SHARED_SECRET env variable is required");

const ENVIRONMENT = process.env.ENVIRONMENT ?? never("ENVIRONMENT env variable is required");

// Function to check if environment indicates mainnet
const isMainnetEnvironment = (env) => {
  const envLower = env.toLowerCase();
  return envLower === "mainnet" || envLower === "production";
};

// Set chain based on environment (accepts both "mainnet" and "production")
exports.CHAIN = isMainnetEnvironment(ENVIRONMENT) ? chains.mainnet : chains.testnet;

// Export chain IDs for use throughout the application
exports.CHAIN_IDS = {
  LENS_MAINNET: 232,
  LENS_TESTNET: 37111,
  BASE: 8453,
};

// Chain details
exports.LENS_CHAIN_DETAILS = {
  mainnet: {
    id: exports.CHAIN_IDS.LENS_MAINNET,
    name: "Lens Chain Mainnet",
    rpcUrl: process.env.LENS_MAINNET_RPC_URL || "https://rpc.lens.xyz",
    currencySymbol: "GHO",
    explorerUrl: "https://explorer.lens.xyz",
  },
  testnet: {
    id: exports.CHAIN_IDS.LENS_TESTNET,
    name: "Lens Chain Testnet",
    rpcUrl: process.env.LENS_TESTNET_RPC_URL || "https://rpc.testnet.lens.xyz",
    currencySymbol: "GRASS",
    explorerUrl: "https://explorer.testnet.lens.xyz",
  },
};

// Get active chain details (using the same function for consistency)
exports.ACTIVE_CHAIN_DETAILS = isMainnetEnvironment(ENVIRONMENT)
  ? exports.LENS_CHAIN_DETAILS.mainnet
  : exports.LENS_CHAIN_DETAILS.testnet;
