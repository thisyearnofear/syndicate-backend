// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title IGHO
 * @dev Interface for GHO token, the native token of Lens Chain
 */
interface IGHO is IERC20 {
    // GHO specific functions if any
}

/**
 * @title ISyndicateCrossChainBridge
 * @dev Interface for interacting with the cross-chain bridge service
 * Compatible with Lens Chain's supported bridges (ZKSync, Across)
 */
interface ISyndicateCrossChainBridge {
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
 * @title SyndicateRegistry
 * @dev Interface for the registry that tracks all Syndicates
 */
interface SyndicateRegistry {
    function registerSyndicate(
        address treasuryAddress,
        address creator,
        string memory name,
        string memory cause,
        address causeAddress,
        uint256 causePercentage
    ) external;
}

/**
 * @title SyndicateTreasury
 * @dev Multi-signature treasury contract for Syndicates
 * Manages funds, handles cross-chain operations, and distributes winnings
 * Updated for Lens Chain compatibility
 */
contract SyndicateTreasury is ReentrancyGuard {

    // Constants
    uint256 constant public MAX_OWNERS = 10;
    uint256 constant public MAX_BASIS_POINTS = 10000; // 100%

    // Lens Chain to Base Mainnet
    uint32 constant public BASE_CHAIN_ID = 8453;

    // State Variables
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public threshold;

    address public causeAddress;
    uint256 public causePercentage; // In basis points (e.g., 2000 = 20%)

    uint256 public nonce;

    // Transaction structs
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        mapping(address => bool) confirmations;
        uint256 confirmationCount;
    }

    // Transaction storage
    mapping(uint256 => Transaction) public transactions;

    // Participant tracking for winnings distribution
    struct Participant {
        address addr;
        uint256 contribution;
    }

    Participant[] public participants;
    mapping(address => uint256) public participantIndex;
    mapping(address => uint256) public participantContributions;
    uint256 public totalContributions;

    // Cross-chain bridge settings
    address public bridgeAddress;
    address public acrossBridgeAddress;
    uint32 public targetChainId;
    address public targetContract;

    // GHO token address on Lens Chain
    address public ghoToken;

    // Bridge type
    enum BridgeType { Default, Across }
    BridgeType public activeBridgeType;

    // Events
    event TransactionSubmitted(uint256 indexed txId, address indexed submitter, address to, uint256 value, bytes data);
    event TransactionConfirmed(uint256 indexed txId, address indexed confirmer);
    event TransactionExecuted(uint256 indexed txId, address indexed executor);
    event ContributionReceived(address indexed participant, uint256 amount);
    event GHOContributionReceived(address indexed participant, uint256 amount);
    event WinningsReceived(uint256 amount);
    event WinningsDistributed(uint256 totalAmount, uint256 causeAmount, uint256 participantsAmount);
    event BridgeConfigured(address bridgeAddress, uint32 targetChainId, address targetContract, BridgeType bridgeType);
    event CrossChainTransactionInitiated(address token, uint256 amount, uint32 destinationChainId, address recipient);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ThresholdChanged(uint256 oldThreshold, uint256 newThreshold);
    event CauseUpdated(address oldCauseAddress, address newCauseAddress, uint256 oldPercentage, uint256 newPercentage);
    event GHOTokenSet(address indexed ghoToken);

    modifier onlyOwner() {
        require(isOwner[msg.sender], "SyndicateTreasury: caller is not an owner");
        _;
    }

