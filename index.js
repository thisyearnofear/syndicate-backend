require("dotenv/config");

const express = require("express");

const { PORT, SHARED_SECRET } = require("./config");
const { approver } = require("./approver");

const app = express();

app.use(express.json());

// Health check endpoint
app.get("/", function (_, res) {
  res.json({ online: true });
});

// Secure endpoints with shared secret
app.use("/:sharedSecret", (req, res, next) => {
  const { sharedSecret } = req.params;

  console.log(`INFO: ${req.method} ${req.originalUrl.replace(/\/[^/]+/, "/[REDACTED]")}`);

  if (sharedSecret !== SHARED_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
});

// Authorize endpoint
app.post("/:sharedSecret/authorize", async (req, res) => {
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

  // in vercel `protocol` is `http`, but `x-forwarded-proto` is `https`
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");
  const fullDomain = `${protocol}://${host}`;

  res.json({
    allowed: true,
    sponsored: isSponsored,
    appVerificationEndpoint: `${fullDomain}/${SHARED_SECRET}/verify-operation`,
  });
});

// Operation verification endpoint
app.post("/:sharedSecret/verify-operation", async (req, res) => {
  const requiredFields = ["deadline", "nonce", "operation", "account", "validator"];
  const missingFields = requiredFields.filter((field) => !req.body[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      allowed: false,
      reason: `The following field(s) are missing: ${missingFields.join(", ")}`,
    });
  }

  console.log(
    `INFO: Account ${req.body.account} is requesting to verify ${req.body.operation} operation.`
  );

  // Validate if the account is authorized to perform the requested operation
  const isAllowed = true; // Replace with your validation logic

  if (!isAllowed) {
    return res.json({
      allowed: false,
      reason: "Operation not allowed for this account",
    });
  }

  // Sign the operation approval
  const signature = await approver.signOperationApproval(req.body);

  res.json({
    allowed: true,
    signature,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
