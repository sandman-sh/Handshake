// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";

/**
 * @title PoolManagerWrapper
 * @notice Wrapper to ensure Hardhat compiles the Uniswap V4 PoolManager artifact.
 */
contract PoolManagerWrapper {
    // This exists solely to trigger compilation of PoolManager
}
