const { DataTypes } = require("sequelize");

/**
 * Transaction model definition
 *
 * @param {object} sequelize - Sequelize instance
 * @returns {object} Transaction model
 */
module.exports = (sequelize) => {
  const Transaction = sequelize.define(
    "Transaction",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      intentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Reference to the intent this transaction belongs to",
        field: "intent_id",
      },
      chainId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Chain ID where this transaction was submitted",
        field: "chain_id",
      },
      txHash: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Transaction hash",
        field: "tx_hash",
      },
      type: {
        type: DataTypes.ENUM("APPROVAL", "INTENT_SUBMISSION", "BRIDGE", "TICKET_PURCHASE"),
        allowNull: false,
        comment: "Type of transaction",
      },
      status: {
        type: DataTypes.ENUM("PENDING", "CONFIRMED", "FAILED"),
        allowNull: false,
        defaultValue: "PENDING",
        comment: "Current status of the transaction",
      },
      blockNumber: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Block number where the transaction was confirmed",
        field: "block_number",
      },
      gasUsed: {
        type: DataTypes.STRING, // Using STRING for BigInt compatibility
        allowNull: true,
        comment: "Gas used by the transaction",
        field: "gas_used",
      },
      gasFee: {
        type: DataTypes.STRING, // Using STRING for BigInt compatibility
        allowNull: true,
        comment: "Gas fee in wei",
        field: "gas_fee",
      },
      data: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Additional transaction data",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "updated_at",
      },
    },
    {
      tableName: "transactions",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: "transactions_intent_id_idx",
          fields: ["intent_id"],
        },
        {
          name: "transactions_tx_hash_idx",
          fields: ["tx_hash"],
        },
        {
          name: "transactions_chain_id_idx",
          fields: ["chain_id"],
        },
        {
          name: "transactions_status_idx",
          fields: ["status"],
        },
      ],
    }
  );

  return Transaction;
};
