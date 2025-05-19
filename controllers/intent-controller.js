/**
 * @file intent-controller.js
 * @description Controller for intent-related API endpoints
 */

const db = require("../database");
const ethers = require("ethers");

/**
 * Submit a new intent
 * @param {object} req Express request object
 * @param {object} res Express response object
 */
exports.submitIntent = async (req, res) => {
  try {
    const {
      intentType,
      syndicateAddress,
      amount,
      tokenAddress,
      sourceChainId,
      destinationChainId,
      useOptimalRoute = true,
      maxFeePercentage = 0,
      deadline,
    } = req.body;

    // Validate required fields
    if (
      !intentType ||
      !syndicateAddress ||
      !amount ||
      !tokenAddress ||
      !sourceChainId ||
      !destinationChainId ||
      !deadline
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate a unique intent ID (this would normally be done by the contract)
    const intentId =
      "0x" +
      ethers.utils
        .keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["address", "uint256", "address", "uint8", "uint256"],
            [req.user.address, Date.now(), syndicateAddress, intentType, amount]
          )
        )
        .substr(2, 64);

    // Create the intent in the database
    const intent = await db.Intent.create({
      intentId,
      user: req.user.address,
      intentType,
      syndicateAddress,
      amount,
      tokenAddress,
      sourceChainId,
      destinationChainId,
      useOptimalRoute,
      maxFeePercentage,
      deadline,
      status: "PENDING",
      metadata: req.body.metadata || {},
    });

    // For now, the actual submission to the blockchain would happen separately
    // In a real implementation, we would sign and submit the transaction here

    res.status(201).json({
      intentId: intent.intentId,
      status: intent.status,
      createdAt: intent.createdAt,
    });
  } catch (error) {
    console.error("Error submitting intent:", error);
    res.status(500).json({ error: "Failed to submit intent" });
  }
};

/**
 * Get an intent by ID
 * @param {object} req Express request object
 * @param {object} res Express response object
 */
exports.getIntent = async (req, res) => {
  try {
    const { intentId } = req.params;

    const intent = await db.Intent.findOne({
      where: { intentId },
      include: [
        {
          model: db.Transaction,
          as: "transactions",
          attributes: ["chainId", "txHash", "status", "type", "createdAt"],
        },
      ],
    });

    if (!intent) {
      return res.status(404).json({ error: "Intent not found" });
    }

    res.json({
      intentId: intent.intentId,
      status: intent.status,
      user: intent.user,
      intentType: intent.intentType,
      syndicateAddress: intent.syndicateAddress,
      amount: intent.amount,
      sourceChainId: intent.sourceChainId,
      destinationChainId: intent.destinationChainId,
      transactions: intent.transactions,
      createdAt: intent.createdAt,
      updatedAt: intent.updatedAt,
    });
  } catch (error) {
    console.error("Error getting intent:", error);
    res.status(500).json({ error: "Failed to get intent" });
  }
};

/**
 * Get all intents for a user
 * @param {object} req Express request object
 * @param {object} res Express response object
 */
exports.getUserIntents = async (req, res) => {
  try {
    const { address } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: intents } = await db.Intent.findAndCountAll({
      where: { user: address },
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: ["intentId", "intentType", "syndicateAddress", "status", "createdAt"],
    });

    res.json({
      intents,
      count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Error getting user intents:", error);
    res.status(500).json({ error: "Failed to get user intents" });
  }
};

/**
 * Update an intent (admin only)
 * @param {object} req Express request object
 * @param {object} res Express response object
 */
exports.updateIntent = async (req, res) => {
  try {
    const { intentId } = req.params;
    const { status } = req.body;

    if (!status || !["PENDING", "EXECUTING", "COMPLETED", "FAILED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const intent = await db.Intent.findOne({
      where: { intentId },
    });

    if (!intent) {
      return res.status(404).json({ error: "Intent not found" });
    }

    // Update the intent
    await intent.update({ status });

    res.json({
      intentId: intent.intentId,
      status: intent.status,
      updatedAt: intent.updatedAt,
    });
  } catch (error) {
    console.error("Error updating intent:", error);
    res.status(500).json({ error: "Failed to update intent" });
  }
};
