// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

/**
 * @title HandshakeLiquidityRouter
 * @notice Wrapper around Uniswap V4's PoolModifyLiquidityTest to enable EOA wallets
 *         to add/remove liquidity through the PoolManager's unlock → callback pattern.
 */
contract HandshakeLiquidityRouter is PoolModifyLiquidityTest {
    constructor(IPoolManager _manager) PoolModifyLiquidityTest(_manager) {}
}
