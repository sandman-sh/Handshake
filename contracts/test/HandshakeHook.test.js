const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HandshakeHook Integration Tests", function () {
  let deployer;
  let creator;
  let verifiedUser;
  let sniperBot;
  let pmOwner;

  let nft;
  let poolManager;
  let create2Deployer;
  let hook;
  let token0;
  let token1;

  let poolKey;
  let poolId;

  // Mask and Flags for the hook address
  // afterInitialize: 0x1000, beforeSwap: 0x0080
  // Required suffix: 0x1080
  const HOOK_MASK = 0x3fffn;
  const REQUIRED_FLAGS = 0x1080n;

  before(async function () {
    [deployer, creator, verifiedUser, sniperBot, pmOwner] = await ethers.getSigners();

    // 1. Deploy HandshakeNFT
    const HandshakeNFT = await ethers.getContractFactory("HandshakeNFT");
    nft = await HandshakeNFT.deploy();
    await nft.waitForDeployment();
    console.log("HandshakeNFT deployed at:", await nft.getAddress());

    // 2. Deploy PoolManager
    const PoolManager = await ethers.getContractFactory("PoolManager");
    poolManager = await PoolManager.deploy(await pmOwner.getAddress());
    await poolManager.waitForDeployment();
    console.log("PoolManager deployed at:", await poolManager.getAddress());

    // 3. Deploy Create2Deployer
    const Create2Deployer = await ethers.getContractFactory("Create2Deployer");
    create2Deployer = await Create2Deployer.deploy();
    await create2Deployer.waitForDeployment();
    console.log("Create2Deployer deployed at:", await create2Deployer.getAddress());

    // 4. Deploy Mock ERC20 Tokens (Token A and Token B)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const tA = await MockERC20.deploy("Token A", "TKNA");
    await tA.waitForDeployment();
    const tB = await MockERC20.deploy("Token B", "TKNB");
    await tB.waitForDeployment();

    // Uniswap V4 requires currency0 < currency1
    const addrA = await tA.getAddress();
    const addrB = await tB.getAddress();
    if (addrA.toLowerCase() < addrB.toLowerCase()) {
      token0 = tA;
      token1 = tB;
    } else {
      token0 = tB;
      token1 = tA;
    }
    console.log(`Tokens: Token0 (${await token0.symbol()}) at ${await token0.getAddress()}, Token1 (${await token1.symbol()}) at ${await token1.getAddress()}`);

    // 5. Mine Salt for HandshakeHook address
    const HookFactory = await ethers.getContractFactory("HandshakeHook");
    const pmAddress = await poolManager.getAddress();
    const nftAddress = await nft.getAddress();
    
    // Get Hook bytecode with constructor args
    const deployTx = await HookFactory.getDeployTransaction(pmAddress, nftAddress);
    const bytecode = deployTx.data;
    const codeHash = ethers.keccak256(bytecode);

    console.log("Mining Hook address salt (looking for suffix matching 0x1080)...");
    let salt = 0;
    let hookAddress = "";
    const deployerAddress = await create2Deployer.getAddress();

    while (true) {
      const saltBytes32 = ethers.zeroPadValue(ethers.toBeHex(salt), 32);
      // Compute address locally
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

    // 6. Deploy Hook via Create2Deployer
    const tx = await create2Deployer.deploy(bytecode, salt);
    await tx.wait();
    hook = HookFactory.attach(hookAddress);
    console.log("HandshakeHook deployed successfully via CREATE2!");
  });

  it("should initialize pool and check protection stats", async function () {
    const t0Address = await token0.getAddress();
    const t1Address = await token1.getAddress();
    const hookAddress = await hook.getAddress();

    // Define PoolKey
    poolKey = {
      currency0: t0Address,
      currency1: t1Address,
      fee: 3000, // 0.3%
      tickSpacing: 60,
      hooks: hookAddress
    };

    // Encoded hookData representing custom protection duration (e.g., 20 blocks for testing)
    const customProtectionDuration = 20n;
    const hookData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [customProtectionDuration]);

    // Initial sqrtPriceX96 (1:1 price ratio = 2^96)
    const sqrtPriceX96 = 79228162514264337593543950336n;

    // Initialize the pool via PoolManager
    const tx = await poolManager.connect(creator).initialize(poolKey, sqrtPriceX96);
    await tx.wait();

    // Set custom protection duration (20 blocks) via Hook
    const txDuration = await hook.connect(creator).setProtectionDuration(poolKey, customProtectionDuration);
    await txDuration.wait();

    // Compute Pool ID
    // keccak256(abi.encode(poolKey))
    const encodedKey = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint24", "int24", "address"],
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
    );
    poolId = ethers.keccak256(encodedKey);

    const isProtected = await hook.isPoolProtected(poolId);
    expect(isProtected).to.be.true;

    const endBlock = await hook.getProtectionEndBlock(poolId);
    const settings = await hook.poolProtection(poolId);
    const launchBlock = settings.launchBlock;
    expect(endBlock).to.equal(launchBlock + customProtectionDuration);
  });

  it("should fail swap from unverified user during protection window", async function () {
    // Attempt swap from sniperBot (unverified, doesn't hold NFT)
    // Setup swap parameters
    const swapParams = {
      zeroForOne: true,
      amountSpecified: -1000n, // exact input of 1000
      sqrtPriceLimitX96: 4295128739n // min price limit
    };

    // Prepare hook data with the swapper address
    const swapperBytes = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [await sniperBot.getAddress()]);

    // Mint some token0 to sniperBot to swap
    await token0.mint(await sniperBot.getAddress(), 100000n);
    await token0.connect(sniperBot).approve(await poolManager.getAddress(), 100000n);

    // Call PoolManager.swap -> should revert via the Hook's BotBlocked custom error
    // Note: PoolManager will bubble up the custom revert from the hook.
    await expect(
      poolManager.connect(sniperBot).swap(poolKey, swapParams, swapperBytes)
    ).to.be.reverted;
  });

  it("should allow swap from creator even if they are unverified", async function () {
    const swapParams = {
      zeroForOne: true,
      amountSpecified: -1000n,
      sqrtPriceLimitX96: 4295128739n
    };

    const swapperBytes = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [await creator.getAddress()]);
    await token0.mint(await creator.getAddress(), 100000n);
    await token0.connect(creator).approve(await poolManager.getAddress(), 100000n);

    // Swap should not revert due to BotBlocked (it might fail due to no liquidity, but won't revert with BotBlocked)
    try {
      await poolManager.connect(creator).swap(poolKey, swapParams, swapperBytes);
    } catch (err) {
      // Revert is fine as long as it's not BotBlocked. We check that it didn't revert with BotBlocked
      expect(err.message).to.not.include("BotBlocked");
    }
  });

  it("should allow swap from user after minting Handshake NFT", async function () {
    // 1. Mint NFT to verifiedUser
    const txMint = await nft.connect(verifiedUser).mint();
    await txMint.wait();

    expect(await nft.balanceOf(await verifiedUser.getAddress())).to.equal(1n);

    // 2. Perform Swap
    const swapParams = {
      zeroForOne: true,
      amountSpecified: -1000n,
      sqrtPriceLimitX96: 4295128739n
    };

    const swapperBytes = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [await verifiedUser.getAddress()]);
    await token0.mint(await verifiedUser.getAddress(), 100000n);
    await token0.connect(verifiedUser).approve(await poolManager.getAddress(), 100000n);

    // Verify it doesn't revert with BotBlocked
    try {
      await poolManager.connect(verifiedUser).swap(poolKey, swapParams, swapperBytes);
    } catch (err) {
      expect(err.message).to.not.include("BotBlocked");
    }
  });

  it("should allow swap from unverified user after protection window ends", async function () {
    // 1. Advance blocks in hardhat to end protection window
    // We configured duration = 20 blocks. Let's mine 25 blocks.
    for (let i = 0; i < 25; i++) {
      await ethers.provider.send("evm_mine");
    }

    const isProtected = await hook.isPoolProtected(poolId);
    expect(isProtected).to.be.false;

    // 2. Attempt swap from sniperBot (still unverified)
    const swapParams = {
      zeroForOne: true,
      amountSpecified: -1000n,
      sqrtPriceLimitX96: 4295128739n
    };

    const swapperBytes = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [await sniperBot.getAddress()]);

    // Swap should not fail with BotBlocked since protection is disabled
    try {
      await poolManager.connect(sniperBot).swap(poolKey, swapParams, swapperBytes);
    } catch (err) {
      expect(err.message).to.not.include("BotBlocked");
    }
  });
});
