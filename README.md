# Syndicate Backend

This backend server powers the Syndicate cross-chain platform, providing critical infrastructure for both Lens authentication and our intent-based cross-chain operations.

## Overview

The backend serves multiple critical functions in the Syndicate architecture:

1. **Lens Authentication**: Handles authorization and authentication for Lens Protocol
2. **Intent Processing**: Manages the execution of cross-chain intents
3. **Event Monitoring**: Tracks blockchain events on both Lens Chain and Base Chain
4. **API Layer**: Provides a unified interface for the frontend to interact with multiple chains

## Getting Started

### Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
4. Fill out the environment variables:
   ```bash
   PRIVATE_KEY=INSERT_PRIVATE_KEY
   ENVIRONMENT=MAINNET|TESTNET
   SHARED_SECRET=INSERT_SECRET
   LENS_RPC_URL=INSERT_LENS_RPC_URL
   BASE_RPC_URL=INSERT_BASE_RPC_URL
   LENS_INTENT_RESOLVER=INSERT_CONTRACT_ADDRESS
   BASE_INTENT_RESOLVER=INSERT_CONTRACT_ADDRESS
   CROSS_CHAIN_RESOLVER=INSERT_CONTRACT_ADDRESS
   TICKET_REGISTRY=INSERT_CONTRACT_ADDRESS
   DATABASE_URL=INSERT_DATABASE_URL
   ```

### Running

Start the development server:

```bash
npm run dev
```

For production:

```bash
npm start
```

## Architecture

Our backend architecture is designed to support multiple cross-chain approaches, with a focus on our new intent-based system:

### Core Services

1. **Authentication Service**

   - Handles Lens authentication and authorization
   - Manages user permissions for intent submission
   - Provides secure token issuance for protected API endpoints

2. **Intent Processing Service**

   - Processes intent submissions from users
   - Tracks intent execution status
   - Manages cross-chain operations through various bridge providers

3. **Event Monitoring Service**

   - Listens for blockchain events on both Lens Chain and Base Chain
   - Triggers appropriate actions based on events (e.g., winning ticket detection)
   - Updates intent status and notifies users of state changes

4. **API Gateway**
   - Provides a unified API for frontend interactions
   - Handles request validation and rate limiting
   - Routes requests to appropriate microservices

### Database Schema

