const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  console.log(`Deploying routers on X Layer Testnet with account: ${deployerAddr}`);
  const balance = await ethers.provider.getBalance(deployerAddr);
  console.log(`Account balance: ${ethers.formatEther(balance)} OKB`);

  // Existing PoolManager address on X Layer Testnet
  const POOL_MANAGER_ADDRESS = "0x0415085583bDDe9924C3E907102A0b3C71cC41fE";

  // 1. Deploy HandshakeSwapRouter
  console.log("Deploying HandshakeSwapRouter...");
  const SwapRouter = await ethers.getContractFactory("HandshakeSwapRouter");
  const swapRouter = await SwapRouter.deploy(POOL_MANAGER_ADDRESS);
  await swapRouter.waitForDeployment();
  const swapRouterAddress = await swapRouter.getAddress();
  console.log(`HandshakeSwapRouter deployed at: ${swapRouterAddress}`);

  // 2. Deploy HandshakeLiquidityRouter
  console.log("Deploying HandshakeLiquidityRouter...");
  const LiquidityRouter = await ethers.getContractFactory("HandshakeLiquidityRouter");
  const liquidityRouter = await LiquidityRouter.deploy(POOL_MANAGER_ADDRESS);
  await liquidityRouter.waitForDeployment();
  const liquidityRouterAddress = await liquidityRouter.getAddress();
  console.log(`HandshakeLiquidityRouter deployed at: ${liquidityRouterAddress}`);

  console.log("\n================ Router Deployment Summary ================");
  console.log(`HandshakeSwapRouter:      ${swapRouterAddress}`);
  console.log(`HandshakeLiquidityRouter: ${liquidityRouterAddress}`);
  console.log(`PoolManager (existing):   ${POOL_MANAGER_ADDRESS}`);
  console.log("============================================================");

  console.log("\nTo verify:");
  console.log(`npx hardhat verify --network xlayerTestnet ${swapRouterAddress} ${POOL_MANAGER_ADDRESS}`);
  console.log(`npx hardhat verify --network xlayerTestnet ${liquidityRouterAddress} ${POOL_MANAGER_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
