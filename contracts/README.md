# Syndicate Smart Contracts

This directory contains the smart contract implementation for Syndicate, a cross-chain social coordination layer for lottery participation.

## Overview

Syndicate allows users to pool resources with their social connections via the Lens Protocol, dramatically increasing their collective chances of winning in Megapot's lottery system. When a group pledges portions of potential winnings to causes, these commitments are automatically executed upon winning through smart contracts.

## Contract Structure

The contracts are organized into two main directories, corresponding to the two blockchains used in the system:

### Lens Chain Contracts (`/lens`)

- **SyndicateFactory.sol**: Creates new Syndicates
- **SyndicateRegistry.sol**: Stores Syndicate metadata (cause, payout percentages)
- **SyndicateTreasury.sol**: Manages funds and cross-chain operations (combined with SyndicateFactory)

\_safeFactory: Use zero address (0x0000000000000000000000000000000000000000) since we're using our custom treasury approach

### Base Chain Contracts (`/base`)

- **TicketRegistry.sol**: Maps ticket IDs to Syndicate addresses (Deployed at: `0x86e2d8A3eAcfa89295a75116e9489f07CFBd198B`)
- **CrossChainResolver.sol**: Handles winning events and initiates bridges (Deployed at: `0x07B73B99fbB0F82f981A5954A7f3Fd72Ce391c2F`)
- **Megapot Lottery Contract**: The lottery system that determines winners (Deployed at: `0xbEDd4F2beBE9E3E636161E644759f3cbe3d51B95`)
- **USDC Token on Base**: Prize token used for lottery (Address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)

### NEAR Intents Contracts (`/intent`)

- **SyndicateIntentResolver.sol**: Lens Chain intent resolver (Deployed at: `0x21F6514fdabaD6aB9cB227ddE69A1c34C9cF9014`)
- **BaseChainIntentResolver.sol**: Base Chain intent resolver (Deployed at: `0xecF8095577EA91cFd1aBe6f59Aaad597622a9Fd3`)

## Cross-Chain Approaches

Syndicate offers three distinct approaches for enabling users to buy lottery tickets on Base Chain from Lens Chain, each with different tradeoffs in terms of security, user experience, and implementation complexity:

### 1. Safe Accounts + Bridging

This approach uses multi-signature Safe wallets as treasuries with Across Protocol for bridging:

- **How it works**: Users contribute GHO to a Safe wallet on Lens Chain, which then bridges funds to a corresponding Safe wallet on Base Chain for ticket purchases
- **Benefits**: Enhanced security through multi-signature protection, established infrastructure
- **Use case**: Ideal for larger syndicates with significant treasury funds requiring multiple approvals

### 2. Syndicate Smart Contracts

This is our primary implementation using custom smart contracts on both chains:

- **How it works**: Users contribute to SyndicateTreasury contracts on Lens Chain, which handle cross-chain operations via bridges to Base Chain
- **Benefits**: Customizable logic, transparent on-chain operations, automatic distribution based on predefined rules
- **Components**: SyndicateRegistry, SyndicateFactory, SyndicateTreasury on Lens Chain; TicketRegistry and CrossChainResolver on Base Chain
- **Use case**: Standard approach for most syndicates, balancing security and flexibility

### 3. NEAR Intents

An advanced approach inspired by NEAR's intent-based architecture:

- **How it works**: Users submit an "intent" (e.g., "join syndicate with 10 GHO"), and resolver contracts determine the optimal execution path
- **Benefits**: Improved UX, gas optimization, single transaction for users
- **Components**: IntentResolver contracts on both chains that coordinate cross-chain operations
- **Use case**: Enhanced user experience for syndicates prioritizing seamless interactions
- **Implementation Status**: ✅ Fully deployed and operational
  - **SyndicateIntentResolver** on Lens Chain: `0x21F6514fdabaD6aB9cB227ddE69A1c34C9cF9014`
  - **BaseChainIntentResolver** on Base Chain: `0xecF8095577EA91cFd1aBe6f59Aaad597622a9Fd3`
  - **Across SpokePool** on Lens Chain: `0xe7cb3e167e7475dE1331Cf6E0CEb187654619E12`

## Cross-Chain Flow

### 1. Ticket Purchase Flow

1. Users contribute GHO to their Syndicate on Lens Chain (via any of the three approaches)
2. Funds are bridged to Base Chain via Across Protocol
3. Tickets are purchased on Base Chain through Megapot contract
4. Ticket IDs are mapped to Syndicate address in TicketRegistry

### 2. Winning Flow

1. CrossChainResolver monitors for winning events on Base Chain
2. When a Syndicate wins, funds are bridged back to Lens Chain
3. Funds arrive at the Syndicate on Lens Chain (Safe wallet or SyndicateTreasury)
4. Winnings are distributed according to predefined rules (e.g., 20% to cause, 80% to participants)

## Development Setup

### Prerequisites

- Node.js 16+
- Hardhat
- OpenZeppelin Contracts

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Compile contracts:
   ```
   npx hardhat compile
   ```

## Deployment

The deployment process involves multiple steps due to the cross-chain nature of the system:

### Current Status

