/**
 * @file OffChainProcessor.js
 * @description Off-chain processor for coordinating intents between Lens Chain and Base Chain
 * This script monitors events from both chains and facilitates cross-chain intent resolution
 */

const ethers = require("ethers");
// Temporarily comment out Across for testing
// const { Across } = require("@across-protocol/sdk-v2");
// For ethers v6, providers are directly on ethers, not in a separate import

// Contract ABIs (would be imported from compiled contract artifacts)
const SyndicateIntentResolverABI = require("./abi/SyndicateIntentResolver.json");
const BaseChainIntentResolverABI = require("./abi/BaseChainIntentResolver.json");
const CrossChainResolverABI = require("./abi/CrossChainResolver.json");
const TicketRegistryABI = require("./abi/TicketRegistry.json");

class OffChainProcessor {
  constructor(config) {
    this.config = config;
    this.lensProvider = new ethers.WebSocketProvider(config.lensRpcUrl);
    this.baseProvider = new ethers.WebSocketProvider(config.baseRpcUrl);

    // Initialize wallet
    this.wallet = new ethers.Wallet(config.privateKey);
    this.lensWallet = this.wallet.connect(this.lensProvider);
    this.baseWallet = this.wallet.connect(this.baseProvider);

    // Initialize contract instances
    this.initializeContracts();

    // Initialize Across SDK - temporarily commented out for testing
    // this.across = new Across({
    //   chainId: config.lensChainId,
    //   signer: this.lensWallet,
    // });
  }

  /**
   * Initialize contract instances on both chains
   */
  initializeContracts() {
    // Lens Chain contracts
    this.intentResolver = new ethers.Contract(
      this.config.lensContracts.intentResolver,
      SyndicateIntentResolverABI,
      this.lensWallet
    );

    // Base Chain contracts
    this.baseIntentResolver = new ethers.Contract(
      this.config.baseContracts.intentResolver,
      BaseChainIntentResolverABI,
      this.baseWallet
    );

    this.crossChainResolver = new ethers.Contract(
      this.config.baseContracts.crossChainResolver,
      CrossChainResolverABI,
      this.baseWallet
    );

    this.ticketRegistry = new ethers.Contract(
      this.config.baseContracts.ticketRegistry,
      TicketRegistryABI,
      this.baseWallet
    );
  }

  /**
   * Start listening for events on both chains
   */
  async startListening() {
    console.log("Starting intent processor...");

    // Listen for intent submission events on Lens Chain
    this.intentResolver.on("IntentSubmitted", async (intentId, user, intentType, event) => {
      console.log(`New intent submitted: ${intentId} by ${user}`);
      try {
        await this.processLensChainIntent(intentId, user, intentType);
      } catch (error) {
        console.error(`Error processing intent ${intentId}:`, error);
      }
    });

    // Listen for cross-chain operations
    this.intentResolver.on(
      "CrossChainOperationInitiated",
      async (intentId, sourceChain, destinationChain, event) => {
        console.log(`Cross-chain operation initiated: ${intentId}`);
        try {
          await this.monitorCrossChainOperation(intentId, sourceChain, destinationChain);
        } catch (error) {
          console.error(`Error monitoring cross-chain operation ${intentId}:`, error);
        }
      }
    );

    // Listen for winning events on Base Chain
    this.crossChainResolver.on("WinningTicketDetected", async (ticketId, amount, event) => {
      console.log(`Winning ticket detected: ${ticketId} with amount ${amount}`);
      try {
        await this.processWinningTicket(ticketId, amount);
      } catch (error) {
        console.error(`Error processing winning ticket ${ticketId}:`, error);
      }
    });

    console.log("Event listeners initialized successfully");
  }

  /**
   * Process an intent submitted on Lens Chain
   * @param {string} intentId The ID of the submitted intent
   * @param {string} user The address of the user who submitted the intent
   * @param {number} intentType The type of the intent
   */
  async processLensChainIntent(intentId, user, intentType) {
    console.log(`Processing intent ${intentId} of type ${intentType}`);

    // For intents that can be executed immediately, the contract handles them
    // For cross-chain intents, we need to monitor their progress

    // Check if the intent is already being executed
    const isExecuted = await this.intentResolver.executedIntents(intentId);
    if (isExecuted) {
      console.log(`Intent ${intentId} is already being executed`);
      return;
    }

    // If this is a deferred intent that needs off-chain facilitation,
    // we would handle that logic here

    console.log(`Processed intent ${intentId}`);
  }

