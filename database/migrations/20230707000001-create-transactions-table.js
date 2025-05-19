"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("transactions", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      intent_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "intents",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "Reference to the intent this transaction belongs to",
      },
      chain_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Chain ID where this transaction was submitted",
      },
      tx_hash: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Transaction hash",
      },
      type: {
        type: Sequelize.ENUM("APPROVAL", "INTENT_SUBMISSION", "BRIDGE", "TICKET_PURCHASE"),
        allowNull: false,
        comment: "Type of transaction",
      },
      status: {
        type: Sequelize.ENUM("PENDING", "CONFIRMED", "FAILED"),
        allowNull: false,
        defaultValue: "PENDING",
        comment: "Current status of the transaction",
      },
      block_number: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Block number where the transaction was confirmed",
      },
      gas_used: {
        type: Sequelize.STRING, // Using STRING for BigInt compatibility
        allowNull: true,
        comment: "Gas used by the transaction",
      },
      gas_fee: {
        type: Sequelize.STRING, // Using STRING for BigInt compatibility
        allowNull: true,
        comment: "Gas fee in wei",
      },
      data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Additional transaction data",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes
    await queryInterface.addIndex("transactions", ["intent_id"], {
      name: "transactions_intent_id_idx",
    });
    await queryInterface.addIndex("transactions", ["tx_hash"], {
      name: "transactions_tx_hash_idx",
    });
    await queryInterface.addIndex("transactions", ["chain_id"], {
      name: "transactions_chain_id_idx",
    });
    await queryInterface.addIndex("transactions", ["status"], {
      name: "transactions_status_idx",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("transactions");
  },
};