    modifier txExists(uint256 _txId) {
        require(_txId < nonce, "SyndicateTreasury: transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 _txId) {
        require(!transactions[_txId].executed, "SyndicateTreasury: transaction already executed");
        _;
    }

    modifier notConfirmed(uint256 _txId) {
        require(!transactions[_txId].confirmations[msg.sender], "SyndicateTreasury: transaction already confirmed");
        _;
    }

    /**
     * @dev Constructor
     * @param _owners List of treasury owners
     * @param _threshold Number of confirmations required for transactions
     * @param _causeAddress Address that receives cause donations
     * @param _causePercentage Percentage allocated to the cause (basis points)
     */
    constructor(
        address[] memory _owners,
        uint256 _threshold,
        address _causeAddress,
        uint256 _causePercentage
    ) {
        require(_owners.length > 0 && _owners.length <= MAX_OWNERS, "SyndicateTreasury: invalid owner count");
        require(_threshold > 0 && _threshold <= _owners.length, "SyndicateTreasury: invalid threshold");
        require(_causeAddress != address(0), "SyndicateTreasury: cause address cannot be zero");
        require(_causePercentage <= MAX_BASIS_POINTS, "SyndicateTreasury: invalid cause percentage");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "SyndicateTreasury: zero address owner");
            require(!isOwner[owner], "SyndicateTreasury: duplicate owner");

            isOwner[owner] = true;
            owners.push(owner);
        }

