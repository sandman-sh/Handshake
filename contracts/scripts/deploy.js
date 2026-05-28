const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  console.log(`Starting deployment on X Layer Testnet with account: ${deployerAddr}`);
  const balance = await ethers.provider.getBalance(deployerAddr);
  console.log(`Account balance: ${ethers.formatEther(balance)} OKB`);

  // 1. Deploy HandshakeNFT
  console.log("Deploying HandshakeNFT...");
  const HandshakeNFT = await ethers.getContractFactory("HandshakeNFT");
  const nft = await HandshakeNFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log(`HandshakeNFT deployed at: ${nftAddress}`);

  // 2. Deploy PoolManager
  console.log("Deploying PoolManager...");
  const PoolManager = await ethers.getContractFactory("PoolManager");
  const poolManager = await PoolManager.deploy(deployerAddr);
  await poolManager.waitForDeployment();
  const pmAddress = await poolManager.getAddress();
  console.log(`PoolManager deployed at: ${pmAddress}`);

  // 3. Deploy Create2Deployer
  console.log("Deploying Create2Deployer...");
  const Create2Deployer = await ethers.getContractFactory("Create2Deployer");
  const create2Deployer = await Create2Deployer.deploy();
  await create2Deployer.waitForDeployment();
  const deployerAddress = await create2Deployer.getAddress();
  console.log(`Create2Deployer deployed at: ${deployerAddress}`);

  // 4. Deploy Mock ERC20 Tokens for swapping demonstration
  console.log("Deploying Mock ERC20 Tokens...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const tokenA = await MockERC20.deploy("Handshake USD", "HUSD");
  await tokenA.waitForDeployment();
  const tokenB = await MockERC20.deploy("Handshake Token", "HSK");
  await tokenB.waitForDeployment();

  const addrA = await tokenA.getAddress();
  const addrB = await tokenB.getAddress();
  let token0Address, token1Address;
  if (addrA.toLowerCase() < addrB.toLowerCase()) {
    token0Address = addrA;
    token1Address = addrB;
  } else {
    token0Address = addrB;
    token1Address = addrA;
  }
  console.log(`Token0 (lower address): ${token0Address}`);
  console.log(`Token1 (higher address): ${token1Address}`);

  // 5. Mine Hook Address Salt
  console.log("Mining Hook address salt (Permissions: afterInitialize & beforeSwap)...");
  const HookFactory = await ethers.getContractFactory("HandshakeHook");
  const deployTx = await HookFactory.getDeployTransaction(pmAddress, nftAddress);
  const bytecode = deployTx.data;
  const codeHash = ethers.keccak256(bytecode);

  const HOOK_MASK = 0x3fffn;
  const REQUIRED_FLAGS = 0x1080n;

  let salt = 0;
  let hookAddress = "";

  while (true) {
    const saltBytes32 = ethers.zeroPadValue(ethers.toBeHex(salt), 32);
    const hash = ethers.keccak256(
      ethers.concat([
        "0xff",
        deployerAddress,
        saltBytes32,
        codeHash
      ])
    );
    const computedAddress = ethers.getAddress("0x" + hash.slice(-40));
    const suffix = BigInt(computedAddress) & HOOK_MASK;

    if (suffix === REQUIRED_FLAGS) {
      hookAddress = computedAddress;
      salt = saltBytes32;
      break;
    }
    salt++;
  }
  console.log(`Mined salt: ${salt} -> Hook will deploy to: ${hookAddress}`);

  // 6. Deploy Hook using Create2Deployer
  console.log("Deploying HandshakeHook via Create2Deployer...");
  const tx = await create2Deployer.deploy(bytecode, salt);
  await tx.wait();
  console.log(`HandshakeHook deployed successfully at: ${hookAddress}`);

  console.log("\n================ Deployment Summary ================");
  console.log(`HandshakeNFT:     ${nftAddress}`);
  console.log(`PoolManager:      ${pmAddress}`);
  console.log(`Create2Deployer:  ${deployerAddress}`);
  console.log(`Token0 (HUSD):    ${token0Address}`);
  console.log(`Token1 (HSK):     ${token1Address}`);
  console.log(`HandshakeHook:    ${hookAddress}`);
  console.log(`Mined Salt:       ${salt}`);
  console.log("====================================================");

  console.log("\nTo verify the contracts on OKLink (X Layer Testnet Explorer):");
  console.log(`npx hardhat verify --network xlayerTestnet ${nftAddress}`);
  console.log(`npx hardhat verify --network xlayerTestnet ${pmAddress} ${deployerAddr}`);
  console.log(`npx hardhat verify --network xlayerTestnet ${deployerAddress}`);
  console.log(`npx hardhat verify --network xlayerTestnet ${addrA} "Handshake USD" "HUSD"`);
  console.log(`npx hardhat verify --network xlayerTestnet ${addrB} "Handshake Token" "HSK"`);
  // Hook constructor takes (IPoolManager, address)
  console.log(`npx hardhat verify --network xlayerTestnet ${hookAddress} ${pmAddress} ${nftAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
