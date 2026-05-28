'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { CONTRACT_ADDRESSES, POOL_MANAGER_ABI, HANDSHAKE_HOOK_ABI, LIQUIDITY_ROUTER_ABI, ERC20_ABI } from '@/config/contracts';
import { motion } from 'framer-motion';
import { Settings, HelpCircle, Loader2, CheckCircle2, AlertTriangle, Droplets } from 'lucide-react';

export default function PoolDeployer() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [token0, setToken0] = useState(CONTRACT_ADDRESSES.TOKEN0);
  const [token1, setToken1] = useState(CONTRACT_ADDRESSES.TOKEN1);
  const [fee, setFee] = useState<number>(3000);
  const [protectionBlocks, setProtectionBlocks] = useState<number>(1000);
  const [liquidityAmount, setLiquidityAmount] = useState('1000');
  const [step, setStep] = useState<'form' | 'seeding' | 'success'>('form');

  // Pool initialization
  const { data: initHash, error: initError, isPending: isInitPending, writeContract: writeInit } = useWriteContract();
  const { data: durationHash, error: durationError, isPending: isDurationPending, writeContract: writeDuration } = useWriteContract();

  // Liquidity seeding
  const { data: approve0Hash, error: approve0Error, isPending: isApprove0Pending, writeContract: writeApprove0 } = useWriteContract();
  const { data: approve1Hash, error: approve1Error, isPending: isApprove1Pending, writeContract: writeApprove1 } = useWriteContract();
  const { data: liquidityHash, error: liquidityError, isPending: isLiquidityPending, writeContract: writeLiquidity } = useWriteContract();

  const { isLoading: isInitLoading, isSuccess: isInitSuccess } = useWaitForTransactionReceipt({ hash: initHash });
  const { isLoading: isDurationLoading, isSuccess: isDurationSuccess } = useWaitForTransactionReceipt({ hash: durationHash });
  const { isLoading: isApprove0Loading, isSuccess: isApprove0Success } = useWaitForTransactionReceipt({ hash: approve0Hash });
  const { isLoading: isApprove1Loading, isSuccess: isApprove1Success } = useWaitForTransactionReceipt({ hash: approve1Hash });
  const { isLoading: isLiquidityLoading, isSuccess: isLiquiditySuccess } = useWaitForTransactionReceipt({ hash: liquidityHash });

  const getSortedTokens = () => {
    let t0 = token0.toLowerCase();
    let t1 = token1.toLowerCase();
    if (t0 > t1) {
      const temp = t0;
      t0 = t1;
      t1 = temp;
    }
    return { t0, t1 };
  };

  const handleCreatePool = () => {
    const { t0, t1 } = getSortedTokens();

    const poolKey = {
      currency0: t0 as `0x${string}`,
      currency1: t1 as `0x${string}`,
      fee: fee,
      tickSpacing: 60,
      hooks: CONTRACT_ADDRESSES.HOOK as `0x${string}`,
    };

    // Initial price ratio 1:1 (sqrtPriceX96 = 2^96)
    const sqrtPriceX96 = 79228162514264337593543950336n;

    writeInit({
      address: CONTRACT_ADDRESSES.POOL_MANAGER as `0x${string}`,
      abi: POOL_MANAGER_ABI,
      functionName: 'initialize',
      args: [poolKey, sqrtPriceX96],
    });
  };

  // Step 2: After pool init, set protection duration
  useEffect(() => {
    if (isInitSuccess) {
      const { t0, t1 } = getSortedTokens();
      const poolKey = {
        currency0: t0 as `0x${string}`,
        currency1: t1 as `0x${string}`,
        fee: fee,
        tickSpacing: 60,
        hooks: CONTRACT_ADDRESSES.HOOK as `0x${string}`,
      };

      writeDuration({
        address: CONTRACT_ADDRESSES.HOOK as `0x${string}`,
        abi: HANDSHAKE_HOOK_ABI,
        functionName: 'setProtectionDuration',
        args: [poolKey, BigInt(protectionBlocks)],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitSuccess]);

  // Step 3: After duration is set, move to seeding step
  useEffect(() => {
    if (isDurationSuccess) {
      setStep('seeding');
    }
  }, [isDurationSuccess]);

  // Handle seed liquidity flow
  const handleSeedLiquidity = () => {
    const amount = BigInt(Math.floor(parseFloat(liquidityAmount) * 1e18));
    const { t0 } = getSortedTokens();

    // Approve token0 to LiquidityRouter
    const approveToken = t0 === token0.toLowerCase() ? CONTRACT_ADDRESSES.TOKEN0 : CONTRACT_ADDRESSES.TOKEN1;
    writeApprove0({
      address: approveToken as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.LIQUIDITY_ROUTER as `0x${string}`, amount],
      gas: 100000n,
    });
  };

  // After token0 approved, approve token1
  useEffect(() => {
    if (isApprove0Success) {
      const amount = BigInt(Math.floor(parseFloat(liquidityAmount) * 1e18));
      const { t0 } = getSortedTokens();
      const approveToken = t0 === token0.toLowerCase() ? CONTRACT_ADDRESSES.TOKEN1 : CONTRACT_ADDRESSES.TOKEN0;

      writeApprove1({
        address: approveToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.LIQUIDITY_ROUTER as `0x${string}`, amount],
        gas: 100000n,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApprove0Success]);

  // After both tokens approved, add liquidity via router
  useEffect(() => {
    if (isApprove1Success) {
      const { t0, t1 } = getSortedTokens();
      const poolKey = {
        currency0: t0 as `0x${string}`,
        currency1: t1 as `0x${string}`,
        fee: fee,
        tickSpacing: 60,
        hooks: CONTRACT_ADDRESSES.HOOK as `0x${string}`,
      };

      // Full-range liquidity: tickLower = -887220, tickUpper = 887220 (max range for tickSpacing=60)
      const liquidityParams = {
        tickLower: -887220,
        tickUpper: 887220,
        liquidityDelta: BigInt(Math.floor(parseFloat(liquidityAmount) * 1e18)),
        salt: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      };

      writeLiquidity({
        address: CONTRACT_ADDRESSES.LIQUIDITY_ROUTER as `0x${string}`,
        abi: LIQUIDITY_ROUTER_ABI,
        functionName: 'modifyLiquidity',
        args: [poolKey, liquidityParams, '0x' as `0x${string}`],
        gas: 1000000n,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApprove1Success]);

  // Final success
  useEffect(() => {
    if (isLiquiditySuccess) {
      setStep('success');
    }
  }, [isLiquiditySuccess]);

  const isWrongNetwork = isConnected && chainId !== 1952 && chainId !== 195;
  const allErrors = initError || durationError || approve0Error || approve1Error || liquidityError;

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <Navbar />

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {step === 'success' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 text-center"
            >
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 border border-accent/20">
                <CheckCircle2 className="h-7 w-7 text-accent" />
              </div>
              <h2 className="text-xl font-bold mb-2">Pool Created & Liquidity Seeded!</h2>
              <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                Your Uniswap V4 pool has been initialized, protected by the Handshake Hook for{' '}
                <span className="text-accent font-semibold font-mono">{protectionBlocks} blocks</span>, and seeded with initial liquidity. Users can now swap on the <span className="text-white font-semibold">/swap</span> page.
              </p>
              <button
                onClick={() => { setStep('form'); }}
                className="w-full rounded-lg bg-neutral-900 border border-neutral-800 py-3 text-sm font-semibold text-white transition-all hover:bg-neutral-950"
              >
                Create Another Pool
              </button>
            </motion.div>
          ) : step === 'seeding' ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Droplets className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-bold font-mono">Seed Initial Liquidity</h2>
              </div>

              <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                Pool initialized and protected! Now seed it with initial liquidity so users can swap. Tokens will be deposited as full-range liquidity via the Liquidity Router.
              </p>

              <div className="mb-6">
                <label className="text-xs text-neutral-400 font-mono block mb-1.5">Liquidity Amount (per token)</label>
                <input
                  type="number"
                  value={liquidityAmount}
                  onChange={(e) => setLiquidityAmount(e.target.value)}
                  className="w-full rounded-lg bg-neutral-900 border border-neutral-850 px-4 py-3 text-sm font-mono outline-none focus:border-accent transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {allErrors && (
                <div className="mb-4 rounded-lg bg-red-950/20 border border-red-500/20 p-3 text-xs text-red-400">
                  Error: {allErrors?.message.slice(0, 120)}...
                </div>
              )}

              <button
                disabled={isApprove0Pending || isApprove0Loading || isApprove1Pending || isApprove1Loading || isLiquidityPending || isLiquidityLoading || !liquidityAmount}
                onClick={handleSeedLiquidity}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent py-3.5 text-sm font-semibold text-black transition-all hover:bg-accent-hover disabled:opacity-50 disabled:pointer-events-none active:scale-98 uppercase font-mono tracking-wider"
              >
                {isApprove0Pending || isApprove0Loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Approving Token 0...</>
                ) : isApprove1Pending || isApprove1Loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Approving Token 1...</>
                ) : isLiquidityPending || isLiquidityLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Adding Liquidity...</>
                ) : (
                  'Seed Liquidity via Router'
                )}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-bold font-mono">Deploy Protected V4 Pool</h2>
              </div>

              {/* Token Configuration */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-neutral-400 font-mono block mb-1.5">Token 0 Address</label>
                  <input
                    type="text"
                    value={token0}
                    onChange={(e) => setToken0(e.target.value)}
                    className="w-full rounded-lg bg-neutral-900 border border-neutral-850 px-4 py-3 text-sm font-mono outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 font-mono block mb-1.5">Token 1 Address</label>
                  <input
                    type="text"
                    value={token1}
                    onChange={(e) => setToken1(e.target.value)}
                    className="w-full rounded-lg bg-neutral-900 border border-neutral-850 px-4 py-3 text-sm font-mono outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              {/* Pool Fee Tier */}
              <div className="mb-6">
                <label className="text-xs text-neutral-400 font-mono block mb-2">Pool Fee Tier</label>
                <div className="grid grid-cols-3 gap-3">
                  {[500, 3000, 10000].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setFee(tier)}
                      className={`rounded-lg py-2.5 text-xs font-mono font-semibold transition-all border ${
                        fee === tier
                          ? 'bg-accent/10 border-accent text-accent'
                          : 'bg-neutral-900 border-neutral-850 text-neutral-400 hover:bg-neutral-950'
                      }`}
                    >
                      {(tier / 10000).toFixed(2)}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Protection Duration Slider */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-neutral-400 font-mono">Protection Window</label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-neutral-500 cursor-pointer" />
                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-neutral-900 p-2 text-[10px] text-neutral-400 opacity-0 transition-opacity border border-neutral-800 group-hover:opacity-100">
                        Duration in blocks for which swaps are locked to unverified human wallets.
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono text-accent bg-accent/5 px-2 py-0.5 rounded border border-accent/10">
                    {protectionBlocks.toLocaleString()} Blocks
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={protectionBlocks}
                  onChange={(e) => setProtectionBlocks(Number(e.target.value))}
                  className="w-full accent-accent h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer border border-neutral-850"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
                  <span>100 blocks (Fast)</span>
                  <span>10,000 blocks (Sustained)</span>
                </div>
              </div>

              {/* Error messages */}
              {allErrors && (
                <div className="mb-4 rounded-lg bg-red-950/20 border border-red-500/20 p-3 text-xs text-red-400">
                  Deployment Error: {allErrors?.message.slice(0, 100)}...
                </div>
              )}

              {/* Deploy Action Button */}
              {!isConnected ? (
                <button
                  disabled
                  className="w-full rounded-lg bg-neutral-900 border border-neutral-800 py-3.5 text-sm font-semibold text-neutral-500"
                >
                  Connect Wallet to Initialize Pool
                </button>
              ) : isWrongNetwork ? (
                <div className="space-y-3">
                  <div className="w-full rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center">
                    Wrong Network. Currently on Chain ID <span className="font-mono text-white font-semibold">{(chainId as any) || 'unknown'}</span>.
                  </div>
                  <button
                    onClick={() => switchChain?.({ chainId: 1952 })}
                    className="w-full bg-red-500 hover:bg-red-600 text-black py-3.5 rounded-lg text-sm font-semibold transition-all uppercase font-mono tracking-wider cursor-pointer"
                  >
                    Switch to X Layer Testnet
                  </button>
                </div>
              ) : (
                <button
                  disabled={isInitPending || isInitLoading || isDurationPending || isDurationLoading}
                  onClick={handleCreatePool}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent py-3.5 text-sm font-semibold text-black transition-all hover:bg-accent-hover disabled:opacity-50 disabled:pointer-events-none active:scale-98 uppercase font-mono tracking-wider"
                >
                  {isInitPending || isInitLoading || isDurationPending || isDurationLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isInitLoading ? 'Initializing Pool...' : 'Setting Protection Duration...'}
                    </>
                  ) : (
                    'Initialize Protected Pool'
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
