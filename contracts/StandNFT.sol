// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title StandNFT
 * @dev JoJo Stand NFT on Base Chain - Free Mint (users only pay gas)
 */
contract StandNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Maximum supply (optional, can remove if unlimited)
    uint256 public constant MAX_SUPPLY = 10000;
    
    // Mapping from Farcaster FID to minted status (prevent duplicate mints per user)
    mapping(uint256 => bool) public hasMinted;
    
    // Events
    event StandAwakened(address indexed owner, uint256 indexed tokenId, uint256 fid, string tokenURI);

    constructor() ERC721("JoJo Stand", "STAND") Ownable(msg.sender) {
        // Token ID starts from 1
        _tokenIdCounter.increment();
    }

    /**
     * @dev Free mint function (user only pays gas)
     * @param to The address to mint to
     * @param fid Farcaster FID of the user
     * @param tokenURI IPFS URI containing Stand metadata
     */
    function mint(address to, uint256 fid, string memory tokenURI) public returns (uint256) {
        // Check supply limit
        require(_tokenIdCounter.current() <= MAX_SUPPLY, "Max supply reached");
        
        // Check if user already minted (optional, comment out if users can mint multiple)
        require(!hasMinted[fid], "Already minted your Stand");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Mark user as minted
        hasMinted[fid] = true;
        
        emit StandAwakened(to, tokenId, fid, tokenURI);
        
        return tokenId;
    }

    /**
     * @dev Allow users to mint multiple Stands (removes FID restriction)
     */
    function mintUnrestricted(address to, string memory tokenURI) public returns (uint256) {
        require(_tokenIdCounter.current() <= MAX_SUPPLY, "Max supply reached");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit StandAwakened(to, tokenId, 0, tokenURI);
        
        return tokenId;
    }

    /**
     * @dev Get total supply
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current() - 1;
    }

    // The following functions are overrides required by Solidity.
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
