const never = require("never");
const { chains } = require("@lens-chain/sdk/viem");

exports.PORT = process.env.PORT || 3003;

exports.APP = process.env.APP ?? never("APP env variable is required");

exports.PRIVATE_KEY = process.env.PRIVATE_KEY ?? never("PRIVATE_KEY env variable is required");

exports.SHARED_SECRET =
  process.env.SHARED_SECRET ?? never("SHARED_SECRET env variable is required");

const ENVIRONMENT = process.env.ENVIRONMENT ?? never("ENVIRONMENT env variable is required");

exports.CHAIN = ENVIRONMENT.toLowerCase() === "mainnet" ? chains.mainnet : chains.testnet;
