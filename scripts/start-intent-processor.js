/**
 * Start script for the Intent Processor
 * This script initializes and starts the OffChainProcessor to handle cross-chain intents
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
console.log("Looking for .env file at:", path.resolve(__dirname, "../.env"));
const { OffChainProcessor } = require("../contracts/intent/OffChainProcessor");

// Configuration from environment variables
const config = {
  privateKey: process.env.PRIVATE_KEY,
  lensRpcUrl: process.env.LENS_RPC_URL,
  baseRpcUrl: process.env.BASE_RPC_URL,
  lensChainId: 232, // Lens Chain ID
  baseChainId: 8453, // Base Chain ID
  lensContracts: {
    intentResolver: process.env.LENS_INTENT_RESOLVER,
  },
  baseContracts: {
    intentResolver: process.env.BASE_INTENT_RESOLVER,
    crossChainResolver: process.env.CROSS_CHAIN_RESOLVER,
    ticketRegistry: process.env.TICKET_REGISTRY,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
};

// Validate required environment variables
const requiredEnvVars = [
  "PRIVATE_KEY",
  "LENS_RPC_URL",
  "BASE_RPC_URL",
  "LENS_INTENT_RESOLVER",
  "BASE_INTENT_RESOLVER",
  "CROSS_CHAIN_RESOLVER",
  "TICKET_REGISTRY",
  "DATABASE_URL",
];

let missingEnvVars = [];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    missingEnvVars.push(envVar);
  }
}

if (missingEnvVars.length > 0) {
  console.error("Error: The following environment variables are missing:");
  missingEnvVars.forEach((envVar) => console.error(`- ${envVar}`));
  console.error("Please update your .env file with these variables and try again.");
  process.exit(1);
}

// Initialize and start the processor
async function main() {
  try {
    console.log("Initializing intent processor...");

    // Create processor instance
    const processor = new OffChainProcessor(config);

    // Handle shutdown gracefully
    process.on("SIGINT", async () => {
      console.log("Shutting down intent processor...");
      await processor.stop();
      process.exit(0);
    });

    // Start listening for events
    await processor.startListening();

    console.log("Intent processor is running. Press Ctrl+C to stop.");
  } catch (error) {
    console.error("Error starting intent processor:", error);
    process.exit(1);
  }
}

main();