  /**
   * Monitor a cross-chain operation for completion
   * @param {string} intentId The ID of the intent
   * @param {number} sourceChain The source chain ID
   * @param {number} destinationChain The destination chain ID
   */
  async monitorCrossChainOperation(intentId, sourceChain, destinationChain) {
    console.log(`Monitoring cross-chain operation for intent ${intentId}`);

    // This would normally involve querying the Across Protocol API
    // to track the status of the deposit

    // Example implementation using Across SDK - commented out for testing
    try {
      // Mock implementation for testing
      console.log(`Simulating deposit status check for intent ${intentId}`);

      // Simulate random status
      const depositStatus = Math.random() > 0.5 ? "completed" : "in_progress";

      if (depositStatus === "completed") {
        console.log(`Cross-chain operation for intent ${intentId} completed`);
        // Here we would trigger any follow-up actions on the destination chain
      } else {
        // Retry later
        console.log(`Cross-chain operation for intent ${intentId} still in progress`);
        setTimeout(
          () => this.monitorCrossChainOperation(intentId, sourceChain, destinationChain),
          60000
        );
      }
    } catch (error) {
      console.error(`Error checking deposit status for intent ${intentId}:`, error);
      // Retry with backoff
      setTimeout(
        () => this.monitorCrossChainOperation(intentId, sourceChain, destinationChain),
        300000
      );
    }
  }

  /**
   * Process a winning ticket detected on Base Chain
   * @param {string} ticketId The ID of the winning ticket
   * @param {string} amount The winning amount
   */
  async processWinningTicket(ticketId, amount) {
    console.log(`Processing winning ticket ${ticketId} with amount ${amount}`);

    try {
      // Get the syndicate address associated with the ticket
      const syndicateAddress = await this.ticketRegistry.ticketToSyndicate(ticketId);
      console.log(`Ticket ${ticketId} belongs to syndicate ${syndicateAddress}`);

      if (syndicateAddress === ethers.ZeroAddress) {
        console.log(`No syndicate associated with ticket ${ticketId}`);
        return;
      }

      // The CrossChainResolver contract should already be handling
      // the bridging of funds back to Lens Chain

      // We can add additional monitoring here to ensure the funds
      // are properly bridged back

      console.log(`Winning ticket ${ticketId} processed successfully`);
    } catch (error) {
      console.error(`Error processing winning ticket ${ticketId}:`, error);
    }
  }

  /**
   * Manually resolve an intent that couldn't be processed automatically
   * @param {string} intentId The ID of the intent to resolve
   * @param {Object} intentData The intent data
   * @param {string} user The user who submitted the intent
   */
  async manuallyResolveIntent(intentId, intentData, user) {
    console.log(`Manually resolving intent ${intentId}`);

    try {
      // Sign the intent to prove it's coming from an authorized relayer
      const signature = await this.lensWallet.signMessage(
        ethers.getBytes(
          ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
              [
                "bytes32",
                "tuple(uint8,address,uint256,address,uint32,uint32,uint256,bool,uint256,uint256,bytes)",
                "address",
              ],
              [
                intentId,
                [
                  intentData.intentType,
                  intentData.syndicateAddress,
                  intentData.amount,
                  intentData.tokenAddress,
                  intentData.sourceChainId,
                  intentData.destinationChainId,
                  intentData.ticketId,
                  intentData.useOptimalRoute,
                  intentData.maxFeePercentage,
                  intentData.deadline,
                  intentData.metadata,
                ],
                user,
              ]
            )
          )
        )
      );

      // Call the resolver with the signed intent
      const tx = await this.intentResolver.resolveIntent(intentId, intentData, user, signature);

      await tx.wait();
      console.log(`Intent ${intentId} manually resolved with transaction ${tx.hash}`);
    } catch (error) {
      console.error(`Error manually resolving intent ${intentId}:`, error);
    }
  }

  /**
   * Gracefully stop the processor
   */
  async stop() {
    console.log("Stopping intent processor...");

    // Remove all event listeners
    this.intentResolver.removeAllListeners();
    this.crossChainResolver.removeAllListeners();

    // Close WebSocket connections
    try {
      await this.lensProvider.destroy();
      await this.baseProvider.destroy();
      console.log("WebSocket connections closed");
    } catch (error) {
      console.error("Error closing WebSocket connections:", error);
    }

    console.log("Intent processor stopped");
  }
}

// Example configuration
const config = {
  lensRpcUrl: process.env.LENS_RPC_URL || "https://rpc.lens.xyz",
  baseRpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
  privateKey: process.env.PRIVATE_KEY || "0xYourPrivateKeyHere",
  lensChainId: process.env.LENS_CHAIN_ID || 1337,
  baseChainId: process.env.BASE_CHAIN_ID || 8453,
  lensContracts: {
    intentResolver: process.env.LENS_INTENT_RESOLVER || "0xIntentResolverAddress",
  },
  baseContracts: {
    intentResolver: process.env.BASE_INTENT_RESOLVER || "0xBaseIntentResolverAddress",
    crossChainResolver: process.env.CROSS_CHAIN_RESOLVER || "0xCrossChainResolverAddress",
    ticketRegistry: process.env.TICKET_REGISTRY || "0xTicketRegistryAddress",
  },
};

module.exports = { OffChainProcessor };

// If this file is run directly
if (require.main === module) {
  const processor = new OffChainProcessor(config);
  processor.startListening().catch(console.error);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    processor.stop();
    process.exit(0);
  });
}
