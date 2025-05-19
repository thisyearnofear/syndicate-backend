// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TicketRegistry.sol";

/**
 * @title IMegapotLottery
 * @dev Interface for interacting with the Megapot lottery contract
 */
interface IMegapotLottery {
    function ticketInfo(uint256 _ticketId) external view returns (
        address owner,
        uint256 drawId,
        bool claimed,
        uint256 timestamp
    );

    function isWinningTicket(uint256 _ticketId) external view returns (bool);

    function ticketPrize(uint256 _ticketId) external view returns (uint256);
}

/**
 * @title ICrossChainBridge
 * @dev Interface for interacting with the cross-chain bridge service
 */
interface ICrossChainBridge {
    function bridgeTokens(
        address _token,
        uint256 _amount,
        uint32 _destinationChainId,
        address _recipient,
        bytes memory _metadata
    ) external;
}

/**
 * @title IAcrossBridge
 * @dev Interface for Across Protocol Bridge (supported by Lens Chain)
 */
interface IAcrossBridge {
    function deposit(
        address recipient,
        address inputToken,
        uint256 amount,
        uint256 destinationChainId,
        uint64 relayerFeePct,
        uint32 quoteTimestamp
    ) external payable returns (uint256);
}

/**
 * @title CrossChainResolver
 * @dev Handles winning events and initiates cross-chain transfers
 * Monitors Megapot for winning tickets and sends winnings back to Syndicate treasuries
 * Updated for compatibility with Lens Chain
 */
