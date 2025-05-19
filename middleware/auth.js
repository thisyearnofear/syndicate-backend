/**
 * @file auth.js
 * @description Authentication middleware
 */

const { SHARED_SECRET } = require("../config");

/**
 * Authentication middleware
 * Verifies the JWT token in the Authorization header
 *
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @param {function} next Express next function
 */
exports.authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (token !== SHARED_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // For now, we're just checking the shared secret
    // In a real implementation, we would verify a JWT token
    // and extract user details from it

    // Mock user object for development
    req.user = {
      address: "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
      isAdmin: false,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
};
