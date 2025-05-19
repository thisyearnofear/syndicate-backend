const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

console.log("Current working directory:", process.cwd());

// Check for .env in current directory
const currentDirEnv = path.join(process.cwd(), ".env");
console.log(`Looking for .env in current directory: ${currentDirEnv}`);
console.log(`  Exists: ${fs.existsSync(currentDirEnv)}`);

// Check for .env in parent directory
const parentDirEnv = path.join(process.cwd(), "..", ".env");
console.log(`Looking for .env in parent directory: ${parentDirEnv}`);
console.log(`  Exists: ${fs.existsSync(parentDirEnv)}`);

// Load .env from current directory
console.log("Loading .env from current directory");
const currentEnv = dotenv.config();
console.log("Current .env loaded:", !currentEnv.error);
if (currentEnv.parsed) {
  console.log("Environment variables found:", Object.keys(currentEnv.parsed).length);
  console.log(
    "Sample values:",
    "LENS_RPC_URL=",
    currentEnv.parsed.LENS_RPC_URL ? "✓" : "✗",
    "BASE_RPC_URL=",
    currentEnv.parsed.BASE_RPC_URL ? "✓" : "✗",
    "CROSS_CHAIN_RESOLVER=",
    currentEnv.parsed.CROSS_CHAIN_RESOLVER ? "✓" : "✗"
  );
}

// Try loading from parent directory
console.log("\nLoading .env from parent directory");
const parentEnv = dotenv.config({ path: parentDirEnv });
console.log("Parent .env loaded:", !parentEnv.error);
if (parentEnv.parsed) {
  console.log("Environment variables found:", Object.keys(parentEnv.parsed).length);
  console.log(
    "Sample values:",
    "LENS_RPC_URL=",
    parentEnv.parsed.LENS_RPC_URL ? "✓" : "✗",
    "BASE_RPC_URL=",
    parentEnv.parsed.BASE_RPC_URL ? "✓" : "✗",
    "CROSS_CHAIN_RESOLVER=",
    parentEnv.parsed.CROSS_CHAIN_RESOLVER ? "✓" : "✗"
  );
}

// Print current env vars
console.log("\nCurrent environment variables:");
console.log("LENS_RPC_URL=", process.env.LENS_RPC_URL ? "✓" : "✗");
console.log("BASE_RPC_URL=", process.env.BASE_RPC_URL ? "✓" : "✗");
console.log("CROSS_CHAIN_RESOLVER=", process.env.CROSS_CHAIN_RESOLVER ? "✓" : "✗");
