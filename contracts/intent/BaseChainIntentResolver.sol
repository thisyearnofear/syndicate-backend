// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ITicketRegistry
 * @dev Interface for the TicketRegistry contract on Base chain
 */
interface ITicketRegistry {
    function registerTicket(uint256 ticketId, address syndicateAddress) external;
}

/**
 * @title IMegapotLottery
 * @dev Interface for interacting with the Megapot Lottery on Base chain
 */
interface IMegapotLottery {
    function buyTicket(uint256 amount) external returns (uint256 ticketId);
}

/**
 * @title IAcrossReceiver
 * @dev Interface for receiving deposits from Across Protocol
 */
interface IAcrossReceiver {
    function receiveDeposit(
        address recipient,
        address inputToken,
        uint256 amount,
        bytes memory metadata
    ) external;
}

/**
 * @title IntentDefinition
 * @dev Struct defining an intent for the Syndicate system
 */
struct IntentDefinition {
    // Intent type identifiers
    uint8 intentType;

    // Syndicate details
    address syndicateAddress;

    // Financial parameters
    uint256 amount;
    address tokenAddress;

    // Cross-chain parameters
    uint32 sourceChainId;
    uint32 destinationChainId;

    // For lottery-specific intents
    uint256 ticketId;

    // User preferences
    bool useOptimalRoute;
    uint256 maxFeePercentage;

    // Deadline for intent execution
    uint256 deadline;

    // Intent metadata (IPFS hash or encoded data)
    bytes metadata;
}

/**
 * @title BaseChainIntentResolver
 * @dev Resolver for cross-chain intents on Base Chain
 * Handles the resolution of intents that originate from Lens Chain
 */
