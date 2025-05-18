require("dotenv/config");

const express = require("express");
const cors = require('cors');

const { PORT, PRIVATE_KEY, SHARED_SECRET } = require("./config");

const cookieParser = require('cookie-parser');
const { csrfMiddleware } = require('./csrf');

const app = express();

// Configure CORS - use a string for origin, not URL object
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
}));

app.use(express.json());
app.use(cookieParser());
app.use(csrfMiddleware);

// Health check endpoint
app.get("/", function (_, res) {
  res.json({ online: true });
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

// Authorize endpoint
app.post("/authorize", async (req, res) => {
  const { account, signedBy } = req.body;

  if (!account || !signedBy) {
    console.log("ERROR: Missing 'account' or 'signedBy' field");
    return res.status(400).json({ error: "Missing 'account' or 'signedBy' field" });
  }

  console.log(`INFO: Wallet ${signedBy} is requesting to authenticate with Account: ${account}.`);
  console.log(`INFO: Request body: ${JSON.stringify(req.body)}`);

  // Example validation logic (replace with your own)
  const isAllowed = true; // Set to false if the user is not allowed to login

  if (!isAllowed) {
    return res.json({ allowed: false, reason: "User not allowed to login" });
  }

  // Example sponsored logic (replace with your own)
  const isSponsored = false; // Set to true if the user is sponsored

  const response = {
    allowed: true,
    sponsored: isSponsored,
    signingKey: PRIVATE_KEY,
  };
  
  console.log(`INFO: Sending response: ${JSON.stringify({...response, signingKey: 'REDACTED'})}`);
  res.json(response);
});

// Simple OPTIONS handler instead of wildcards which can cause path-to-regexp errors
app.options('/authorize', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
}));

app.options('/', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
}));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`Allowing methods: GET, POST`);
  console.log(`Allowing headers: Content-Type, Authorization, x-csrf-token`);
});
