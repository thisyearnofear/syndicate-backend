const { DataTypes } = require("sequelize");

/**
 * Intent model definition
 *
 * @param {object} sequelize - Sequelize instance
 * @returns {object} Intent model
 */
module.exports = (sequelize) => {
  const Intent = sequelize.define(
    "Intent",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      intentId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: "Blockchain intent ID (bytes32 hash)",
        field: "intent_id",
      },
      user: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Ethereum address of the user who submitted the intent",
      },
      intentType: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Type of intent (1=JOIN_SYNDICATE, 2=BUY_TICKET, etc.)",
        field: "intent_type",
      },
      syndicateAddress: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Ethereum address of the syndicate",
        field: "syndicate_address",
      },
      amount: {
        type: DataTypes.STRING, // Using STRING for BigInt compatibility
        allowNull: false,
        comment: "Amount in wei",
      },
      tokenAddress: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Token address (e.g. GHO)",
        field: "token_address",
      },
      sourceChainId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Source chain ID",
        field: "source_chain_id",
      },
      destinationChainId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Destination chain ID",
        field: "destination_chain_id",
      },
      useOptimalRoute: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Whether to use optimal routing",
        field: "use_optimal_route",
      },
      maxFeePercentage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Maximum fee percentage in basis points (100 = 1%)",
        field: "max_fee_percentage",
      },
      deadline: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: "Deadline timestamp",
      },
      status: {
        type: DataTypes.ENUM("PENDING", "EXECUTING", "COMPLETED", "FAILED"),
        allowNull: false,
        defaultValue: "PENDING",
        comment: "Current status of the intent",
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Additional metadata for the intent",
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
      tableName: "intents",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: "intents_user_idx",
          fields: ["user"],
        },
        {
          name: "intents_syndicate_address_idx",
          fields: ["syndicate_address"],
        },
        {
          name: "intents_status_idx",
          fields: ["status"],
        },
      ],
    }
  );

  return Intent;
};
