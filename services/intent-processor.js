/**
 * @file intent-processor.js
 * @description Off-chain processor for coordinating intents between Lens Chain and Base Chain
 * This service monitors events from both chains and facilitates cross-chain intent resolution
 */

const { ethers } = require("ethers");
const { SdkV2: Across } = require("@across-protocol/sdk-v2");
const winston = require("winston");
const db = require("../database");

// Configure logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: "intent-processor" },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new winston.transports.File({ filename: "intent-processor.log" }),
  ],
});

class IntentProcessor {
  constructor(config) {
    this.config = config;
    this.lensProvider = new ethers.JsonRpcProvider(config.lensRpcUrl);
    this.baseProvider = new ethers.JsonRpcProvider(config.baseRpcUrl);

    // Initialize wallet
    this.wallet = new ethers.Wallet(config.privateKey);
    this.lensWallet = this.wallet.connect(this.lensProvider);
    this.baseWallet = this.wallet.connect(this.baseProvider);

    // Initialize contract instances
    this.initializeContracts();

    // Initialize Across SDK
    this.across = new Across({
      chainId: config.lensChainId,
      signer: this.lensWallet,
    });

    // Track active listeners
    this.activeListeners = [];
    this.isRunning = false;
  }

  /**
   * Initialize contract instances on both chains
   */
  initializeContracts() {
    try {
      // Load contract ABIs
      const SyndicateIntentResolverABI = require("../abis/SyndicateIntentResolver.json");
      const BaseChainIntentResolverABI = require("../abis/BaseChainIntentResolver.json");
      const CrossChainResolverABI = require("../abis/CrossChainResolver.json");
      const TicketRegistryABI = require("../abis/TicketRegistry.json");

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

      logger.info("Contract instances initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize contract instances", { error: error.message });
      throw error;
    }
  }

  /**
   * Start listening for events on both chains
   */
  async start() {
    if (this.isRunning) {
      logger.info("Intent processor already running");
      return;
    }

    logger.info("Starting intent processor...");
    this.isRunning = true;

    try {
      // Listen for intent submission events on Lens Chain
      this.intentResolver.on("IntentSubmitted", async (intentId, user, intentType, event) => {
        logger.info(`New intent submitted: ${intentId} by ${user}`);
        try {
          await this.processLensChainIntent(intentId, user, intentType);
        } catch (error) {
          logger.error(`Error processing intent ${intentId}:`, { error: error.message });
        }
      });
      this.activeListeners.push("IntentSubmitted");

      // Listen for cross-chain operations
      this.intentResolver.on(
        "CrossChainOperationInitiated",
        async (intentId, sourceChain, destinationChain, event) => {
          logger.info(`Cross-chain operation initiated: ${intentId}`);
          try {
            await this.monitorCrossChainOperation(intentId, sourceChain, destinationChain);
          } catch (error) {
            logger.error(`Error monitoring cross-chain operation ${intentId}:`, {
              error: error.message,
            });
          }
        }
      );
      this.activeListeners.push("CrossChainOperationInitiated");

      // Listen for winning events on Base Chain
      this.crossChainResolver.on("WinningTicketDetected", async (ticketId, amount, event) => {
        logger.info(`Winning ticket detected: ${ticketId} with amount ${amount}`);
        try {
          await this.processWinningTicket(ticketId, amount);
        } catch (error) {
          logger.error(`Error processing winning ticket ${ticketId}:`, { error: error.message });
        }
      });
      this.activeListeners.push("WinningTicketDetected");

      logger.info("Event listeners initialized successfully");
    } catch (error) {
      this.isRunning = false;
      logger.error("Failed to start intent processor", { error: error.message });
      throw error;
    }
  }

