require("dotenv/config");

const express = require("express");

const { PORT, PRIVATE_KEY, SHARED_SECRET } = require("./config");

const app = express();

app.use(express.json());

// Health check endpoint
app.get("/", function (_, res) {
  res.json({ online: true });
});

// Middleware to verify Authorization header
app.use((req, res, next) => {
  const authHeader = req.headers["authorization"];
  console.log(`INFO: ${req.method} ${req.originalUrl}`);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (token !== SHARED_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
});

// Authorize endpoint
app.post("/authorize", async (req, res) => {
  const { account, signedBy } = req.body;

  if (!account || !signedBy) {
    return res.status(400).json({ error: "Missing 'account' or 'signedBy' field" });
  }

  console.log(`INFO: Wallet ${signedBy} is requesting to authenticate with Account: ${account}.`);

  // Example validation logic (replace with your own)
  const isAllowed = true; // Set to false if the user is not allowed to login

  if (!isAllowed) {
    return res.json({ allowed: false, reason: "User not allowed to login" });
  }

  // Example sponsored logic (replace with your own)
  const isSponsored = false; // Set to true if the user is sponsored

  res.json({
    allowed: true,
    sponsored: isSponsored,
    signingKey: PRIVATE_KEY,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
