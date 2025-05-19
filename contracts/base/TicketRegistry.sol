// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TicketRegistry
 * @dev Registry for mapping Megapot lottery tickets to Syndicate addresses
 * Tracks which tickets belong to which Syndicate treasuries
 */
contract TicketRegistry {
    // Owner of the registry
    address public owner;
    
    // Address of the CrossChainResolver
    address public resolver;
    
    // Megapot lottery contract address
    address public megapotContract;
    
    // Mapping from ticket ID to Syndicate treasury address
    mapping(uint256 => address) public ticketToSyndicate;
    
    // Mapping from Syndicate treasury address to their ticket IDs
    mapping(address => uint256[]) public syndicateTickets;
    
    // Mapping of authorized purchasers (can register tickets on behalf of Syndicates)
    mapping(address => bool) public authorizedPurchasers;
    
    // Events
    event TicketRegistered(uint256 indexed ticketId, address indexed syndicateAddress);
    event TicketWon(uint256 indexed ticketId, address indexed syndicateAddress, uint256 amount);
    event AuthorizedPurchaserAdded(address indexed purchaser);
    event AuthorizedPurchaserRemoved(address indexed purchaser);
    event MegapotContractUpdated(address indexed oldContract, address indexed newContract);
    event CrossChainResolverUpdated(address indexed oldResolver, address indexed newResolver);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "TicketRegistry: caller is not owner");
        _;
    }
    
    modifier onlyResolver() {
        require(msg.sender == resolver, "TicketRegistry: caller is not resolver");
        _;
    }
    
    modifier onlyAuthorizedPurchaser() {
        require(authorizedPurchasers[msg.sender] || msg.sender == owner, 
                "TicketRegistry: caller is not authorized");
        _;
    }
    
    constructor(address _megapotContract) {
        owner = msg.sender;
        authorizedPurchasers[msg.sender] = true;
        megapotContract = _megapotContract;
        
        emit AuthorizedPurchaserAdded(msg.sender);
        emit MegapotContractUpdated(address(0), _megapotContract);
    }
    
    /**
     * @dev Sets the CrossChainResolver address
     * @param _resolver Address of the CrossChainResolver
     */
    function setResolver(address _resolver) external onlyOwner {
        require(_resolver != address(0), "TicketRegistry: resolver cannot be zero address");
        address oldResolver = resolver;
        resolver = _resolver;
        
        emit CrossChainResolverUpdated(oldResolver, _resolver);
    }
    
    /**
     * @dev Updates the Megapot lottery contract address
     * @param _megapotContract New Megapot contract address
     */
    function setMegapotContract(address _megapotContract) external onlyOwner {
        require(_megapotContract != address(0), "TicketRegistry: megapot cannot be zero address");
        address oldContract = megapotContract;
        megapotContract = _megapotContract;
        
        emit MegapotContractUpdated(oldContract, _megapotContract);
    }
    
    /**
     * @dev Adds an authorized purchaser
     * @param _purchaser Address to authorize
     */
    function addAuthorizedPurchaser(address _purchaser) external onlyOwner {
        require(_purchaser != address(0), "TicketRegistry: purchaser cannot be zero address");
        require(!authorizedPurchasers[_purchaser], "TicketRegistry: purchaser already authorized");
        
        authorizedPurchasers[_purchaser] = true;
        
        emit AuthorizedPurchaserAdded(_purchaser);
    }
    
    /**
     * @dev Removes an authorized purchaser
     * @param _purchaser Address to de-authorize
     */
    function removeAuthorizedPurchaser(address _purchaser) external onlyOwner {
        require(authorizedPurchasers[_purchaser], "TicketRegistry: purchaser not authorized");
        require(_purchaser != owner, "TicketRegistry: cannot remove owner");
        
        authorizedPurchasers[_purchaser] = false;
        
        emit AuthorizedPurchaserRemoved(_purchaser);
    }
    
    /**
     * @dev Registers a ticket to a Syndicate
     * @param _ticketId Ticket ID
     * @param _syndicateAddress Address of the Syndicate treasury
     */
    function registerTicket(uint256 _ticketId, address _syndicateAddress) 
        external 
        onlyAuthorizedPurchaser 
    {
        require(_ticketId > 0, "TicketRegistry: invalid ticket ID");
        require(_syndicateAddress != address(0), "TicketRegistry: syndicate cannot be zero address");
        require(ticketToSyndicate[_ticketId] == address(0), "TicketRegistry: ticket already registered");
        
        ticketToSyndicate[_ticketId] = _syndicateAddress;
        syndicateTickets[_syndicateAddress].push(_ticketId);
        
        emit TicketRegistered(_ticketId, _syndicateAddress);
    }
    
    /**
     * @dev Registers multiple tickets to a Syndicate
     * @param _ticketIds Array of ticket IDs
     * @param _syndicateAddress Address of the Syndicate treasury
     */
    function registerTicketsBatch(uint256[] calldata _ticketIds, address _syndicateAddress) 
        external 
        onlyAuthorizedPurchaser 
    {
        require(_ticketIds.length > 0, "TicketRegistry: empty ticket array");
        require(_syndicateAddress != address(0), "TicketRegistry: syndicate cannot be zero address");
        
        for (uint256 i = 0; i < _ticketIds.length; i++) {
            uint256 ticketId = _ticketIds[i];
            require(ticketId > 0, "TicketRegistry: invalid ticket ID");
            require(ticketToSyndicate[ticketId] == address(0), "TicketRegistry: ticket already registered");
            
            ticketToSyndicate[ticketId] = _syndicateAddress;
            syndicateTickets[_syndicateAddress].push(ticketId);
            
            emit TicketRegistered(ticketId, _syndicateAddress);
        }
    }
    
    /**
     * @dev Called by the resolver when a ticket wins
     * @param _ticketId Winning ticket ID
     * @param _amount Prize amount
     */
    function notifyWinningTicket(uint256 _ticketId, uint256 _amount) 
        external 
        onlyResolver 
    {
        address syndicateAddress = ticketToSyndicate[_ticketId];
        require(syndicateAddress != address(0), "TicketRegistry: ticket not registered");
        
        emit TicketWon(_ticketId, syndicateAddress, _amount);
    }
    
    /**
     * @dev Gets all tickets for a Syndicate
     * @param _syndicateAddress Address of the Syndicate treasury
     * @return List of ticket IDs
     */
    function getSyndicateTickets(address _syndicateAddress) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return syndicateTickets[_syndicateAddress];
    }
    
    /**
     * @dev Gets the Syndicate address for a ticket
     * @param _ticketId Ticket ID
     * @return Syndicate treasury address
     */
    function getSyndicateForTicket(uint256 _ticketId) 
        external 
        view 
        returns (address) 
    {
        return ticketToSyndicate[_ticketId];
    }
    
    /**
     * @dev Gets the number of tickets for a Syndicate
     * @param _syndicateAddress Address of the Syndicate treasury
     * @return Count of tickets
     */
    function getSyndicateTicketCount(address _syndicateAddress) 
        external 
        view 
        returns (uint256) 
    {
        return syndicateTickets[_syndicateAddress].length;
    }
} 