✅ SyndicateRegistry: Deployed to Lens Chain at `0x399f080bB2868371D7a0024a28c92fc63C05536E`
✅ SyndicateFactory: Deployed to Lens Chain at `0x4996089d644d023F02Bf891E98a00b143201f133`
✅ TicketRegistry: Deployed to Base Chain at `0x86e2d8A3eAcfa89295a75116e9489f07CFBd198B`
✅ CrossChainResolver: Deployed to Base Chain at `0x07B73B99fbB0F82f981A5954A7f3Fd72Ce391c2F`
✅ USDC Token on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
✅ SyndicateIntentResolver: Deployed to Lens Chain at `0x21F6514fdabaD6aB9cB227ddE69A1c34C9cF9014`
✅ BaseChainIntentResolver: Deployed to Base Chain at `0xecF8095577EA91cFd1aBe6f59Aaad597622a9Fd3`
✅ Connect TicketRegistry to Resolver:

- Call `setResolver` on the TicketRegistry
- Pass the CrossChainResolver address (`0x07B73B99fbB0F82f981A5954A7f3Fd72Ce391c2F`) as the parameter

1. Configure Bridge Addresses:

   - For both contracts that need to bridge tokens:
     - On Lens Chain: Call `configureBridge` on SyndicateTreasury with:
       - `_bridgeAddress`: Across Protocol bridge address on Lens Chain
       - `_targetChainId`: 8453 (Base Chain ID)
       - `_targetContract`: TicketRegistry address (`0x86e2d8A3eAcfa89295a75116e9489f07CFBd198B`)
       - `_bridgeType`: 1 (for Across bridge)

2. On Base Chain: Call `configureBridge` on CrossChainResolver with:

   - `_bridgeAddress`: Across Protocol bridge address on Base Chain
   - `_targetChainId`: 232 (Lens Chain ID)
   - `_bridgeType`: 1 (for Across bridge)

3. Set GHO Token Address (On Lens Chain):
   - Call `setGHOToken` on the SyndicateTreasury with the GHO token address on Lens Chain

### Lens Chain Mainnet Configuration

For deploying to Lens Chain Mainnet, you'll need:

| Field              | Value                     |
| ------------------ | ------------------------- |
| Network Name       | Lens Chain Mainnet        |
| RPC URL            | https://rpc.lens.xyz      |
| Chain ID           | 232                       |
| Currency Symbol    | GHO                       |
| Block Explorer URL | https://explorer.lens.xyz |

Additional requirements:

1. Appropriate bridge addresses for Lens Chain (Across Protocol)
   - Across SpokePool on Lens Chain: `0xe7cb3e167e7475dE1331Cf6E0CEb187654619E12`
2. GHO token address for contributions
3. Proper configuration of target chain IDs (Base Chain ID: 8453)

## Smart Contract Details

### SyndicateFactory

Factory contract that creates new Syndicates with customizable parameters:

- Cause name and description
- Cause address (recipient of donations)
- Percentage allocation to cause
- Treasury owners and threshold

### SyndicateRegistry

Registry that stores all Syndicate metadata:

- Maps treasury addresses to Syndicate info
- Tracks active/inactive status
- Links to Lens profiles
- Provides query functions

### SyndicateTreasury (Updated for Lens Chain)

Multi-signature treasury that:

- Manages participant contributions of GHO and other tokens
- Handles cross-chain transactions via Lens Chain's supported bridges
- Distributes winnings according to predetermined percentages
- Tracks participation for fair distribution
- Supports multiple bridge protocols (Default, Across)

### TicketRegistry

Registry on Base Chain that:

- Maps lottery tickets to Syndicate addresses
- Tracks all tickets owned by each Syndicate
- Allows batch operations for gas efficiency

### CrossChainResolver (Updated for Lens Chain)

Monitor and resolver that:

- Detects when a Syndicate's ticket wins
- Calculates prize amounts
- Initiates cross-chain transfers back to Lens Chain
- Handles batch processing of multiple winning tickets
- Supports multiple bridge protocols for Lens Chain compatibility

### SyndicateIntentResolver (Lens Chain)

Intent resolver on Lens Chain that:

- Processes user intent submissions for joining syndicates or buying tickets
- Handles cross-chain operations via Across Protocol
- Initiates bridges to Base Chain for ticket purchases
- Tracks intent execution status
- Supports immediate and deferred intent execution

### BaseChainIntentResolver (Base Chain)

Intent resolver on Base Chain that:

- Receives bridged assets from Lens Chain
- Processes intents on Base Chain (like ticket purchases)
- Interacts with the MegapotLottery contract
- Registers tickets in the TicketRegistry
- Monitors for winning events

## Future Improvements

### Cross-Chain Integration Roadmap

#### 1. Safe Accounts + Bridging

- Implement automated monitoring for Safe transactions
- Add support for additional bridge providers beyond Across
- Create templates for different Safe configurations (2/3, 3/5 multisig)

#### 2. Syndicate Smart Contracts

- Optimize gas usage for batch operations
- Implement event indexing for real-time monitoring
- Add support for multiple token types beyond GHO
- Create more comprehensive testing suite for cross-chain operations

#### 3. NEAR Intents

- ✅ Deploy intent resolvers on both chains
- ✅ Develop off-chain relayer infrastructure for intent execution
  ✅ Implemented OffChainProcessor service with WebSocket providers for real-time event monitoring
  ✅ Set up database integration for intent and transaction tracking
  ✅ Created graceful error handling with retry mechanisms
- ✅ Create intent verification and validation mechanisms
- Build user-friendly interfaces for intent submission

### General Improvements

- Implement automated event monitoring system across all approaches
- Add support for additional cross-chain bridges as they become available
- Investigate Lens Chain-specific optimizations:
  - WebSocket connection tuning for Lens Chain RPC
  - Gas price strategies specific to Lens Chain
  - Custom error handling for Lens Chain transactions
- Create comprehensive documentation for all three approaches
- Develop analytics dashboard for cross-chain operations
