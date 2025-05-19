# NEAR Intents Implementation

This directory contains the implementation of the NEAR Intents system for cross-chain operations between Lens Chain and Base Chain.

## What are Intents?

Intents are declarations of what a user wants to accomplish, without specifying the exact execution path. For example, a user might express the intent:

> "I want to contribute 100 GHO to Syndicate X and purchase a lottery ticket"

Instead of requiring the user to:

1. Approve GHO tokens for the Syndicate treasury
2. Contribute to the Syndicate
3. Wait for treasury to initiate a cross-chain transfer
4. Buy a ticket on Base Chain

Our intent-based system abstracts away this complexity, letting users express their desired outcome in a single transaction.

## Why Intents?

The intent-based approach offers several key advantages over traditional cross-chain methods:

1. **Simplified User Experience**: Users need only submit a single transaction, regardless of the complexity of what they're trying to accomplish
2. **Gas Optimization**: The system can batch operations and find the most gas-efficient execution path
3. **Failure Resistance**: If one step fails, the system can retry or find alternative execution paths
4. **Adaptability**: New execution paths can be added without changing the user interface

Our system provides this as a third alternative to the Safe+Bridging and Smart Contract approaches, giving users flexibility in how they interact with the cross-chain functionality.

## Intent Types

The system supports the following intent types:

1. **JOIN_SYNDICATE (1)**: Contribute funds to a syndicate on Lens Chain
2. **BUY_TICKET (2)**: Buy a lottery ticket for a syndicate on Base Chain (cross-chain operation)
3. **CLAIM_WINNINGS (3)**: Claim winnings from a winning ticket (cross-chain operation)
4. **WITHDRAW_FUNDS (4)**: Withdraw funds from a syndicate (Lens Chain only)

## Overview

The NEAR Intents system allows users to submit an "intent" (e.g., "join syndicate with 10 GHO") on Lens Chain, and resolver contracts determine the optimal execution path across chains. This approach improves user experience by enabling single-transaction operations for cross-chain functionality.

## Components

### Smart Contracts

- **SyndicateIntentResolver.sol**: Intent resolver on Lens Chain

  - Deployed at: `0x21F6514fdabaD6aB9cB227ddE69A1c34C9cF9014`
  - Chain ID: 232 (Lens Chain)
  - Processes user intent submissions for joining syndicates or buying tickets

- **BaseChainIntentResolver.sol**: Intent resolver on Base Chain
  - Deployed at: `0xecF8095577EA91cFd1aBe6f59Aaad597622a9Fd3`
  - Chain ID: 8453 (Base Chain)
  - Receives bridged assets and processes intents on Base Chain

### Off-Chain Processor

The `OffChainProcessor.js` handles the coordination between the two chains:

- Monitors events from both chains using WebSocket connections
- Processes intent submissions and cross-chain operations
- Tracks execution status and handles retries
- Integrates with the database to store intent and transaction data

### Deployed Contract Details

| Contract                | Address                                    | Chain      | Chain ID |
| ----------------------- | ------------------------------------------ | ---------- | -------- |
| SyndicateIntentResolver | 0x21F6514fdabaD6aB9cB227ddE69A1c34C9cF9014 | Lens Chain | 232      |
| BaseChainIntentResolver | 0xecF8095577EA91cFd1aBe6f59Aaad597622a9Fd3 | Base Chain | 8453     |
| Across SpokePool        | 0xe7cb3e167e7475dE1331Cf6E0CEb187654619E12 | Lens Chain | 232      |
| TicketRegistry          | 0x86e2d8A3eAcfa89295a75116e9489f07CFBd198B | Base Chain | 8453     |
| CrossChainResolver      | 0x07B73B99fbB0F82f981A5954A7f3Fd72Ce391c2F | Base Chain | 8453     |
| MegapotLottery          | 0xbEDd4F2beBE9E3E636161E644759f3cbe3d51B95 | Base Chain | 8453     |

### Mock Implementations

For development and testing purposes, several parts of the system are currently using mock implementations:

1. **Across Protocol Integration**

   The Across Protocol integration is currently mocked in the OffChainProcessor:

   ```javascript
   // Original Across SDK implementation (commented out)
   // const { Across } = require("@across-protocol/sdk-v2");
   // this.across = new Across({
   //   chainId: config.lensChainId,
   //   signer: this.lensWallet,
   // });

   // Mock implementation for deposit status checking
   console.log(`Simulating deposit status check for intent ${intentId}`);
   const depositStatus = Math.random() > 0.5 ? "completed" : "in_progress";
   ```

   **Reason**: The Across Protocol SDK required updates to be compatible with:

   - ethers.js v6 (upgraded from v5)
   - Lens Chain as a supported network

   The mock implementation allows us to test the overall system flow while these updates are in progress with the Across team.

   **Issues Encountered with Across SDK on Mainnet**:

   We encountered several challenges with the Across Protocol SDK when trying to use it on mainnet:

   1. **Ethers.js Version Compatibility**: The current Across SDK (@across-protocol/sdk-v2) is built for ethers.js v5, but our system uses ethers.js v6, causing breaking changes in the API. Attempting to use ethers v5 alongside v6 created dependency conflicts and doubled our bundle size.

   2. **Lens Chain Support**: The Across SDK doesn't yet fully support Lens Chain as a source chain for deposits. While Across has deployed contracts to Lens Chain (SpokePool at `0xe7cb3e167e7475dE1331Cf6E0CEb187654619E12`), the SDK requires updates to recognize the chain ID (232) and set appropriate parameters.

   3. **Deposit Tracking**: The SDK's deposit tracking methods (`getDepositStatus()`) returned errors when queried for deposits initiated from Lens Chain.

   4. **Bridge Fee Calculation**: The fee calculation methods encountered errors when Lens Chain was specified as the source chain.

   **Next Steps**:

   We plan to:

   1. Test the integration on testnet first, where we can debug with smaller amounts
   2. Work directly with the Across Protocol team to update their SDK for Lens Chain support
   3. Potentially fork and modify the SDK to work with ethers.js v6 if official support isn't available soon
   4. Share these notes with the Across Protocol team to assist with their Lens Chain integration

