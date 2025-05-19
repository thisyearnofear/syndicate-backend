// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SyndicateRegistry
 * @dev Registry contract for storing metadata about Syndicates
 */
contract SyndicateRegistry {
    // Address of the factory contract that creates Syndicates
    address public factory;
    
    // Owner of the registry
    address public owner;
    
    struct SyndicateInfo {
        address treasuryAddress;     // Address of the Syndicate Treasury
        address creator;             // Creator of the Syndicate
        string name;                 // Name of the Syndicate
        string cause;                // Description of the supported cause
        address causeAddress;        // Address that receives cause donations
        uint256 causePercentage;     // Percentage allocated to the cause (basis points)
        uint256 createdAt;           // Timestamp when Syndicate was created
        bool active;                 // Whether the Syndicate is active
        
        // Mapping for Lens profile association
        uint256 lensProfileId;       // Lens profile ID (if connected)
    }
    
    // Mapping from treasury address to Syndicate info
    mapping(address => SyndicateInfo) public syndicates;
    
    // Array of all Syndicate addresses
    address[] public syndicateAddresses;
    
    // Events
    event SyndicateRegistered(
        address indexed treasuryAddress,
        address indexed creator,
        string name,
        string cause,
        address causeAddress,
        uint256 causePercentage
    );
    
    event SyndicateUpdated(
        address indexed treasuryAddress,
        string name,
        string cause,
        address causeAddress,
        uint256 causePercentage
    );
    
    event SyndicateDeactivated(address indexed treasuryAddress);
    event SyndicateReactivated(address indexed treasuryAddress);
    event LensProfileLinked(address indexed treasuryAddress, uint256 lensProfileId);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "SyndicateRegistry: caller is not owner");
        _;
    }
    
    modifier onlyFactoryOrOwner() {
        require(
            msg.sender == factory || msg.sender == owner,
            "SyndicateRegistry: caller is not factory or owner"
        );
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Sets the address of the factory contract
     * @param _factory The address of the factory contract
     */
    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
    }
    
    /**
     * @dev Registers a new Syndicate
     * @param _treasuryAddress Address of the Syndicate Treasury
     * @param _creator Creator of the Syndicate
     * @param _name Name of the Syndicate
     * @param _cause Description of the supported cause
     * @param _causeAddress Address that receives cause donations
     * @param _causePercentage Percentage allocated to the cause (basis points)
     */
    function registerSyndicate(
        address _treasuryAddress,
        address _creator,
        string memory _name,
        string memory _cause,
        address _causeAddress,
        uint256 _causePercentage
    ) external onlyFactoryOrOwner {
        require(_treasuryAddress != address(0), "SyndicateRegistry: treasury address cannot be zero");
        require(_creator != address(0), "SyndicateRegistry: creator address cannot be zero");
        require(bytes(_name).length > 0, "SyndicateRegistry: name cannot be empty");
        require(bytes(_cause).length > 0, "SyndicateRegistry: cause cannot be empty");
        require(_causeAddress != address(0), "SyndicateRegistry: cause address cannot be zero");
        require(_causePercentage <= 10000, "SyndicateRegistry: percentage cannot exceed 100%");
        require(syndicates[_treasuryAddress].treasuryAddress == address(0), "SyndicateRegistry: syndicate already registered");
        
        SyndicateInfo memory newSyndicate = SyndicateInfo({
            treasuryAddress: _treasuryAddress,
            creator: _creator,
            name: _name,
            cause: _cause,
            causeAddress: _causeAddress,
            causePercentage: _causePercentage,
            createdAt: block.timestamp,
            active: true,
            lensProfileId: 0
        });
        
        syndicates[_treasuryAddress] = newSyndicate;
        syndicateAddresses.push(_treasuryAddress);
        
        emit SyndicateRegistered(
            _treasuryAddress,
            _creator,
            _name,
            _cause,
            _causeAddress,
            _causePercentage
        );
    }
    
    /**
     * @dev Updates an existing Syndicate's metadata
     * @param _treasuryAddress Address of the Syndicate Treasury
     * @param _name Name of the Syndicate
     * @param _cause Description of the supported cause
     * @param _causeAddress Address that receives cause donations
     * @param _causePercentage Percentage allocated to the cause (basis points)
     */
    function updateSyndicate(
        address _treasuryAddress,
        string memory _name,
        string memory _cause,
        address _causeAddress,
        uint256 _causePercentage
    ) external onlyOwner {
        require(syndicates[_treasuryAddress].treasuryAddress != address(0), "SyndicateRegistry: syndicate not registered");
        require(bytes(_name).length > 0, "SyndicateRegistry: name cannot be empty");
        require(bytes(_cause).length > 0, "SyndicateRegistry: cause cannot be empty");
        require(_causeAddress != address(0), "SyndicateRegistry: cause address cannot be zero");
        require(_causePercentage <= 10000, "SyndicateRegistry: percentage cannot exceed 100%");
        
        SyndicateInfo storage syndicate = syndicates[_treasuryAddress];
        
        syndicate.name = _name;
        syndicate.cause = _cause;
        syndicate.causeAddress = _causeAddress;
        syndicate.causePercentage = _causePercentage;
        
        emit SyndicateUpdated(
            _treasuryAddress,
            _name,
            _cause,
            _causeAddress,
            _causePercentage
        );
    }
    
    /**
     * @dev Deactivates a Syndicate
     * @param _treasuryAddress Address of the Syndicate Treasury
     */
    function deactivateSyndicate(address _treasuryAddress) external onlyOwner {
        require(syndicates[_treasuryAddress].treasuryAddress != address(0), "SyndicateRegistry: syndicate not registered");
        require(syndicates[_treasuryAddress].active, "SyndicateRegistry: syndicate already deactivated");
        
        syndicates[_treasuryAddress].active = false;
        
        emit SyndicateDeactivated(_treasuryAddress);
    }
    
    /**
     * @dev Reactivates a deactivated Syndicate
     * @param _treasuryAddress Address of the Syndicate Treasury
     */
    function reactivateSyndicate(address _treasuryAddress) external onlyOwner {
        require(syndicates[_treasuryAddress].treasuryAddress != address(0), "SyndicateRegistry: syndicate not registered");
        require(!syndicates[_treasuryAddress].active, "SyndicateRegistry: syndicate already active");
        
        syndicates[_treasuryAddress].active = true;
        
        emit SyndicateReactivated(_treasuryAddress);
    }
    
    /**
     * @dev Links a Lens profile to a Syndicate
     * @param _treasuryAddress Address of the Syndicate Treasury
     * @param _lensProfileId Lens profile ID
     */
    function linkLensProfile(address _treasuryAddress, uint256 _lensProfileId) external onlyOwner {
        require(syndicates[_treasuryAddress].treasuryAddress != address(0), "SyndicateRegistry: syndicate not registered");
        require(_lensProfileId > 0, "SyndicateRegistry: invalid lens profile ID");
        
        syndicates[_treasuryAddress].lensProfileId = _lensProfileId;
        
        emit LensProfileLinked(_treasuryAddress, _lensProfileId);
    }
    
    /**
     * @dev Gets the number of registered Syndicates
     * @return Count of registered Syndicates
     */
    function getSyndicateCount() external view returns (uint256) {
        return syndicateAddresses.length;
    }
    
    /**
     * @dev Gets a paginated list of Syndicate addresses
     * @param _offset Starting index
     * @param _limit Maximum number to return
     * @return List of Syndicate addresses
     */
    function getSyndicatePaginated(uint256 _offset, uint256 _limit) 
        external 
        view 
        returns (address[] memory) 
    {
        uint256 count = syndicateAddresses.length;
        if (_offset >= count) {
            return new address[](0);
        }
        
        uint256 end = _offset + _limit;
        if (end > count) {
            end = count;
        }
        
        uint256 resultLength = end - _offset;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = syndicateAddresses[_offset + i];
        }
        
        return result;
    }
} 