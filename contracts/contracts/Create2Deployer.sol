// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Create2Deployer
 * @notice Helper contract to deploy other contracts at specific addresses using CREATE2.
 */
contract Create2Deployer {
    error DeploymentFailed();

    event Deployed(address addr, bytes32 salt);

    function deploy(bytes memory bytecode, bytes32 salt) external returns (address addr) {
        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        if (addr == address(0)) revert DeploymentFailed();
        emit Deployed(addr, salt);
    }

    function computeAddress(bytes32 salt, bytes32 codeHash) external view returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            codeHash
        )))));
    }
}
