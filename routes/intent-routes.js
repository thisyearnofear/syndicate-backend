/**
 * @file intent-routes.js
 * @description Routes for intent-related API endpoints
 */

const express = require("express");
const intentController = require("../controllers/intent-controller");
const { authenticate } = require("../middleware/auth");
const { adminOnly } = require("../middleware/admin");

const router = express.Router();

/**
 * @route POST /api/intents
 * @description Submit a new intent
 * @access Private (requires authentication)
 */
router.post("/", authenticate, intentController.submitIntent);

/**
 * @route GET /api/intents/:intentId
 * @description Get an intent by ID
 * @access Public
 */
router.get("/:intentId", intentController.getIntent);

/**
 * @route GET /api/intents/user/:address
 * @description Get all intents for a user
 * @access Public
 */
router.get("/user/:address", intentController.getUserIntents);

/**
 * @route PUT /api/intents/:intentId
 * @description Update an intent (admin only)
 * @access Private (requires admin)
 */
router.put("/:intentId", authenticate, adminOnly, intentController.updateIntent);

module.exports = router;
