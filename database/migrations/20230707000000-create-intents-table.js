"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("intents", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      intent_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: "Blockchain intent ID (bytes32 hash)",
      },
      user: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Ethereum address of the user who submitted the intent",
      },
      intent_type: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Type of intent (1=JOIN_SYNDICATE, 2=BUY_TICKET, etc.)",
      },
      syndicate_address: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Ethereum address of the syndicate",
      },
      amount: {
        type: Sequelize.STRING, // Using STRING for BigInt compatibility
        allowNull: false,
        comment: "Amount in wei",
      },
      token_address: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Token address (e.g. GHO)",
      },
      source_chain_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Source chain ID",
      },
      destination_chain_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Destination chain ID",
      },
      use_optimal_route: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Whether to use optimal routing",
      },
      max_fee_percentage: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Maximum fee percentage in basis points (100 = 1%)",
      },
      deadline: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: "Deadline timestamp",
      },
      status: {
        type: Sequelize.ENUM("PENDING", "EXECUTING", "COMPLETED", "FAILED"),
        allowNull: false,
        defaultValue: "PENDING",
        comment: "Current status of the intent",
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Additional metadata for the intent",
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
    await queryInterface.addIndex("intents", ["user"], {
      name: "intents_user_idx",
    });
    await queryInterface.addIndex("intents", ["syndicate_address"], {
      name: "intents_syndicate_address_idx",
    });
    await queryInterface.addIndex("intents", ["status"], {
      name: "intents_status_idx",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("intents");
  },
};