2. **Database Integration**

   The system uses Sequelize ORM with PostgreSQL for intent and transaction tracking:

   ```
   intents table: Stores intent details and status
   transactions table: Tracks transactions across both chains
   ```

   The database structure is production-ready, but additional indexes and optimizations may be needed for high throughput.

## Implementation Details

### Real-Time Event Monitoring

The processor uses WebSocket connections to listen for blockchain events in real-time:

```javascript
// Initialize WebSocket providers
this.lensProvider = new ethers.WebSocketProvider(config.lensRpcUrl);
this.baseProvider = new ethers.WebSocketProvider(config.baseRpcUrl);

// Connect wallet to providers
this.lensWallet = this.wallet.connect(this.lensProvider);
this.baseWallet = this.wallet.connect(this.baseProvider);
```

This implementation ensures:

- Real-time notification of events without polling
- Reduced latency in processing intents
- Better resource utilization

### Event Listeners

The processor sets up event listeners for key events:

1. `IntentSubmitted`: When a new intent is submitted on Lens Chain
2. `CrossChainOperationInitiated`: When a cross-chain operation is started
3. `WinningTicketDetected`: When a winning ticket is detected on Base Chain

### Graceful Shutdown

The processor includes proper cleanup for WebSocket connections:

```javascript
async stop() {
  console.log("Stopping intent processor...");

  // Remove all event listeners
  this.intentResolver.removeAllListeners();
  this.crossChainResolver.removeAllListeners();

  // Close WebSocket connections
  await this.lensProvider.destroy();
  await this.baseProvider.destroy();

  console.log("Intent processor stopped");
}
```

## Requirements

To run the intent processor, you need:

1. **WebSocket RPC Endpoints**:

   - For Lens Chain: `wss://...` (instead of `https://...`)
   - For Base Chain: `wss://...` (instead of `https://...`)

2. **Environment Variables**:

   ```
   # Contract addresses
   LENS_INTENT_RESOLVER=0x21F6514fdabaD6aB9cB227ddE69A1c34C9cF9014
   BASE_INTENT_RESOLVER=0xecF8095577EA91cFd1aBe6f59Aaad597622a9Fd3
   CROSS_CHAIN_RESOLVER=0xe7cb3e167e7475dE1331Cf6E0CEb187654619E12
   TICKET_REGISTRY=<ticket_registry_address>

   # WebSocket RPC URLs
   LENS_RPC_URL=wss://...
   BASE_RPC_URL=wss://...

   # Security
   PRIVATE_KEY=<wallet_private_key>

   # Database
   DATABASE_URL=<database_connection_string>
   ```

## Starting the Processor

Run the processor with:

```bash
node scripts/start-intent-processor.js
```

This will initialize the WebSocket connections and start listening for events on both chains.

## Flow Sequence

1. User submits intent on Lens Chain via SyndicateIntentResolver
2. Intent processor detects the IntentSubmitted event
3. Processor monitors/facilitates cross-chain operation via Across Protocol
4. BaseChainIntentResolver executes the intent on Base Chain
5. Any winning events are detected and processed back to Lens Chain

## Future Improvements

- Replace mock Across integration with fully functional SDK when updates are available
- Implement polling fallback for RPC providers that don't support WebSockets
- Add more sophisticated retry mechanisms with exponential backoff
- Implement batch processing of similar intents for gas optimization
- Add analytics and monitoring dashboard

## Production Readiness Considerations

To move from the current development setup to production:

1. **Replace Mock Implementations**:

   - Implement full Across Protocol SDK integration once updated
   - Use specialized RPC providers that support WebSocket connections

2. **Enhance Error Handling**:

   - Add more robust error recovery mechanisms
   - Implement dead-letter queues for failed intents
   - Create automated alerts for system operators

3. **Optimize Database**:

   - Add performance indexes to the database tables
   - Implement connection pooling and query optimization
   - Set up database archiving for historical intents

4. **Security Measures**:

   - Implement comprehensive validation for all inputs
   - Rotate wallet keys securely
   - Add rate limiting to prevent DoS attacks

5. **Lens Chain Optimizations**:
   - Tune WebSocket connections specifically for Lens Chain's requirements
   - Implement Lens Chain-specific gas price strategies
   - Create custom error mapping for Lens Chain error codes