        threshold = _threshold;
        causeAddress = _causeAddress;
        causePercentage = _causePercentage;
        targetChainId = BASE_CHAIN_ID; // Default to Base Mainnet
    }

    /**
     * @dev Allows receiving ETH (if supported on the chain)
     */
    receive() external payable {
        emit ContributionReceived(msg.sender, msg.value);
        _recordContribution(msg.sender, msg.value);
    }

    /**
     * @dev Sets the GHO token address
     * @param _ghoToken Address of the GHO token
     */
    function setGHOToken(address _ghoToken) external onlyOwner {
        require(_ghoToken != address(0), "SyndicateTreasury: GHO token cannot be zero address");
        ghoToken = _ghoToken;
        emit GHOTokenSet(_ghoToken);
    }

    /**
     * @dev Submits a new transaction to the treasury
     * @param _to Destination address
     * @param _value ETH value
     * @param _data Transaction data
     * @return txId Transaction ID
     */
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data
    )
        public
        onlyOwner
        returns (uint256 txId)
    {
        txId = nonce;

        Transaction storage transaction = transactions[txId];
        transaction.to = _to;
        transaction.value = _value;
        transaction.data = _data;
        transaction.executed = false;
        transaction.confirmationCount = 0;

        nonce++;

        emit TransactionSubmitted(txId, msg.sender, _to, _value, _data);

        confirmTransaction(txId);

        return txId;
    }

    /**
     * @dev Confirms a transaction
     * @param _txId Transaction ID
     */
    function confirmTransaction(uint256 _txId)
        public
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
        notConfirmed(_txId)
    {
        Transaction storage transaction = transactions[_txId];
        transaction.confirmations[msg.sender] = true;
        transaction.confirmationCount++;

        emit TransactionConfirmed(_txId, msg.sender);

        if (transaction.confirmationCount >= threshold) {
            executeTransaction(_txId);
        }
    }

    /**
     * @dev Executes a confirmed transaction
     * @param _txId Transaction ID
     */
    function executeTransaction(uint256 _txId)
        public
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
    {
        Transaction storage transaction = transactions[_txId];

        require(
            transaction.confirmationCount >= threshold,
            "SyndicateTreasury: not enough confirmations"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "SyndicateTreasury: transaction execution failed");

        emit TransactionExecuted(_txId, msg.sender);
    }

    /**
     * @dev Changes the threshold required for transaction confirmations
     * @param _newThreshold New threshold value
     */
    function changeThreshold(uint256 _newThreshold)
        external
        onlyOwner
    {
        require(_newThreshold > 0 && _newThreshold <= owners.length, "SyndicateTreasury: invalid threshold");
        uint256 oldThreshold = threshold;
        threshold = _newThreshold;

        emit ThresholdChanged(oldThreshold, _newThreshold);
    }

    /**
     * @dev Updates the cause address and percentage
     * @param _newCauseAddress New cause address
     * @param _newCausePercentage New cause percentage
     */
    function updateCause(address _newCauseAddress, uint256 _newCausePercentage)
        external
        onlyOwner
    {
        require(_newCauseAddress != address(0), "SyndicateTreasury: cause address cannot be zero");
        require(_newCausePercentage <= MAX_BASIS_POINTS, "SyndicateTreasury: invalid cause percentage");

        address oldCauseAddress = causeAddress;
        uint256 oldPercentage = causePercentage;

        causeAddress = _newCauseAddress;
        causePercentage = _newCausePercentage;

        emit CauseUpdated(oldCauseAddress, _newCauseAddress, oldPercentage, _newCausePercentage);
    }

    /**
     * @dev Configures the cross-chain bridge
     * @param _bridgeAddress Address of the bridge contract
     * @param _targetChainId Chain ID of the target chain (Base Mainnet by default)
     * @param _targetContract Address of the contract on the target chain
     * @param _bridgeType Type of bridge to use (0 = Default, 1 = Across)
     */
    function configureBridge(
        address _bridgeAddress,
        uint32 _targetChainId,
        address _targetContract,
        BridgeType _bridgeType
    )
        external
        onlyOwner
    {
        require(_bridgeAddress != address(0), "SyndicateTreasury: bridge address cannot be zero");
        require(_targetChainId > 0, "SyndicateTreasury: invalid chain ID");
        require(_targetContract != address(0), "SyndicateTreasury: target contract cannot be zero");

        if (_bridgeType == BridgeType.Default) {
            bridgeAddress = _bridgeAddress;
        } else if (_bridgeType == BridgeType.Across) {
            acrossBridgeAddress = _bridgeAddress;
        }

        targetChainId = _targetChainId;
        targetContract = _targetContract;
        activeBridgeType = _bridgeType;

        emit BridgeConfigured(_bridgeAddress, _targetChainId, _targetContract, _bridgeType);
    }

    /**
     * @dev Initiates a cross-chain token transfer using the default bridge
     * @param _token Address of the token to transfer
     * @param _amount Amount to transfer
     */
    function bridgeTokensToTargetChain(address _token, uint256 _amount)
        external
        onlyOwner
        nonReentrant
    {
        require(
            (activeBridgeType == BridgeType.Default && bridgeAddress != address(0)) ||
            (activeBridgeType == BridgeType.Across && acrossBridgeAddress != address(0)),
            "SyndicateTreasury: bridge not configured"
        );
        require(_token != address(0), "SyndicateTreasury: token address cannot be zero");
        require(_amount > 0, "SyndicateTreasury: amount must be greater than zero");

        // Transfer tokens to this contract if needed
        IERC20 token = IERC20(_token);
        bool transferSuccess = token.transferFrom(msg.sender, address(this), _amount);
        require(transferSuccess, "SyndicateTreasury: transferFrom failed");

        if (activeBridgeType == BridgeType.Default) {
            // Use default bridge
            bool approveSuccess = token.approve(bridgeAddress, _amount);
            require(approveSuccess, "SyndicateTreasury: approve failed");

            // Prepare metadata for the bridge
            bytes memory metadata = abi.encode(address(this));

            // Call the bridge
            ISyndicateCrossChainBridge(bridgeAddress).bridgeTokens(
                _token,
                _amount,
                targetChainId,
                targetContract,
                metadata
            );
        } else if (activeBridgeType == BridgeType.Across) {
            // Use Across Protocol bridge
            bool approveSuccess = token.approve(acrossBridgeAddress, _amount);
            require(approveSuccess, "SyndicateTreasury: approve failed");

            // Default to 0 relayer fee percentage and current timestamp
            uint64 relayerFeePct = 0;
            uint32 quoteTimestamp = uint32(block.timestamp);

            // Bridge via Across
            IAcrossBridge(acrossBridgeAddress).deposit(
                targetContract,  // recipient on destination chain
                _token,          // token to bridge
                _amount,         // amount to bridge
                targetChainId,   // destination chain ID
                relayerFeePct,   // relayer fee percentage
                quoteTimestamp   // quote timestamp
            );
        }

        emit CrossChainTransactionInitiated(_token, _amount, targetChainId, targetContract);
    }

    /**
     * @dev Contributes GHO to the syndicate
     * @param _amount Amount to contribute
     */
    function contributeGHO(uint256 _amount) external {
        require(ghoToken != address(0), "SyndicateTreasury: GHO token not configured");
        require(_amount > 0, "SyndicateTreasury: amount must be greater than zero");

        IGHO gho = IGHO(ghoToken);
        bool transferSuccess = gho.transferFrom(msg.sender, address(this), _amount);
        require(transferSuccess, "SyndicateTreasury: GHO transferFrom failed");

        emit GHOContributionReceived(msg.sender, _amount);
        _recordContribution(msg.sender, _amount);
    }

    /**
     * @dev Records a participant's contribution
     * @param _participant Address of the participant
     * @param _amount Contribution amount
     */
    function _recordContribution(address _participant, uint256 _amount) internal {
        if (participantContributions[_participant] == 0) {
            // New participant
            participantIndex[_participant] = participants.length;
            participants.push(Participant({
                addr: _participant,
                contribution: _amount
            }));
        } else {
            // Existing participant
            uint256 idx = participantIndex[_participant];
            participants[idx].contribution += _amount;
        }

        participantContributions[_participant] += _amount;
        totalContributions += _amount;
    }

    /**
     * @dev Contributes tokens to the syndicate
     * @param _token Address of the token to contribute
     * @param _amount Amount to contribute
     */
    function contributeTokens(address _token, uint256 _amount) external {
        require(_token != address(0), "SyndicateTreasury: token address cannot be zero");
        require(_amount > 0, "SyndicateTreasury: amount must be greater than zero");

        IERC20 token = IERC20(_token);
        bool transferSuccess = token.transferFrom(msg.sender, address(this), _amount);
        require(transferSuccess, "SyndicateTreasury: transferFrom failed");

        emit ContributionReceived(msg.sender, _amount);
        _recordContribution(msg.sender, _amount);
    }

    /**
     * @dev Handles the receipt of winnings
     * @notice This function should be called when winnings are received
     */
    function receiveWinnings() external payable {
        require(msg.value > 0, "SyndicateTreasury: no winnings received");

        emit WinningsReceived(msg.value);
    }

    /**
     * @dev Distributes winnings according to the cause percentage and participant contributions
     * @param _token Address of the token to distribute (use address(0) for ETH, ghoToken for GHO)
     */
    function distributeWinnings(address _token)
        external
        onlyOwner
        nonReentrant
    {
        uint256 balance;
        if (_token == address(0)) {
            balance = address(this).balance;
        } else {
            balance = IERC20(_token).balanceOf(address(this));
        }

        require(balance > 0, "SyndicateTreasury: no funds to distribute");

        // Calculate amounts
        uint256 causeAmount = (balance * causePercentage) / MAX_BASIS_POINTS;
        uint256 participantsAmount = balance - causeAmount;

        // Send to cause
        if (causeAmount > 0) {
            if (_token == address(0)) {
                (bool success, ) = causeAddress.call{value: causeAmount}("");
                require(success, "SyndicateTreasury: cause transfer failed");
            } else {
                IERC20 token = IERC20(_token);
                bool transferSuccess = token.transfer(causeAddress, causeAmount);
                require(transferSuccess, "SyndicateTreasury: cause transfer failed");
            }
        }

        // Distribute to participants
        if (participantsAmount > 0 && totalContributions > 0) {
            for (uint256 i = 0; i < participants.length; i++) {
                Participant memory participant = participants[i];

                if (participant.contribution > 0) {
                    uint256 participantShare = (participantsAmount * participant.contribution) / totalContributions;

                    if (participantShare > 0) {
                        if (_token == address(0)) {
                            (bool success, ) = participant.addr.call{value: participantShare}("");
                            require(success, "SyndicateTreasury: participant transfer failed");
                        } else {
                            IERC20 token = IERC20(_token);
                            bool transferSuccess = token.transfer(participant.addr, participantShare);
                            require(transferSuccess, "SyndicateTreasury: participant transfer failed");
                        }
                    }
                }
            }
        }

        emit WinningsDistributed(balance, causeAmount, participantsAmount);
    }

    /**
     * @dev Returns the list of owners
     * @return All owners of the treasury
     */
    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    /**
     * @dev Returns the confirmation status for a transaction
     * @param _txId Transaction ID
     * @param _owner Owner address
     * @return isConfirmed Whether the transaction is confirmed by the owner
     */
    function isConfirmed(uint256 _txId, address _owner)
        external
        view
        txExists(_txId)
        returns (bool)
    {
        return transactions[_txId].confirmations[_owner];
    }

    /**
     * @dev Returns the number of confirmations for a transaction
     * @param _txId Transaction ID
     * @return count Number of confirmations
     */
    function getConfirmationCount(uint256 _txId)
        external
        view
        txExists(_txId)
        returns (uint256)
    {
        return transactions[_txId].confirmationCount;
    }

    /**
     * @dev Returns the total number of participants
     * @return count Number of participants
     */
    function getParticipantCount() external view returns (uint256) {
        return participants.length;
    }

    /**
     * @dev Checks if an address is a participant
     * @param _addr Address to check
     * @return isParticipant Whether the address is a participant
     */
    function isParticipant(address _addr) external view returns (bool) {
        return participantContributions[_addr] > 0;
    }
}

