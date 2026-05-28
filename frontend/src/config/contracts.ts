import { parseAbi } from 'viem';

// Contract addresses deployed on X Layer Testnet
export const CONTRACT_ADDRESSES = {
  NFT: '0xE6676fB1d98333839375D872A96643339c7AF87D',
  POOL_MANAGER: '0x0415085583bDDe9924C3E907102A0b3C71cC41fE',
  HOOK: '0xEb980De49497e528328A0bf4d05AA5e99c2CD080',
  TOKEN0: '0xaF55284883BFe888A26d0811097b85ac18f7A389',
  TOKEN1: '0xC2862B57243264e3160e2bB6F5687f0D4460144D',
  CREATE2_DEPLOYER: '0x7b281EB440AF33B90afE8D28E186303557617b03',
  SWAP_ROUTER: '0x96f628465C7FA2c3E5a0E98fcA1EEBe1311A45ae',
  LIQUIDITY_ROUTER: '0xD29a80Bd5533BaBeb8Add00A4331C32Bb928CB18',
};

export const HANDSHAKE_NFT_ABI = parseAbi([
  'constructor()',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
  'event HumanVerified(address indexed user, uint256 tokenId)',
  'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'function approve(address to, uint256 tokenId) external',
  'function balanceOf(address owner) external view returns (uint256)',
  'function getApproved(uint256 tokenId) external view returns (address)',
  'function hasMinted(address) external view returns (bool)',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  'function isVerified(address wallet) external view returns (bool)',
  'function mint() external returns (uint256)',
  'function name() external view returns (string)',
  'function nextTokenId() external view returns (uint256)',
  'function owner() external view returns (address)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function renounceOwnership() external',
  'function safeTransferFrom(address from, address to, uint256 tokenId) external',
  'function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) external',
  'function setApprovalForAll(address operator, bool approved) external',
  'function supportsInterface(bytes4 interfaceId) external view returns (bool)',
  'function symbol() external view returns (string)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function transferFrom(address from, address to, uint256 tokenId) external',
  'function transferOwnership(address newOwner) external'
]);

export const HANDSHAKE_HOOK_ABI = parseAbi([
  'constructor(address _poolManager, address _handshakeNFT)',
  'error BotBlocked()',
  'event PoolProtected(bytes32 indexed poolId, address indexed creator, uint256 durationBlocks)',
  'function handshakeNFT() external view returns (address)',
  'function getHookPermissions() external pure returns ((bool beforeInitialize, bool afterInitialize, bool beforeAddLiquidity, bool afterAddLiquidity, bool beforeRemoveLiquidity, bool afterRemoveLiquidity, bool beforeSwap, bool afterSwap, bool beforeDonate, bool afterDonate, bool beforeSwapReturnDelta, bool afterSwapReturnDelta, bool afterAddLiquidityReturnDelta, bool afterRemoveLiquidityReturnDelta))',
  'function poolProtection(bytes32) external view returns (address creator, uint256 launchBlock, uint256 protectionDurationBlocks)',
  'function setProtectionDuration((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint256 durationBlocks) external',
  'function isPoolProtected(bytes32 poolId) external view returns (bool)',
  'function getProtectionEndBlock(bytes32 poolId) external view returns (uint256)'
]);

export const POOL_MANAGER_ABI = parseAbi([
  'constructor(address initialOwner)',
  'event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)',
  'event ModifyLiquidity(bytes32 indexed id, address indexed sender, int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt)',
  'event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)',
  'function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)',
]);

// SwapRouter ABI - calls PoolManager through unlock callback pattern
// BalanceDelta is a single int256 (packed int128,int128)
export const SWAP_ROUTER_ABI = parseAbi([
  'function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, (bool takeClaims, bool settleUsingBurn) testSettings, bytes hookData) external payable returns (int256)',
]);

// LiquidityRouter ABI - calls PoolManager through unlock callback pattern
export const LIQUIDITY_ROUTER_ABI = parseAbi([
  'function modifyLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) external payable returns (int256)',
]);

export const ERC20_ABI = parseAbi([
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function mint(address to, uint256 amount) external'
]);
