const { Sequelize } = require("sequelize");
const config = require("./config");
const IntentModel = require("../models/intent");
const TransactionModel = require("../models/transaction");

// Import environment to determine which configuration to use
const env = process.env.NODE_ENV || "development";
const dbConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize(dbConfig.url, dbConfig);

// Initialize models
const db = {
  Intent: IntentModel(sequelize),
  Transaction: TransactionModel(sequelize),
  sequelize,
  Sequelize,
};

// Define associations
db.Intent.hasMany(db.Transaction, {
  foreignKey: "intentId",
  as: "transactions",
});

db.Transaction.belongsTo(db.Intent, {
  foreignKey: "intentId",
  as: "intent",
});

// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
}

// Export the db object
module.exports = {
  ...db,
  testConnection,
};
