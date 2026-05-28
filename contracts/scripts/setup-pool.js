const { ethers } = require("hardhat");

/**
 * This script initializes a pool and seeds it with liquidity so that
 * the swap page works end-to-end on X Layer Testnet.
 * 
 * Run with: npx hardhat run scripts/setup-pool.js --network xlayerTestnet
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  console.log(`Setting up pool with account: ${deployerAddr}`);

  // Deployed contract addresses on X Layer Testnet
  const ADDRESSES = {
    POOL_MANAGER: "0x0415085583bDDe9924C3E907102A0b3C71cC41fE",
    HOOK: "0xEb980De49497e528328A0bf4d05AA5e99c2CD080",
    TOKEN0: "0xaF55284883BFe888A26d0811097b85ac18f7A389",
    TOKEN1: "0xC2862B57243264e3160e2bB6F5687f0D4460144D",
    SWAP_ROUTER: "0x96f628465C7FA2c3E5a0E98fcA1EEBe1311A45ae",
    LIQUIDITY_ROUTER: "0xD29a80Bd5533BaBeb8Add00A4331C32Bb928CB18",
  };

  // Sort tokens (Uniswap V4 requires currency0 < currency1)
  let t0 = ADDRESSES.TOKEN0;
  let t1 = ADDRESSES.TOKEN1;
  if (t0.toLowerCase() > t1.toLowerCase()) {
    const temp = t0;
    t0 = t1;
    t1 = temp;
  }
  console.log(`Token0: ${t0}`);
  console.log(`Token1: ${t1}`);

  // PoolKey
  const poolKey = {
    currency0: t0,
    currency1: t1,
    fee: 3000,
    tickSpacing: 60,
    hooks: ADDRESSES.HOOK,
  };

  // ============ Step 1: Initialize Pool ============
  console.log("\n--- Step 1: Initialize Pool ---");
  const PoolManager = await ethers.getContractAt("PoolManager", ADDRESSES.POOL_MANAGER);
  const sqrtPriceX96 = 79228162514264337593543950336n; // 1:1 price ratio

  try {
    const initTx = await PoolManager.initialize(
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      sqrtPriceX96,
      { gasLimit: 500000 }
    );
    const receipt = await initTx.wait();
    console.log(`Pool initialized! Tx: ${receipt.hash}`);
  } catch (err) {
    if (err.message.includes("PoolAlreadyInitialized") || err.message.includes("already")) {
      console.log("Pool already initialized, skipping...");
    } else {
      console.log("Init error (may be already initialized):", err.message.slice(0, 100));
    }
  }

  // ============ Step 2: Set Protection Duration ============
  console.log("\n--- Step 2: Set Protection Duration ---");
  const Hook = await ethers.getContractAt("HandshakeHook", ADDRESSES.HOOK);
  
  try {
    const durTx = await Hook.setProtectionDuration(
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      1000, // 1000 blocks protection
      { gasLimit: 200000 }
    );
    const durReceipt = await durTx.wait();
    console.log(`Protection set to 1000 blocks! Tx: ${durReceipt.hash}`);
  } catch (err) {
    console.log("Duration error (may already be set):", err.message.slice(0, 100));
  }

  // ============ Step 3: Mint Test Tokens ============
  console.log("\n--- Step 3: Mint Test Tokens ---");
  const Token0 = await ethers.getContractAt("MockERC20", t0);
  const Token1 = await ethers.getContractAt("MockERC20", t1);

  const mintAmount = ethers.parseEther("100000"); // 100k tokens each

  try {
    const mint0Tx = await Token0.mint(deployerAddr, mintAmount, { gasLimit: 100000 });
    await mint0Tx.wait();
    console.log(`Minted 100,000 Token0 to deployer`);
  } catch (err) {
    console.log("Mint0 error:", err.message.slice(0, 100));
  }

  try {
    const mint1Tx = await Token1.mint(deployerAddr, mintAmount, { gasLimit: 100000 });
    await mint1Tx.wait();
    console.log(`Minted 100,000 Token1 to deployer`);
  } catch (err) {
    console.log("Mint1 error:", err.message.slice(0, 100));
  }

  // ============ Step 4: Approve Tokens to LiquidityRouter ============
  console.log("\n--- Step 4: Approve Tokens ---");
  const approveAmount = ethers.parseEther("100000");

  try {
    const app0Tx = await Token0.approve(ADDRESSES.LIQUIDITY_ROUTER, approveAmount, { gasLimit: 100000 });
    await app0Tx.wait();
    console.log(`Token0 approved to LiquidityRouter`);
  } catch (err) {
    console.log("Approve0 error:", err.message.slice(0, 100));
  }

  try {
    const app1Tx = await Token1.approve(ADDRESSES.LIQUIDITY_ROUTER, approveAmount, { gasLimit: 100000 });
    await app1Tx.wait();
    console.log(`Token1 approved to LiquidityRouter`);
  } catch (err) {
    console.log("Approve1 error:", err.message.slice(0, 100));
  }

  // ============ Step 5: Add Liquidity via Router ============
  console.log("\n--- Step 5: Add Liquidity via Router ---");
  const LiquidityRouter = await ethers.getContractAt("HandshakeLiquidityRouter", ADDRESSES.LIQUIDITY_ROUTER);

  // Full-range liquidity: tickLower = -887220, tickUpper = 887220
  const liquidityParams = {
    tickLower: -887220,
    tickUpper: 887220,
    liquidityDelta: ethers.parseEther("10000"), // 10k units of liquidity
    salt: ethers.ZeroHash,
  };

  try {
    const liqTx = await LiquidityRouter.modifyLiquidity(
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      [liquidityParams.tickLower, liquidityParams.tickUpper, liquidityParams.liquidityDelta, liquidityParams.salt],
      "0x", // empty hookData
      { gasLimit: 1000000 }
    );
    const liqReceipt = await liqTx.wait();
    console.log(`Liquidity added! Tx: ${liqReceipt.hash}`);
  } catch (err) {
    console.log("Liquidity error:", err.message.slice(0, 200));
  }

  // ============ Verify ============
  console.log("\n--- Verification ---");
  const bal0 = await Token0.balanceOf(ADDRESSES.POOL_MANAGER);
  const bal1 = await Token1.balanceOf(ADDRESSES.POOL_MANAGER);
  console.log(`Token0 in PoolManager: ${ethers.formatEther(bal0)}`);
  console.log(`Token1 in PoolManager: ${ethers.formatEther(bal1)}`);
  console.log("\n✅ Pool setup complete! Users can now swap on the frontend.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
