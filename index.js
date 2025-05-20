require("dotenv/config");

const express = require("express");
const cors = require("cors");

// Load environment variables directly instead of using the config module
// This prevents the server from exiting due to the 'never' package
const PORT = process.env.PORT || 3003;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SHARED_SECRET = process.env.SHARED_SECRET;
const ENVIRONMENT = process.env.ENVIRONMENT || "development";
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, ''); // Remove trailing slash if present

// Check required environment variables
if (!PRIVATE_KEY) {
  console.error("ERROR: PRIVATE_KEY environment variable is required");
  process.exit(1);
}

if (!SHARED_SECRET) {
  console.error("ERROR: SHARED_SECRET environment variable is required");
  process.exit(1);
}

// Chain IDs
const CHAIN_IDS = {
  LENS_MAINNET: 232,
  LENS_TESTNET: 37111,
  BASE: 8453,
};

// Chain details
const LENS_CHAIN_DETAILS = {
  mainnet: {
    id: CHAIN_IDS.LENS_MAINNET,
    name: "Lens Chain Mainnet",
    rpcUrl: process.env.LENS_MAINNET_RPC_URL || "https://rpc.lens.xyz",
    currencySymbol: "GHO",
    explorerUrl: "https://explorer.lens.xyz",
  },
  testnet: {
    id: CHAIN_IDS.LENS_TESTNET,
    name: "Lens Chain Testnet",
    rpcUrl: process.env.LENS_TESTNET_RPC_URL || "https://rpc.testnet.lens.xyz",
    currencySymbol: "GRASS",
    explorerUrl: "https://explorer.testnet.lens.xyz",
  },
};

const cookieParser = require("cookie-parser");
const { csrfMiddleware } = require("./csrf");

const app = express();

// Configure CORS - use a string for origin, not URL object
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
  })
);

app.use(express.json());
app.use(cookieParser());

// CSRF middleware completely disabled as of May 2025 due to persistent authentication issues
// app.use(csrfMiddleware);  // <-- DISABLED
console.log('CSRF middleware application completely disabled');

// Health check endpoint
app.get("/", function (_, res) {
  res.json({ online: true });
});

// Dedicated health check endpoint for Northflank
app.get("/health", function (_, res) {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Middleware to verify Authorization header
app.use((req, res, next) => {
  const authHeader = req.headers["authorization"];
  console.log(`INFO: ${req.method} ${req.originalUrl}`);
  console.log(`INFO: Headers: ${JSON.stringify(req.headers)}`);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("ERROR: Missing or invalid Authorization header");
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (token !== SHARED_SECRET) {
    console.log("ERROR: Invalid token");
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
});

// Authorize endpoint - Updated to match April 2025 Lens Protocol changes
app.post("/authorize", async (req, res) => {
  // Extract all relevant fields for the newer authentication approach
  const { account, signedBy, app, role } = req.body;

  if (!account || !signedBy) {
    console.log("ERROR: Missing 'account' or 'signedBy' field");
    return res.status(400).json({ error: "Missing 'account' or 'signedBy' field" });
  }

  console.log(
    `INFO: Auth request with role '${
      role || "accountOwner"
    }': Wallet ${signedBy} is requesting to authenticate with Account: ${account}, App: ${
      app || "N/A"
    }.`
  );
  console.log(`INFO: Request body: ${JSON.stringify(req.body)}`);

  try {
    // Example validation logic (replace with your own)
    // This should check if the signedBy address is allowed to authenticate as the account
    // based on the role (accountOwner, accountManager, onboardingUser, builder)
    const isAllowed = validateAuthRequest(account, signedBy, app, role);

    if (!isAllowed) {
      console.log(`ERROR: Authentication denied for ${signedBy} to act as ${account}`);
      return res.json({
        allowed: false,
        reason: "User not allowed to authenticate with the requested role",
      });
    }

    // Example sponsored logic (replace with your own)
    // Determines if your app will sponsor transactions for this user
    const isSponsored = determineIfUserIsSponsored(account, signedBy, app);

    // Get the App Signer signing key - this is used by Lens for the new verification approach
    // instead of the previous server-to-server callback
    const signingKey = getAppSigningKey();

    if (!signingKey) {
      console.log("ERROR: No signing key available");
      return res.status(500).json({
        error: "No signing key available",
      });
    }

    const response = {
      allowed: true,
      sponsored: isSponsored,
      signingKey, // Previously this was appVerificationEndpoint
    };

    console.log(
      `INFO: Sending response: ${JSON.stringify({ ...response, signingKey: "REDACTED" })}`
    );
    res.json(response);
  } catch (error) {
    console.error("ERROR: Failed to process authorization request", error);
    res.status(500).json({
      error: "Failed to process authorization request",
    });
  }
});

// Example function to validate an authentication request
function validateAuthRequest(account, signedBy, app, role = "accountOwner") {
  // In a real implementation, you would:
  // 1. Check if the signedBy address is authorized for the requested role
  // 2. Validate against your database or on-chain data
  // 3. Potentially check if the app is registered

  console.log(`INFO: Validating auth request for role '${role}'`);

  // For this example, we're allowing all requests
  return true;
}

// Example function to determine if a user should get sponsored transactions
function determineIfUserIsSponsored(account, signedBy, app) {
  // In a real implementation, you would:
  // 1. Check if the user is eligible for sponsored transactions
  // 2. Apply any business rules for sponsorship

  // For this example, we're not sponsoring any transactions
  return false;
}

// Function to get the app signing key
function getAppSigningKey() {
  // In production, this would likely be managed more securely
  // This is the private key that will be used to sign transactions on behalf of the app
  return PRIVATE_KEY;
}

// Simple OPTIONS handler instead of wildcards which can cause path-to-regexp errors
app.options(
  "/authorize",
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
  })
);

app.options(
  "/",
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
  })
);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for origin: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
  console.log(`Allowing methods: GET, POST`);
  console.log(`Allowing headers: Content-Type, Authorization, x-csrf-token`);
});
