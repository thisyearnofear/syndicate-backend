const { createPublicClient, createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { chains } = require("@lens-chain/sdk/viem");
const config = require("../config");

// Import isMainnetEnvironment from config
const { CHAIN, LENS_CHAIN_DETAILS, ACTIVE_CHAIN_DETAILS, CHAIN_IDS } = require("../config");

// Function to check if environment indicates mainnet
const isMainnetEnvironment = (env) => {
  const envLower = env.toLowerCase();
  return envLower === "mainnet" || envLower === "production";
};

// Default active chain based on environment
let activeChain = config.CHAIN;
let activeRpcUrl = config.ACTIVE_CHAIN_DETAILS.rpcUrl;

console.log(`Initializing Lens Chain service with default chain ID: ${activeChain.id}`);
console.log(`Default RPC URL: ${activeRpcUrl}`);

// Clients for specific chains (always available)
const mainnetPublicClient = createPublicClient({
  chain: chains.mainnet,
  transport: http(config.LENS_CHAIN_DETAILS.mainnet.rpcUrl),
});

const testnetPublicClient = createPublicClient({
  chain: chains.testnet,
  transport: http(config.LENS_CHAIN_DETAILS.testnet.rpcUrl),
});

// Create a dynamic public client that will use the active chain
const getDynamicPublicClient = () => {
  return createPublicClient({
    chain: activeChain,
    transport: http(activeRpcUrl),
  });
};

// Create a dynamic wallet client that will use the active chain
const getDynamicWalletClient = () => {
  if (!config.PRIVATE_KEY) {
    console.error("No private key available for wallet client");
    return null;
  }

  try {
    const account = privateKeyToAccount(config.PRIVATE_KEY);
    return createWalletClient({
      chain: activeChain,
      transport: http(activeRpcUrl),
      account,
    });
  } catch (error) {
    console.error("Failed to create wallet client:", error.message);
    return null;
  }
};

// Initial clients
let publicClient = getDynamicPublicClient();
let walletClient = getDynamicWalletClient();

/**
 * Switch the active chain (can be called at runtime)
 * @param {string} environment - Either 'mainnet', 'production', or 'testnet'
 * @returns {boolean} Whether the switch was successful
 */
function switchChain(environment) {
  if (!["mainnet", "production", "testnet"].includes(environment.toLowerCase())) {
    console.error(
      `Invalid environment: ${environment}. Must be 'mainnet', 'production', or 'testnet'`
    );
    return false;
  }

  const isMainnet = isMainnetEnvironment(environment);
  activeChain = isMainnet ? chains.mainnet : chains.testnet;
  activeRpcUrl = isMainnet
    ? config.LENS_CHAIN_DETAILS.mainnet.rpcUrl
    : config.LENS_CHAIN_DETAILS.testnet.rpcUrl;

  // Re-create clients with new chain
  publicClient = getDynamicPublicClient();
  walletClient = getDynamicWalletClient();

  console.log(`Switched to ${isMainnet ? "mainnet" : "testnet"} (Chain ID: ${activeChain.id})`);
  console.log(`Using RPC URL: ${activeRpcUrl}`);

  return true;
}

/**
 * Create a wallet client with a specific account
 * @param {string} privateKey - The private key to use for the wallet
 * @param {string} [environment] - Optional environment to create the client for
 * @returns {import('viem').WalletClient} The wallet client
 */
function createWalletClientWithAccount(privateKey, environment) {
  try {
    const account = privateKeyToAccount(privateKey);

    // If environment is specified, use that chain, otherwise use active chain
    let chain = activeChain;
    let rpcUrl = activeRpcUrl;

    if (environment) {
      const isMainnet = isMainnetEnvironment(environment);
      chain = isMainnet ? chains.mainnet : chains.testnet;
      rpcUrl = isMainnet
        ? config.LENS_CHAIN_DETAILS.mainnet.rpcUrl
        : config.LENS_CHAIN_DETAILS.testnet.rpcUrl;
    }

    return createWalletClient({
      chain,
      transport: http(rpcUrl),
      account,
    });
  } catch (error) {
    console.error("Failed to create wallet client:", error.message);
    throw error;
  }
}

module.exports = {
  // Dynamic clients that adapt to the active chain
  get publicClient() {
    return publicClient;
  },
  get walletClient() {
    return walletClient;
  },

  // Fixed clients for specific chains
  mainnetPublicClient,
  testnetPublicClient,

  // Helper functions
  createWalletClientWithAccount,
  switchChain,

  // Current state
  get activeChain() {
    return activeChain;
  },
  get activeRpcUrl() {
    return activeRpcUrl;
  },
};
