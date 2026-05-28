// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";

/**
 * @title HandshakeHook
 * @notice A Uniswap V4 Hook that restricts pool swaps to holders of the Handshake NFT
 *         during a custom launch block protection window (Sybil-resistant Fair Launch).
 */
contract HandshakeHook is BaseHook {
    using PoolIdLibrary for PoolKey;

    error BotBlocked();

    IERC721 public immutable handshakeNFT;

    struct ProtectionSettings {
        address creator;
        uint256 launchBlock;
        uint256 protectionDurationBlocks;
    }

    // pool ID -> protection details
    mapping(PoolId => ProtectionSettings) public poolProtection;

    event PoolProtected(PoolId indexed poolId, address indexed creator, uint256 durationBlocks);

    constructor(IPoolManager _poolManager, address _handshakeNFT) BaseHook(_poolManager) {
        handshakeNFT = IERC721(_handshakeNFT);
    }

    /**
     * @notice Hooks permissions configuration.
     *         We enable afterInitialize and beforeSwap.
     */
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: true,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /**
     * @notice Executed after pool initialization.
     *         Records the creator, starting block, and duration.
     */
    function _afterInitialize(
        address sender,
        PoolKey calldata key,
        uint160,
        int24
    ) internal override returns (bytes4) {
        PoolId poolId = key.toId();
        
        // Default to 10,000 blocks window if no custom setting is passed (can be customized via deployment/interaction)
        uint256 durationBlocks = 10000;

        poolProtection[poolId] = ProtectionSettings({
            creator: sender,
            launchBlock: block.number,
            protectionDurationBlocks: durationBlocks
        });

        emit PoolProtected(poolId, sender, durationBlocks);
        return BaseHook.afterInitialize.selector;
    }

    /**
     * @notice Executed before swaps. Enforces that only verified wallets (NFT holders) can swap during protection.
     */
    function _beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata,
        bytes calldata hookData
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();
        ProtectionSettings memory settings = poolProtection[poolId];

        // Check if pool has protection initialized and is within the window
        if (settings.launchBlock > 0 && block.number < settings.launchBlock + settings.protectionDurationBlocks) {
            // Determine swapper: can be passed in hookData or falls back to sender
            address swapper = sender;
            if (hookData.length >= 20) {
                swapper = abi.decode(hookData, (address));
            }

            // Pool creator is exempted from the verification check to seed/arbitrage/test pool initially
            if (swapper != settings.creator) {
                if (handshakeNFT.balanceOf(swapper) == 0) {
                    revert BotBlocked();
                }
            }
        }

        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    /**
     * @notice Set custom protection duration for a pool. Can only be called by the pool creator.
     */
    function setProtectionDuration(PoolKey calldata key, uint256 durationBlocks) external {
        PoolId poolId = key.toId();
        ProtectionSettings storage settings = poolProtection[poolId];
        require(settings.launchBlock > 0, "Pool not initialized");
        require(msg.sender == settings.creator, "Not pool creator");
        // Only allow changing it if the protection window has not expired
        require(block.number < settings.launchBlock + settings.protectionDurationBlocks, "Protection expired");

        settings.protectionDurationBlocks = durationBlocks;
        emit PoolProtected(poolId, settings.creator, durationBlocks);
    }

    /**
     * @notice Utility to view if a pool is protected at the current block.
     */
    function isPoolProtected(PoolId poolId) external view returns (bool) {
        ProtectionSettings memory settings = poolProtection[poolId];
        if (settings.launchBlock == 0) return false;
        return block.number < settings.launchBlock + settings.protectionDurationBlocks;
    }

    /**
     * @notice Utility to get the block number when protection ends.
     */
    function getProtectionEndBlock(PoolId poolId) external view returns (uint256) {
        ProtectionSettings memory settings = poolProtection[poolId];
        return settings.launchBlock + settings.protectionDurationBlocks;
    }
}