  /**
   * Process an intent submitted on Lens Chain
   * @param {string} intentId The ID of the submitted intent
   * @param {string} user The address of the user who submitted the intent
   * @param {number} intentType The type of the intent
   */
  async processLensChainIntent(intentId, user, intentType) {
    logger.info(`Processing intent ${intentId} of type ${intentType}`);

    try {
      // Check if the intent is already being executed
      const isExecuted = await this.intentResolver.executedIntents(intentId);
      if (isExecuted) {
        logger.info(`Intent ${intentId} is already being executed`);
        return;
      }

      // Fetch intent details from the contract
      const intentDetails = await this.intentResolver.getIntent(intentId);

      // Store the intent in the database
      const dbIntent = await db.Intent.create({
        intentId,
        user,
        intentType,
        syndicateAddress: intentDetails.syndicateAddress,
        amount: intentDetails.amount.toString(),
        tokenAddress: intentDetails.tokenAddress,
        sourceChainId: intentDetails.sourceChain,
        destinationChainId: intentDetails.destinationChain,
        useOptimalRoute: intentDetails.useOptimalRoute,
        maxFeePercentage: intentDetails.maxFeePercentage,
        deadline: intentDetails.deadline.toString(),
        status: "PENDING",
        metadata: {
          gasPrice: intentDetails.gasPrice?.toString(),
          encodedData: intentDetails.encodedData,
        },
      });

      logger.info(`Stored intent ${intentId} in database with ID ${dbIntent.id}`);

      // For intents that can be executed immediately, the contract handles them
      // For cross-chain intents, we need to monitor their progress
      if (intentDetails.sourceChain !== intentDetails.destinationChain) {
        // Update status to EXECUTING
        await dbIntent.update({ status: "EXECUTING" });

        // The cross-chain initiation will trigger the CrossChainOperationInitiated event
        // which we are listening to separately
      }

      logger.info(`Processed intent ${intentId}`);
    } catch (error) {
      logger.error(`Failed to process intent ${intentId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Monitor a cross-chain operation for completion
   * @param {string} intentId The ID of the intent
   * @param {number} sourceChain The source chain ID
   * @param {number} destinationChain The destination chain ID
   */
  async monitorCrossChainOperation(intentId, sourceChain, destinationChain) {
    logger.info(`Monitoring cross-chain operation for intent ${intentId}`);

    try {
      // Find the intent in the database
      const intent = await db.Intent.findOne({
        where: { intentId },
      });

      if (!intent) {
        logger.error(`Intent ${intentId} not found in database`);
        return;
      }

      // Record the transaction initiation
      await db.Transaction.create({
        intentId: intent.id,
        chainId: sourceChain,
        txHash: "0x" + intentId, // Placeholder until we get the real tx hash
        type: "BRIDGE",
        status: "PENDING",
      });

      // This would normally involve querying the Across Protocol API
      // to track the status of the deposit
      // Example implementation using Across SDK
      try {
        // Get deposit status from Across (adjust for the updated SDK)
        const depositStatus = await this.across.getDepositStatus(intentId);

        if (depositStatus === "RELAYED") {
          logger.info(`Cross-chain operation for intent ${intentId} completed`);
          // Update the transaction status
          await db.Transaction.update(
            { status: "CONFIRMED" },
            { where: { intentId: intent.id, type: "BRIDGE" } }
          );

          // Update the intent status
          await intent.update({ status: "COMPLETED" });
        } else {
          // Retry later
          logger.info(`Cross-chain operation for intent ${intentId} still in progress`);
          setTimeout(
            () => this.monitorCrossChainOperation(intentId, sourceChain, destinationChain),
            60000
          );
        }
      } catch (error) {
        logger.error(`Error checking deposit status for intent ${intentId}:`, {
          error: error.message,
        });
        // Retry with backoff
        setTimeout(
          () => this.monitorCrossChainOperation(intentId, sourceChain, destinationChain),
          300000
        );
      }
    } catch (error) {
      logger.error(`Failed to monitor cross-chain operation for intent ${intentId}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process a winning ticket detected on Base Chain
   * @param {string} ticketId The ID of the winning ticket
   * @param {string} amount The winning amount
   */
  async processWinningTicket(ticketId, amount) {
    logger.info(`Processing winning ticket ${ticketId} with amount ${amount}`);

    try {
      // Get the syndicate address associated with the ticket
      const syndicateAddress = await this.ticketRegistry.ticketToSyndicate(ticketId);
      logger.info(`Ticket ${ticketId} belongs to syndicate ${syndicateAddress}`);

      if (syndicateAddress === ethers.ZeroAddress) {
        logger.info(`No syndicate associated with ticket ${ticketId}`);
        return;
      }

      // The CrossChainResolver contract should already be handling
      // the bridging of funds back to Lens Chain

      // We can add additional monitoring here to ensure the funds
      // are properly bridged back

      logger.info(`Winning ticket ${ticketId} processed successfully`);
    } catch (error) {
      logger.error(`Error processing winning ticket ${ticketId}:`, { error: error.message });
      throw error;
    }
  }

  /**
   * Stop listening for events
   */
  async stop() {
    if (!this.isRunning) {
      logger.info("Intent processor already stopped");
      return;
    }

    logger.info("Stopping intent processor...");

    try {
      // Remove all event listeners
      this.activeListeners.forEach((event) => {
        this.intentResolver.removeAllListeners(event);
        this.crossChainResolver.removeAllListeners(event);
      });
      this.activeListeners = [];
      this.isRunning = false;
      logger.info("Intent processor stopped successfully");
    } catch (error) {
      logger.error("Failed to stop intent processor", { error: error.message });
      throw error;
    }
  }
}

module.exports = IntentProcessor;