/**
 * @title SyndicateFactory
 * @dev Factory contract for creating new Syndicate instances
 * Each Syndicate consists of a Treasury and Registry entry
 */
contract SyndicateFactory {
    // Address of the main registry contract
    SyndicateRegistry public registry;

    // Address of the Safe wallet factory (if using Safe for treasury)
    address public safeFactory;

    // Event emitted when a new Syndicate is created
    event SyndicateCreated(
        address indexed creator,
        address indexed treasuryAddress,
        string name,
        string cause,
        uint256 causePercentage
    );

    /**
     * @dev Constructor
     * @param _registryAddress Address of the SyndicateRegistry contract
     * @param _safeFactory Address of the Safe wallet factory (if applicable)
     */
    constructor(address _registryAddress, address _safeFactory) {
        registry = SyndicateRegistry(_registryAddress);
        safeFactory = _safeFactory;
    }

    /**
     * @dev Creates a new Syndicate with the specified parameters
     * @param _name Name of the Syndicate
     * @param _cause Cause that the Syndicate supports
     * @param _causeAddress Address of the cause receiving donations
     * @param _causePercentage Percentage of winnings allocated to the cause (in basis points, e.g. 2000 = 20%)
     * @param _owners List of owners for the Syndicate treasury
     * @param _threshold Number of confirmations required for treasury transactions
     * @return treasuryAddress Address of the newly created Syndicate Treasury
     */
    function createSyndicate(
        string memory _name,
        string memory _cause,
        address _causeAddress,
        uint256 _causePercentage,
        address[] memory _owners,
        uint256 _threshold
    ) external returns (address treasuryAddress) {
        // Validate inputs
        require(bytes(_name).length > 0, "SyndicateFactory: name cannot be empty");
        require(bytes(_cause).length > 0, "SyndicateFactory: cause cannot be empty");
        require(_causeAddress != address(0), "SyndicateFactory: cause address cannot be zero");
        require(_causePercentage <= 10000, "SyndicateFactory: percentage cannot exceed 100%");
        require(_owners.length > 0, "SyndicateFactory: must have at least one owner");
        require(_threshold > 0 && _threshold <= _owners.length, "SyndicateFactory: invalid threshold");

        // Create new Syndicate Treasury
        SyndicateTreasury treasury = new SyndicateTreasury(
            _owners,
            _threshold,
            _causeAddress,
            _causePercentage
        );

        treasuryAddress = address(treasury);

        // Register the Syndicate in the registry
        registry.registerSyndicate(
            treasuryAddress,
            msg.sender,
            _name,
            _cause,
            _causeAddress,
            _causePercentage
        );

        // Emit creation event
        emit SyndicateCreated(
            msg.sender,
            treasuryAddress,
            _name,
            _cause,
            _causePercentage
        );

        return treasuryAddress;
    }
}