contract CrossChainResolver is ReentrancyGuard {

    // Constants
    // Lens Chain ID
    uint32 constant public LENS_CHAIN_ID = 232;

    // Owner of the resolver
    address public owner;

    // Address of the TicketRegistry contract
    TicketRegistry public ticketRegistry;

    // Address of the Megapot lottery contract
    IMegapotLottery public megapotLottery;

    // Address of the prize token (e.g., USDC)
    address public prizeToken;

    // Cross-chain bridge
    address public bridgeAddress;
    address public acrossBridgeAddress;

    // Target chain ID (Lens Chain)
    uint32 public targetChainId;

    // Bridge type enum
    enum BridgeType { Default, Across }
    BridgeType public activeBridgeType;

    // Events
    event WinningTicketProcessed(
        uint256 indexed ticketId,
        address indexed syndicateAddress,
        uint256 amount
    );
    event CrossChainTransferInitiated(
        address indexed syndicateAddress,
        uint256 amount,
        uint32 destinationChainId
    );
    event BridgeConfigured(
        address bridgeAddress,
        uint32 targetChainId,
        BridgeType bridgeType
    );
    event TicketRegistryUpdated(address oldRegistry, address newRegistry);
    event MegapotLotteryUpdated(address oldLottery, address newLottery);
    event PrizeTokenUpdated(address oldToken, address newToken);

    modifier onlyOwner() {
        require(msg.sender == owner, "CrossChainResolver: caller is not owner");
        _;
    }

    constructor(
        address _ticketRegistry,
        address _megapotLottery,
        address _prizeToken
    ) {
        owner = msg.sender;

        require(_ticketRegistry != address(0), "CrossChainResolver: registry cannot be zero address");
        require(_megapotLottery != address(0), "CrossChainResolver: lottery cannot be zero address");
        require(_prizeToken != address(0), "CrossChainResolver: prize token cannot be zero address");

        ticketRegistry = TicketRegistry(_ticketRegistry);
        megapotLottery = IMegapotLottery(_megapotLottery);
        prizeToken = _prizeToken;
        targetChainId = LENS_CHAIN_ID; // Default to Lens Chain

        emit TicketRegistryUpdated(address(0), _ticketRegistry);
        emit MegapotLotteryUpdated(address(0), _megapotLottery);
        emit PrizeTokenUpdated(address(0), _prizeToken);
    }

    /**
     * @dev Configures the cross-chain bridge
     * @param _bridgeAddress Address of the bridge contract
     * @param _targetChainId Chain ID of the target chain (Lens Chain by default)
     * @param _bridgeType Type of bridge to use (0 = Default, 1 = Across)
     */
    function configureBridge(
        address _bridgeAddress,
        uint32 _targetChainId,
        BridgeType _bridgeType
    )
        external
        onlyOwner
    {
        require(_bridgeAddress != address(0), "CrossChainResolver: bridge address cannot be zero");
        require(_targetChainId > 0, "CrossChainResolver: invalid chain ID");

        if (_bridgeType == BridgeType.Default) {
            bridgeAddress = _bridgeAddress;
        } else if (_bridgeType == BridgeType.Across) {
            acrossBridgeAddress = _bridgeAddress;
        }

        targetChainId = _targetChainId;
        activeBridgeType = _bridgeType;

        emit BridgeConfigured(_bridgeAddress, _targetChainId, _bridgeType);
    }

    /**
     * @dev Updates the TicketRegistry address
     * @param _ticketRegistry New TicketRegistry address
     */
    function setTicketRegistry(address _ticketRegistry) external onlyOwner {
        require(_ticketRegistry != address(0), "CrossChainResolver: registry cannot be zero address");

        address oldRegistry = address(ticketRegistry);
        ticketRegistry = TicketRegistry(_ticketRegistry);

        emit TicketRegistryUpdated(oldRegistry, _ticketRegistry);
    }

    /**
     * @dev Updates the Megapot lottery contract address
     * @param _megapotLottery New Megapot lottery address
     */
    function setMegapotLottery(address _megapotLottery) external onlyOwner {
        require(_megapotLottery != address(0), "CrossChainResolver: lottery cannot be zero address");

        address oldLottery = address(megapotLottery);
        megapotLottery = IMegapotLottery(_megapotLottery);

        emit MegapotLotteryUpdated(oldLottery, _megapotLottery);
    }

    /**
     * @dev Updates the prize token address
     * @param _prizeToken New prize token address
     */
    function setPrizeToken(address _prizeToken) external onlyOwner {
        require(_prizeToken != address(0), "CrossChainResolver: prize token cannot be zero address");

        address oldToken = prizeToken;
        prizeToken = _prizeToken;

        emit PrizeTokenUpdated(oldToken, _prizeToken);
    }

    /**
     * @dev Processes a winning ticket and initiates cross-chain transfer
     * @param _ticketId Winning ticket ID
     */
    function processWinningTicket(uint256 _ticketId)
        external
        nonReentrant
    {
        // Check that the ticket is valid and winning
        require(megapotLottery.isWinningTicket(_ticketId), "CrossChainResolver: not a winning ticket");

        // Get the Syndicate address from the registry
        address syndicateAddress = ticketRegistry.getSyndicateForTicket(_ticketId);
        require(syndicateAddress != address(0), "CrossChainResolver: ticket not registered to a syndicate");

        // Get the prize amount
        uint256 prizeAmount = megapotLottery.ticketPrize(_ticketId);
        require(prizeAmount > 0, "CrossChainResolver: no prize for this ticket");

        // Notify the registry about the winning ticket
        ticketRegistry.notifyWinningTicket(_ticketId, prizeAmount);

        // Check bridge configuration
        bool bridgeConfigured = (activeBridgeType == BridgeType.Default && bridgeAddress != address(0)) ||
                               (activeBridgeType == BridgeType.Across && acrossBridgeAddress != address(0));

        // If bridge is configured, initiate cross-chain transfer
        if (bridgeConfigured && targetChainId > 0) {
            // Check if we have enough of the prize token
            uint256 balance = IERC20(prizeToken).balanceOf(address(this));
            require(balance >= prizeAmount, "CrossChainResolver: insufficient balance");

            if (activeBridgeType == BridgeType.Default) {
                // Approve the bridge to spend the tokens
                bool approveSuccess = IERC20(prizeToken).approve(bridgeAddress, prizeAmount);
                require(approveSuccess, "CrossChainResolver: approve failed");

                // Prepare metadata (Syndicate treasury address)
                bytes memory metadata = abi.encode(syndicateAddress);

                // Initiate cross-chain transfer
                ICrossChainBridge(bridgeAddress).bridgeTokens(
                    prizeToken,
                    prizeAmount,
                    targetChainId,
                    syndicateAddress,
                    metadata
                );
            } else if (activeBridgeType == BridgeType.Across) {
                // Approve the Across bridge to spend the tokens
                bool approveSuccess = IERC20(prizeToken).approve(acrossBridgeAddress, prizeAmount);
                require(approveSuccess, "CrossChainResolver: approve failed");

                // Default to 0 relayer fee percentage and current timestamp
                uint64 relayerFeePct = 0;
                uint32 quoteTimestamp = uint32(block.timestamp);

                // Bridge via Across
                IAcrossBridge(acrossBridgeAddress).deposit(
                    syndicateAddress,    // recipient on destination chain
                    prizeToken,          // token to bridge
                    prizeAmount,         // amount to bridge
                    targetChainId,       // destination chain ID
                    relayerFeePct,       // relayer fee percentage
                    quoteTimestamp       // quote timestamp
                );
            }

            emit CrossChainTransferInitiated(syndicateAddress, prizeAmount, targetChainId);
        }

        emit WinningTicketProcessed(_ticketId, syndicateAddress, prizeAmount);
    }

    /**
     * @dev Batch processes multiple winning tickets
     * @param _ticketIds Array of winning ticket IDs
     */
    function processWinningTicketsBatch(uint256[] calldata _ticketIds)
        external
        nonReentrant
    {
        require(_ticketIds.length > 0, "CrossChainResolver: empty ticket array");
        require(_ticketIds.length <= 20, "CrossChainResolver: batch too large");

        uint256 totalPrizeAmount = 0;
        address lastSyndicateAddress;

        for (uint256 i = 0; i < _ticketIds.length; i++) {
            uint256 ticketId = _ticketIds[i];

            // Check that the ticket is valid and winning
            if (!megapotLottery.isWinningTicket(ticketId)) {
                continue; // Skip non-winning tickets
            }

            // Get the Syndicate address from the registry
            address syndicateAddress = ticketRegistry.getSyndicateForTicket(ticketId);
            if (syndicateAddress == address(0)) {
                continue; // Skip tickets not registered to a syndicate
            }

            // We currently only support batch processing for the same syndicate
            if (lastSyndicateAddress == address(0)) {
                lastSyndicateAddress = syndicateAddress;
            } else if (lastSyndicateAddress != syndicateAddress) {
                revert("CrossChainResolver: batch must contain tickets from same syndicate");
            }

            // Get the prize amount
            uint256 prizeAmount = megapotLottery.ticketPrize(ticketId);
            if (prizeAmount == 0) {
                continue; // Skip tickets with no prize
            }

            // Notify the registry about the winning ticket
            ticketRegistry.notifyWinningTicket(ticketId, prizeAmount);

            totalPrizeAmount += prizeAmount;

            emit WinningTicketProcessed(ticketId, syndicateAddress, prizeAmount);
        }

        // Check bridge configuration
        bool bridgeConfigured = (activeBridgeType == BridgeType.Default && bridgeAddress != address(0)) ||
                               (activeBridgeType == BridgeType.Across && acrossBridgeAddress != address(0));

        // If there's a prize to send and bridge is configured, initiate cross-chain transfer
        if (totalPrizeAmount > 0 && lastSyndicateAddress != address(0) &&
            bridgeConfigured && targetChainId > 0) {

            // Check if we have enough of the prize token
            uint256 balance = IERC20(prizeToken).balanceOf(address(this));
            require(balance >= totalPrizeAmount, "CrossChainResolver: insufficient balance");

            if (activeBridgeType == BridgeType.Default) {
                // Approve the bridge to spend the tokens
                bool approveSuccess = IERC20(prizeToken).approve(bridgeAddress, totalPrizeAmount);
                require(approveSuccess, "CrossChainResolver: approve failed");

                // Prepare metadata (Syndicate treasury address)
                bytes memory metadata = abi.encode(lastSyndicateAddress);

                // Initiate cross-chain transfer
                ICrossChainBridge(bridgeAddress).bridgeTokens(
                    prizeToken,
                    totalPrizeAmount,
                    targetChainId,
                    lastSyndicateAddress,
                    metadata
                );
            } else if (activeBridgeType == BridgeType.Across) {
                // Approve the Across bridge to spend the tokens
                bool approveSuccess = IERC20(prizeToken).approve(acrossBridgeAddress, totalPrizeAmount);
                require(approveSuccess, "CrossChainResolver: approve failed");

                // Default to 0 relayer fee percentage and current timestamp
                uint64 relayerFeePct = 0;
                uint32 quoteTimestamp = uint32(block.timestamp);

                // Bridge via Across
                IAcrossBridge(acrossBridgeAddress).deposit(
                    lastSyndicateAddress, // recipient on destination chain
                    prizeToken,           // token to bridge
                    totalPrizeAmount,     // amount to bridge
                    targetChainId,        // destination chain ID
                    relayerFeePct,        // relayer fee percentage
                    quoteTimestamp        // quote timestamp
                );
            }

            emit CrossChainTransferInitiated(lastSyndicateAddress, totalPrizeAmount, targetChainId);
        }
    }

    /**
     * @dev Checks if a ticket is a winning ticket
     * @param _ticketId Ticket ID to check
     * @return isWinning Whether the ticket is a winning ticket
     * @return prizeAmount The prize amount for the winning ticket (0 if not winning)
     * @return syndicateAddress The address of the syndicate that owns the ticket
     */
    function checkWinningTicket(uint256 _ticketId)
        external
        view
        returns (bool isWinning, uint256 prizeAmount, address syndicateAddress)
    {
        isWinning = megapotLottery.isWinningTicket(_ticketId);
        if (isWinning) {
            prizeAmount = megapotLottery.ticketPrize(_ticketId);
            syndicateAddress = ticketRegistry.getSyndicateForTicket(_ticketId);
        }

        return (isWinning, prizeAmount, syndicateAddress);
    }

    /**
     * @dev Allows the contract to receive ERC20 tokens (e.g., prize tokens)
     * @param _token The token address
     * @param _amount Amount to receive
     */
    function receiveTokens(address _token, uint256 _amount) external {
        bool transferSuccess = IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        require(transferSuccess, "CrossChainResolver: transferFrom failed");
    }

    /**
     * @dev Allows the owner to withdraw tokens in case of emergency
     * @param _token Token address
     * @param _to Recipient address
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address _token, address _to, uint256 _amount)
        external
        onlyOwner
    {
        require(_to != address(0), "CrossChainResolver: recipient cannot be zero address");

        bool transferSuccess = IERC20(_token).transfer(_to, _amount);
        require(transferSuccess, "CrossChainResolver: transfer failed");
    }
}