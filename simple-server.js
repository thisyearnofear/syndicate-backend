require("dotenv/config");

const express = require("express");
const cors = require("cors");

const PORT = process.env.PORT || 3003;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SHARED_SECRET = process.env.SHARED_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

if (!PRIVATE_KEY) {
  console.error("ERROR: PRIVATE_KEY environment variable is required");
  process.exit(1);
}

if (!SHARED_SECRET) {
  console.error("ERROR: SHARED_SECRET environment variable is required");
  process.exit(1);
}

const app = express();

// Enhanced CORS setup with environment variable support
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// Parse JSON requests
app.use(express.json());

// Root endpoint for basic checks
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

// Simple authorization middleware
app.use((req, res, next) => {
  // Skip auth check for health check endpoints
  if ((req.path === "/" || req.path === "/health") && req.method === "GET") {
    return next();
  }

  const authHeader = req.headers["authorization"];
  console.log(`INFO: ${req.method} ${req.originalUrl}`);

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

// Authorize endpoint
app.post("/authorize", async (req, res) => {
  const { account, signedBy } = req.body;

  if (!account || !signedBy) {
    console.log("ERROR: Missing 'account' or 'signedBy' field");
    return res.status(400).json({ error: "Missing 'account' or 'signedBy' field" });
  }

  console.log(`INFO: Wallet ${signedBy} is requesting to authenticate with Account: ${account}.`);

  // Always allow authentication in simplified version
  const isAllowed = true;
  const isSponsored = false;

  const response = {
    allowed: isAllowed,
    sponsored: isSponsored,
    signingKey: PRIVATE_KEY,
  };

  console.log(`INFO: Sending response: ${JSON.stringify({ ...response, signingKey: "REDACTED" })}`);
  res.json(response);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for origin: ${FRONTEND_URL}`);
});
