'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { CONTRACT_ADDRESSES, HANDSHAKE_NFT_ABI, SWAP_ROUTER_ABI, ERC20_ABI } from '@/config/contracts';
import { encodeAbiParameters, parseAbiParameters } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, AlertTriangle, CheckCircle, Loader2, Coins } from 'lucide-react';

export default function SwapPortal() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState<'0to1' | '1to0'>('0to1');

  // 1. Check if user is human-verified (holds NFT)
  const { data: balance, refetch: refetchNFTBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
    abi: HANDSHAKE_NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const isVerified = balance !== undefined && balance > 0n;

  // 2. Fetch token balances
  const { data: token0Balance, refetch: refetchToken0 } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN0 as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: token1Balance, refetch: refetchToken1 } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN1 as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // 3. Faucet: Mint test tokens
  const { data: mintHash, error: mintError, isPending: isMintPending, writeContract: writeMint } = useWriteContract();
  const { isLoading: isMintLoading, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({ hash: mintHash });

  // 4. Write contract: Approve SwapRouter (NOT PoolManager)
  const { data: approveHash, error: approveError, isPending: isApprovePending, writeContract: writeApprove } = useWriteContract();

  // 5. Write contract: Swap via SwapRouter
  const { data: swapHash, error: swapError, isPending: isSwapPending, writeContract: writeSwap } = useWriteContract();

  // 6. Wait for transaction receipts
  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isSwapLoading, isSuccess: isSwapSuccess } = useWaitForTransactionReceipt({ hash: swapHash });

  // Update balances when tx completes
  useEffect(() => {
    if (isSwapSuccess || isApproveSuccess || isMintSuccess) {
      refetchToken0();
      refetchToken1();
      refetchNFTBalance();
    }
  }, [isSwapSuccess, isApproveSuccess, isMintSuccess, refetchToken0, refetchToken1, refetchNFTBalance]);

  const handleMintTestTokens = () => {
    if (!address) return;
    // Mint 10,000 HUSD to user
    writeMint({
      address: CONTRACT_ADDRESSES.TOKEN0 as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'mint',
      args: [address, BigInt(10000) * BigInt(1e18)],
      gas: 200000n,
    });
  };

  // After HUSD minted, also mint HSK
  useEffect(() => {
    if (isMintSuccess && address) {
      writeMint({
        address: CONTRACT_ADDRESSES.TOKEN1 as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'mint',
        args: [address, BigInt(10000) * BigInt(1e18)],
        gas: 200000n,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMintSuccess]);

  // Calculate swap estimation (fee deduction preview)
  useEffect(() => {
    if (fromAmount) {
      const amount = parseFloat(fromAmount);
      if (!isNaN(amount)) {
        // 0.3% fee deduction estimate
        setToAmount((amount * 0.997).toFixed(4));
      }
    } else {
      setToAmount('');
    }
  }, [fromAmount]);

  const handleApproveAndSwap = async () => {
    if (!address) return;

    const inputTokenAddress = swapDirection === '0to1' ? CONTRACT_ADDRESSES.TOKEN0 : CONTRACT_ADDRESSES.TOKEN1;
    const amountToSwap = BigInt(Math.floor(parseFloat(fromAmount) * 1e18));

    // Approve the SWAP ROUTER (not PoolManager) to spend tokens
    writeApprove({
      address: inputTokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.SWAP_ROUTER as `0x${string}`, amountToSwap],
      gas: 100000n,
    });
  };

  // When approval completes, fire the swap tx via the SwapRouter
  useEffect(() => {
    if (isApproveSuccess && address) {
      executeSwap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproveSuccess]);

  const executeSwap = () => {
    if (!address || !fromAmount) return;
    const amountToSwap = BigInt(Math.floor(parseFloat(fromAmount) * 1e18));
    
    // PoolKey structure
    const poolKey = {
      currency0: CONTRACT_ADDRESSES.TOKEN0 as `0x${string}`,
      currency1: CONTRACT_ADDRESSES.TOKEN1 as `0x${string}`,
      fee: 3000,
      tickSpacing: 60,
      hooks: CONTRACT_ADDRESSES.HOOK as `0x${string}`,
    };

    // SwapParams: exact input uses negative amountSpecified in V4
    const swapParams = {
      zeroForOne: swapDirection === '0to1',
      amountSpecified: -amountToSwap,
      sqrtPriceLimitX96: swapDirection === '0to1' ? 4295128739n : 1461446703485210103287273052203988822378723970342n,
    };

    // TestSettings: don't take claims, don't burn
    const testSettings = {
      takeClaims: false,
      settleUsingBurn: false,
    };

    // Encode swapper address into hookData bytes
    const hookData = encodeAbiParameters(
      parseAbiParameters('address'),
      [address]
    );

    // Call the SWAP ROUTER (which handles unlock → callback → swap → settle)
    // gas override ensures wallet doesn't grey out Confirm when estimation fails
    writeSwap({
      address: CONTRACT_ADDRESSES.SWAP_ROUTER as `0x${string}`,
      abi: SWAP_ROUTER_ABI,
      functionName: 'swap',
      args: [poolKey, swapParams, testSettings, hookData],
      gas: 500000n,
    });
  };

  const isWrongNetwork = isConnected && chainId !== 1952 && chainId !== 195;

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <Navbar />

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Swap Panel Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold font-mono">Swap Assets</h2>
              {isConnected && (
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono border ${
                  isVerified 
                    ? 'bg-accent/10 border-accent/20 text-accent' 
                    : 'bg-red-500/10 border-red-500/20 text-red-500'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isVerified ? 'bg-accent' : 'bg-red-500'}`} />
                  {isVerified ? 'Verified Human' : 'Unverified Wallet'}
                </div>
              )}
            </div>

            {/* Input Token Panel */}
            <div className="rounded-xl bg-neutral-900 p-4 mb-2 border border-neutral-850">
              <div className="flex justify-between text-xs text-neutral-400 mb-2">
                <span>From</span>
                <span>
                  Balance:{' '}
                  {swapDirection === '0to1'
                    ? token0Balance !== undefined
                      ? (Number(token0Balance) / 1e18).toFixed(2)
                      : '0.00'
                    : token1Balance !== undefined
                    ? (Number(token1Balance) / 1e18).toFixed(2)
                    : '0.00'}{' '}
                  {swapDirection === '0to1' ? 'HUSD' : 'HSK'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <input
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="bg-transparent text-2xl font-semibold outline-none w-2/3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="font-mono text-base font-bold bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800">
                  {swapDirection === '0to1' ? 'HUSD' : 'HSK'}
                </span>
              </div>
            </div>

            {/* Direction Toggle Arrow */}
            <div className="flex justify-center -my-3 relative z-10">
              <button
                onClick={() => setSwapDirection((prev) => (prev === '0to1' ? '1to0' : '0to1'))}
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>

            {/* Output Token Panel */}
            <div className="rounded-xl bg-neutral-900 p-4 mt-2 mb-6 border border-neutral-850">
              <div className="flex justify-between text-xs text-neutral-400 mb-2">
                <span>To (Estimated)</span>
                <span>
                  Balance:{' '}
                  {swapDirection === '0to1'
                    ? token1Balance !== undefined
                      ? (Number(token1Balance) / 1e18).toFixed(2)
                      : '0.00'
                    : token0Balance !== undefined
                    ? (Number(token0Balance) / 1e18).toFixed(2)
                    : '0.00'}{' '}
                  {swapDirection === '0to1' ? 'HSK' : 'HUSD'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="0.0"
                  value={toAmount}
                  readOnly
                  className="bg-transparent text-2xl font-semibold outline-none w-2/3 text-neutral-300"
                />
                <span className="font-mono text-base font-bold bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800">
                  {swapDirection === '0to1' ? 'HSK' : 'HUSD'}
                </span>
              </div>
            </div>

            {/* Price Info details */}
            <div className="text-xs text-neutral-500 font-mono mb-6 space-y-1.5 px-1">
              <div className="flex justify-between">
                <span>Pool Fee</span>
                <span>0.30%</span>
              </div>
              <div className="flex justify-between">
                <span>Router</span>
                <span className="text-neutral-400">{CONTRACT_ADDRESSES.SWAP_ROUTER.slice(0, 8)}...{CONTRACT_ADDRESSES.SWAP_ROUTER.slice(-6)}</span>
              </div>
            </div>

            {/* Test Token Faucet */}
            {isConnected && !isWrongNetwork && (
              <div className="mb-4">
                <button
                  onClick={handleMintTestTokens}
                  disabled={isMintPending || isMintLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 py-2.5 text-xs font-mono text-neutral-300 hover:bg-neutral-900 hover:text-white transition-all disabled:opacity-50"
                >
                  {isMintPending || isMintLoading ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Minting Test Tokens...</>
                  ) : (
                    <><Coins className="h-3.5 w-3.5 text-accent" /> Faucet: Mint 10,000 HUSD + HSK</>
                  )}
                </button>
              </div>
            )}

            {/* Error notifications */}
            {(approveError || swapError || mintError) && (
              <div className="mb-4 rounded-lg bg-red-950/20 border border-red-500/20 p-3 text-xs text-red-400">
                Error: {(approveError || swapError || mintError)?.message.slice(0, 150)}...
              </div>
            )}

            {/* Swap success notification */}
            {isSwapSuccess && (
              <div className="mb-4 rounded-lg bg-accent/10 border border-accent/20 p-3 text-xs text-accent flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Swap executed successfully on-chain!
              </div>
            )}

            {/* Verification-based State Buttons */}
            {!isConnected ? (
              <button
                disabled
                className="w-full rounded-lg bg-neutral-900 py-3.5 text-sm font-semibold text-neutral-500 border border-neutral-800"
              >
                Connect Wallet to Swap
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
            ) : !isVerified ? (
              /* State 1: Unverified Wallet Blocked */
              <div className="space-y-3">
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex items-start gap-2 text-xs text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Swap Blocked by Hook</span>
                    Handshake Required: Sniper Bot Activity Suspected. Get human verification NFT to trade.
                  </div>
                </div>
                <button
                  disabled
                  className="w-full rounded-lg bg-neutral-900 py-3.5 text-sm font-semibold text-neutral-600 border border-neutral-850 cursor-not-allowed uppercase font-mono tracking-wider"
                >
                  Swap Disabled
                </button>
              </div>
            ) : (
              /* State 2: Verified Wallet Allowed */
              <button
                disabled={!fromAmount || isApprovePending || isApproveLoading || isSwapPending || isSwapLoading}
                onClick={handleApproveAndSwap}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent py-3.5 text-sm font-semibold text-black transition-all hover:bg-accent-hover disabled:opacity-50 disabled:pointer-events-none active:scale-98 uppercase font-mono tracking-wider"
              >
                {isApprovePending || isApproveLoading || isSwapPending || isSwapLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isApprovePending ? 'Confirming Approval...' : isApproveLoading ? 'Approving Tokens...' : isSwapPending ? 'Confirming Swap...' : 'Executing Swap...'}
                  </>
                ) : (
                  'Execute Swap'
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
