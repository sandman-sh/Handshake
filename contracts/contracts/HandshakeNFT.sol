// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title HandshakeNFT
 * @notice Sybil-resistant credential token. Users mint this on X Layer Testnet
 *         to verify they are human, allowing them to swap on protected pools.
 */
contract HandshakeNFT is ERC721, Ownable {
    using Strings for uint256;

    uint256 public nextTokenId;
    
    // Mapping to ensure one mint per address (Sybil prevention for demo/testnet)
    mapping(address => bool) public hasMinted;

    event HumanVerified(address indexed user, uint256 tokenId);

    constructor() ERC721("Handshake Human Credential", "HSH") Ownable(msg.sender) {}

    /**
     * @notice Mint a credential NFT. Limit to one per wallet.
     */
    function mint() external returns (uint256) {
        require(!hasMinted[msg.sender], "Address already verified");
        
        uint256 tokenId = nextTokenId;
        nextTokenId++;
        
        hasMinted[msg.sender] = true;
        _safeMint(msg.sender, tokenId);
        
        emit HumanVerified(msg.sender, tokenId);
        return tokenId;
    }

    /**
     * @notice Check if a wallet holds the Handshake Credential.
     */
    function isVerified(address wallet) external view returns (bool) {
        return balanceOf(wallet) > 0;
    }

    /**
     * @notice Overridden tokenURI to generate a beautiful on-chain SVG representing Handshake verification.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory svg = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">',
                '<rect width="400" height="400" fill="#000000"/>',
                '<circle cx="200" cy="200" r="180" stroke="#CCFF00" stroke-width="2" fill="none" opacity="0.3"/>',
                '<rect x="30" y="30" width="340" height="340" rx="15" fill="#111111" stroke="#333333" stroke-width="2"/>',
                '<text x="200" y="80" fill="#CCFF00" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle" letter-spacing="4">HANDSHAKE</text>',
                '<text x="200" y="110" fill="#FFFFFF" font-family="monospace" font-size="12" text-anchor="middle" opacity="0.6">VERIFIED HUMAN CREDENTIAL</text>',
                '<circle cx="200" cy="210" r="50" fill="#CCFF00" opacity="0.05"/>',
                '<path d="M170,210 Q200,180 230,210 T290,210" stroke="#CCFF00" stroke-width="4" stroke-linecap="round" fill="none"/>',
                '<path d="M170,220 Q200,190 230,220" stroke="#CCFF00" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7"/>',
                '<text x="200" y="310" fill="#FFFFFF" font-family="monospace" font-size="14" text-anchor="middle">TOKEN ID: #', tokenId.toString(), '</text>',
                '<text x="200" y="335" fill="#A0A0A0" font-family="monospace" font-size="10" text-anchor="middle">X LAYER TESTNET</text>',
                '</svg>'
            )
        );

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Handshake Human Credential #', tokenId.toString(), '", ',
                        '"description": "Sybil-resistant verification credential for Handshake Uniswap V4 Hook.", ',
                        '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '", ',
                        '"attributes": [{"trait_type": "Verified", "value": "True"}]}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }
}
