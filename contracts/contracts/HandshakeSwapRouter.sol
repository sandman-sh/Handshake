// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

/**
 * @title HandshakeSwapRouter
 * @notice Wrapper around Uniswap V4's PoolSwapTest to enable EOA wallets to execute
 *         swaps through the PoolManager's unlock → callback pattern.
 */
contract HandshakeSwapRouter is PoolSwapTest {
    constructor(IPoolManager _manager) PoolSwapTest(_manager) {}
}
