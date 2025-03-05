const { privateKeyToAccount } = require("viem/accounts");
const { evmAddress } = require("@lens-protocol/client");
const { OperationApprovalSigner } = require("@lens-protocol/client/viem");

const { APP, CHAIN, PRIVATE_KEY } = require("./config");

exports.approver = new OperationApprovalSigner({
  chain: CHAIN,
  app: evmAddress(APP),
  signer: privateKeyToAccount(PRIVATE_KEY),
});