contract BaseChainIntentResolver is ReentrancyGuard, IAcrossReceiver {

    // Intent type constants
    uint8 constant public JOIN_SYNDICATE = 1;
    uint8 constant public BUY_TICKET = 2;
    uint8 constant public CLAIM_WINNINGS = 3;
    uint8 constant public WITHDRAW_FUNDS = 4;

    // Chain ID constants
    uint32 constant public LENS_CHAIN_ID = 232; // Lens Chain ID
    uint32 constant public BASE_CHAIN_ID = 8453;

    // State variables
    address public owner;
    address public megapotLotteryAddress;
    address public ticketRegistryAddress;
    address public usdcToken; // USDC or stable token on Base Chain

    // Mapping to track processed intents
    mapping(bytes32 => bool) public processedIntents;

    // Mapping to track syndicate addresses by their identifier
    mapping(bytes32 => address) public syndicateAddresses;

    // Events
    event IntentReceived(bytes32 indexed intentId, uint8 intentType);
    event IntentProcessed(bytes32 indexed intentId, bool success);
    event TicketPurchased(address indexed syndicateAddress, uint256 ticketId, uint256 amount);

    /**
     * @dev Constructor
     * @param _megapotLotteryAddress Address of the Megapot Lottery on Base Chain
     * @param _ticketRegistryAddress Address of the TicketRegistry on Base Chain
     * @param _usdcToken Address of USDC token on Base Chain
     */
    constructor(
        address _megapotLotteryAddress,
        address _ticketRegistryAddress,
        address _usdcToken
    ) {
        owner = msg.sender;
        megapotLotteryAddress = _megapotLotteryAddress;
        ticketRegistryAddress = _ticketRegistryAddress;
        usdcToken = _usdcToken;
    }

    /**
     * @dev Modifier that restricts function to the contract owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @dev Modifier to check that the intent hasn't been processed yet
     * @param intentId The unique identifier of the intent
     */
    modifier intentNotProcessed(bytes32 intentId) {
        require(!processedIntents[intentId], "Intent already processed");
        _;
    }

    /**
     * @dev Creates an intent ID from the intent definition
     * @param intent The intent definition
     * @param user The user submitting the intent
     * @return intentId The unique identifier for the intent
     */
    function createIntentId(IntentDefinition memory intent, address user) public pure returns (bytes32) {
        return keccak256(abi.encode(intent, user));
    }

    /**
     * @dev Manually registers a syndicate address for a given identifier
     * @param syndicateId The syndicate identifier
     * @param syndicateAddress The address of the syndicate on Lens Chain
     */
    function registerSyndicateAddress(bytes32 syndicateId, address syndicateAddress) external onlyOwner {
        require(syndicateAddress != address(0), "Invalid syndicate address");
        syndicateAddresses[syndicateId] = syndicateAddress;
    }

    /**
     * @dev Receive a deposit from Across Protocol
     * @param recipient The intended recipient on Base Chain
     * @param inputToken The token received (e.g., USDC)
     * @param amount The amount received
     * @param metadata Additional data including syndicate and intent information
     */
    function receiveDeposit(
        address recipient,
        address inputToken,
        uint256 amount,
        bytes memory metadata
    )
        external
        override
        nonReentrant
    {
        // Extract intent information from metadata
        // This is a simplified example, in practice you'd decode a more complex structure
        address syndicateAddress = abi.decode(metadata, (address));

        // Create a synthetic intent for tracking
        bytes32 intentId = keccak256(abi.encode(
            syndicateAddress,
            inputToken,
            amount,
            block.timestamp
        ));

        // Process the deposit as a ticket purchase intent
        _processBuyTicketIntent(intentId, syndicateAddress, inputToken, amount);
    }

    /**
     * @dev Processes a ticket purchase intent
     * @param intentId The unique identifier of the intent
     * @param syndicateAddress The address of the syndicate on Lens Chain
     * @param tokenAddress The token used for payment
     * @param amount The amount to be used
     */
    function _processBuyTicketIntent(
        bytes32 intentId,
        address syndicateAddress,
        address tokenAddress,
        uint256 amount
    )
        internal
        intentNotProcessed(intentId)
    {
        bool success = false;

        // Mark as processed early to prevent reentrancy
        processedIntents[intentId] = true;

        // Ensure we have the right token
        require(tokenAddress == usdcToken, "Unsupported token");

        // Approve Megapot lottery to spend tokens
        bool approveSuccess = IERC20(usdcToken).approve(megapotLotteryAddress, amount);
        require(approveSuccess, "Approve failed");

        // Purchase ticket from Megapot
        try IMegapotLottery(megapotLotteryAddress).buyTicket(amount) returns (uint256 ticketId) {
            // Register ticket with the syndicate address
            ITicketRegistry(ticketRegistryAddress).registerTicket(ticketId, syndicateAddress);

            emit TicketPurchased(syndicateAddress, ticketId, amount);
            success = true;
        } catch {
            success = false;
        }

        emit IntentProcessed(intentId, success);
    }

    /**
     * @dev Updates the configuration of the resolver
     * @param _megapotLotteryAddress New Megapot lottery address
     * @param _ticketRegistryAddress New ticket registry address
     * @param _usdcToken New USDC token address
     */
    function updateConfig(
        address _megapotLotteryAddress,
        address _ticketRegistryAddress,
        address _usdcToken
    )
        external
        onlyOwner
    {
        if (_megapotLotteryAddress != address(0)) megapotLotteryAddress = _megapotLotteryAddress;
        if (_ticketRegistryAddress != address(0)) ticketRegistryAddress = _ticketRegistryAddress;
        if (_usdcToken != address(0)) usdcToken = _usdcToken;
    }

    /**
     * @dev Transfers ownership of the contract
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }

    /**
     * @dev Allows the owner to rescue tokens accidentally sent to the contract
     * @param token The token to rescue
     * @param to The address to send the tokens to
     * @param amount The amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        bool transferSuccess = IERC20(token).transfer(to, amount);
        require(transferSuccess, "Transfer failed");
    }
}