```
intents
├── id (primary key)
├── intentId (bytes32)
├── user (address)
├── intentType (uint8)
├── syndicateAddress (address)
├── amount (uint256)
├── sourceChain (uint32)
├── destinationChain (uint32)
├── status (enum: PENDING, EXECUTING, COMPLETED, FAILED)
├── createdAt (timestamp)
├── updatedAt (timestamp)
└── metadata (json)

transactions
├── id (primary key)
├── intentId (foreign key)
├── chainId (uint32)
├── txHash (string)
├── status (enum: PENDING, CONFIRMED, FAILED)
├── type (enum: APPROVAL, INTENT_SUBMISSION, BRIDGE, TICKET_PURCHASE)
├── createdAt (timestamp)
└── updatedAt (timestamp)

syndicates
├── id (primary key)
├── address (address)
├── name (string)
├── cause (string)
├── causeAddress (address)
├── causePercentage (uint256)
├── createdAt (timestamp)
└── updatedAt (timestamp)

tickets
├── id (primary key)
├── ticketId (uint256)
├── syndicateId (foreign key)
├── amount (uint256)
├── status (enum: ACTIVE, WON, LOST)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

## Implementation Plan for Intent-Based System

### Phase 1: Core Infrastructure (Complete)

1. **Off-Chain Processor Implementation**

   - [x] Create database models for intent tracking (models/intent.js, models/transaction.js)
   - [x] Set up Sequelize ORM integration with PostgreSQL
   - [x] Implement the OffChainProcessor service with ethers v6
   - [x] Add event listeners for intent submissions using WebSocket providers
   - [x] Build error handling and retry mechanisms

2. **API Development**

   - [x] Basic authentication endpoints
   - [ ] Create REST endpoints for intent submission
   - [ ] Build status tracking endpoints
   - [ ] Implement WebSocket server for real-time updates
   - [ ] Add authentication middleware for secure access

3. **Database Integration**

   - [ ] Set up connection pool and database config
   - [ ] Create migrations for the defined schema
   - [ ] Implement model associations
   - [ ] Add indexing for efficient queries
   - [ ] Establish backup and recovery procedures

4. **Contract Interaction Layer**
   - [ ] Create service for interacting with intent resolver contracts
   - [ ] Implement transaction signing and submission
   - [ ] Build retry logic for failed transactions
   - [ ] Create gas price estimation and optimization

### Phase 2: Enhanced Features (Month 2-3)

1. **Meta-Transactions Support**

   - [ ] Implement relayer service for gasless transactions
   - [ ] Create signature verification for meta-transactions
   - [ ] Build rate limiting and anti-spam protection
   - [ ] Add monitoring for relayer health

2. **Intent Batching**

   - [ ] Create batch processing service for similar intents
   - [ ] Implement optimization algorithms for batch creation
   - [ ] Build splitting logic for partially failed batches
   - [ ] Create APIs for batch status tracking

3. **Bridge Provider Abstraction**

   - [ ] Create adapter interfaces for multiple bridge providers
   - [ ] Implement Across Protocol adapter
   - [ ] Add support for additional bridges (LayerZero, Axelar)
   - [ ] Build fallback mechanisms for bridge failures

4. **Analytics Engine**
   - [ ] Create data aggregation for intent metrics
   - [ ] Implement reporting on cross-chain operations
   - [ ] Build dashboard APIs for frontend visualization
   - [ ] Set up alerting for system anomalies

### Phase 3: Advanced Integration (Month 4-6)

1. **Account Abstraction Integration**

   - [ ] Create support for ERC-4337 user operations
   - [ ] Implement bundler service for transaction bundling
   - [ ] Build sponsorship mechanisms for gas fees
   - [ ] Create adapters for popular smart account implementations

2. **Dynamic Routing Engine**

   - [ ] Implement pathfinding algorithms for optimal cross-chain routes
   - [ ] Create fee estimation across multiple bridges
   - [ ] Build caching for commonly used routes
   - [ ] Implement automatic route selection based on user preferences

3. **Lens Social Integration**

   - [ ] Create APIs for social sharing of intent actions
   - [ ] Implement notification service for social interactions
   - [ ] Build leaderboards for syndicate participation
   - [ ] Create engagement metrics for social features

4. **Production Hardening**
   - [ ] Implement comprehensive monitoring with Prometheus/Grafana
   - [ ] Set up distributed tracing for cross-service debugging
   - [ ] Create auto-scaling for high traffic periods
   - [ ] Build disaster recovery procedures

## API Documentation

### Authorization Endpoints

#### POST /authorize

Authenticate with Lens Protocol.

**Request:**

```json
{
  "account": "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
  "signedBy": "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB"
}
```

**Response:**

```json
{
  "allowed": true,
  "sponsored": false,
  "signingKey": "<PRIVATE_KEY>"
}
```

### Intent Endpoints

#### POST /api/intents

Submit a new intent.

**Request:**

```json
{
  "intentType": 1,
  "syndicateAddress": "0x123...",
  "amount": "100000000000000000000",
  "tokenAddress": "0xGHO...",
  "sourceChainId": 1337,
  "destinationChainId": 1337,
  "useOptimalRoute": true,
  "maxFeePercentage": 0,
  "deadline": 1682432356
}
```

**Response:**

```json
{
  "intentId": "0x1234...",
  "status": "PENDING",
  "createdAt": "2023-04-25T14:45:23Z"
}
```

#### GET /api/intents/:intentId

Get the status of an intent.

**Response:**

```json
{
  "intentId": "0x1234...",
  "status": "EXECUTING",
  "transactions": [
    {
      "chainId": 1337,
      "txHash": "0x5678...",
      "status": "CONFIRMED",
      "type": "INTENT_SUBMISSION"
    },
    {
      "chainId": 8453,
      "txHash": "0x9abc...",
      "status": "PENDING",
      "type": "BRIDGE"
    }
  ],
  "createdAt": "2023-04-25T14:45:23Z",
  "updatedAt": "2023-04-25T14:47:12Z"
}
```

#### GET /api/user/:address/intents

Get all intents for a user.

**Response:**

```json
{
  "intents": [
    {
      "intentId": "0x1234...",
      "intentType": 1,
      "syndicateAddress": "0x123...",
      "status": "COMPLETED",
      "createdAt": "2023-04-25T14:45:23Z"
    },
    {
      "intentId": "0x5678...",
      "intentType": 2,
      "syndicateAddress": "0x123...",
      "status": "EXECUTING",
      "createdAt": "2023-04-25T15:12:08Z"
    }
  ],
  "count": 2
}
```

#### WebSocket: /ws/intents/:intentId

Real-time updates for intent status.

**Events:**

- `status_change`: When intent status changes
- `transaction_submitted`: When a new transaction is submitted
- `transaction_confirmed`: When a transaction is confirmed
- `intent_completed`: When an intent is fully completed
- `intent_failed`: When an intent fails

## Next Steps for Implementation

Based on our current repository state, here are the immediate next steps to expand the backend functionality:

1. **Database Integration**

   - Set up Sequelize ORM with PostgreSQL or MySQL
   - Create database connection configuration
   - Implement model associations and migrations

2. **Intent Processing Service**

   - Integrate the existing OffChainProcessor.js into the backend
   - Add event listeners for blockchain events
   - Create services for intent tracking and execution

3. **API Development**

   - Expand current Express server with intent endpoints
   - Implement WebSocket server for real-time updates
   - Add validation middleware for secure API access

4. **Frontend/Backend Communication**

   - Create comprehensive API documentation
   - Implement status tracking with WebSocket updates
   - Add error handling and recovery mechanisms

5. **Monitoring and Analytics**
   - Set up logging infrastructure
   - Create analytics endpoints for syndicate performance
   - Implement monitoring for cross-chain operations

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License
