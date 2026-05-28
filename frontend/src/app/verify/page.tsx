'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { CONTRACT_ADDRESSES, HANDSHAKE_NFT_ABI } from '@/config/contracts';
import { config } from '@/config/wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';

export default function VerifyHuman() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [nftMetadata, setNftMetadata] = useState<{ name: string; description: string; image: string } | null>(null);

  // 1. Check if user already minted
  const { data: hasMinted, refetch: refetchHasMinted } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
    abi: HANDSHAKE_NFT_ABI,
    functionName: 'hasMinted',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // 2. Fetch balance to see if they hold it
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
    abi: HANDSHAKE_NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // 3. Write contract: Mint NFT
  const { data: hash, error: writeError, isPending: isWritePending, writeContract } = useWriteContract();

  // 4. Wait for mint transaction
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Refetch status when tx succeeds
  useEffect(() => {
    if (isTxSuccess) {
      refetchHasMinted();
      refetchBalance();
    }
  }, [isTxSuccess, refetchHasMinted, refetchBalance]);

  // 5. Fetch total token count to find user's token
  const { data: nextTokenId } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
    abi: HANDSHAKE_NFT_ABI,
    functionName: 'nextTokenId',
    query: { enabled: !!balance && balance > 0n },
  });

  // 6. Find user's token ID by scanning ownerOf backwards (efficient since 1 mint per address)
  const [userTokenId, setUserTokenId] = useState<bigint | null>(null);

  useEffect(() => {
    if (nextTokenId === undefined || !address || !balance || balance === 0n) return;

    const findToken = async () => {
      // Scan from most recent token backwards to find the user's token
      const total = Number(nextTokenId);
      for (let i = total - 1; i >= 0; i--) {
        try {
          const { data } = await import('wagmi/actions').then(m => 
            m.readContract(config, {
              address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
              abi: HANDSHAKE_NFT_ABI,
              functionName: 'ownerOf',
              args: [BigInt(i)],
            }).then(data => ({ data }))
          );
          if ((data as string).toLowerCase() === address.toLowerCase()) {
            setUserTokenId(BigInt(i));
            return;
          }
        } catch {
          continue;
        }
      }
    };
    findToken();
  }, [nextTokenId, address, balance]);

  // 7. Fetch on-chain SVG representation once we know the user's token ID
  const { data: tokenUriData } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
    abi: HANDSHAKE_NFT_ABI,
    functionName: 'tokenURI',
    args: userTokenId !== null ? [userTokenId] : undefined,
    query: { enabled: userTokenId !== null },
  });

  useEffect(() => {
    if (tokenUriData) {
      try {
        const base64Json = (tokenUriData as string).split(',')[1];
        const jsonStr = atob(base64Json);
        const parsed = JSON.parse(jsonStr);
        setNftMetadata(parsed);
      } catch (err) {
        console.error('Failed to parse on-chain tokenURI:', err);
      }
    }
  }, [tokenUriData]);

  const handleMint = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
      abi: HANDSHAKE_NFT_ABI,
      functionName: 'mint',
    });
  };

  const isWrongNetwork = isConnected && chainId !== 1952 && chainId !== 195;

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <Navbar />

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {!isConnected ? (
              /* State 0: Wallet Disconnected */
              <motion.div
                key="disconnected"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 text-center"
              >
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800">
                  <ShieldCheck className="h-7 w-7 text-neutral-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
                <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                  Verify your identity on-chain to trade in protected liquidity pools. Connect your wallet via X Layer Testnet.
                </p>
              </motion.div>
            ) : isWrongNetwork ? (
              /* State 0.5: Wrong Network */
              <motion.div
                key="wrong-network"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 text-center"
              >
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-7 w-7 text-red-500" />
                </div>
                <h2 className="text-xl font-bold mb-2 text-red-500">Switch Network</h2>
                <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                  Handshake Protocol is deployed exclusively on the <span className="text-white font-semibold">X Layer Testnet</span>. Your wallet is currently on chain ID <span className="font-mono text-white">{(chainId as any) || 'unknown'}</span>. Please change your wallet network to continue.
                </p>
                <button
                  onClick={() => switchChain?.({ chainId: 1952 })}
                  className="w-full bg-red-500 hover:bg-red-600 text-black py-3 rounded-xl font-bold transition-all text-sm uppercase tracking-wider font-mono hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer"
                >
                  Switch to X Layer Testnet
                </button>
              </motion.div>
            ) : hasMinted ? (
              /* State 2: Verified Human (Show dynamic SVG) */
              <motion.div
                key="verified"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 text-center flex flex-col items-center"
              >
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  <span className="text-sm font-semibold text-accent font-mono tracking-wider uppercase">Human Verified</span>
                </div>

                {/* SVG Card */}
                {nftMetadata?.image ? (
                  <div className="w-64 h-64 border border-neutral-850 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(204,255,0,0.05)] mb-6">
                    <img src={nftMetadata.image} alt="Handshake NFT Card" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-64 h-64 border border-neutral-800 rounded-xl flex items-center justify-center bg-neutral-900/50 mb-6">
                    <Loader2 className="h-8 w-8 animate-spin text-neutral-600" />
                  </div>
                )}

                <h3 className="text-lg font-bold mb-1 font-mono">{nftMetadata?.name || 'Human Credential'}</h3>
                <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
                  Your address {address?.slice(0, 6)}...{address?.slice(-4)} is verified human. You can trade in protected pools.
                </p>
              </motion.div>
            ) : (
              /* State 1: Connected but unverified */
              <motion.div
                key="unverified"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8"
              >
                <h2 className="text-xl font-bold mb-4 font-mono">Verify Your Wallet</h2>
                <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                  Mint your Handshake Human Credential. This ERC-721 token proves you are not a sniper bot, unlocking trade access on protected pools.
                </p>

                {writeError && (
                  <div className="mb-4 rounded-lg bg-red-950/30 border border-red-500/20 p-3 text-xs text-red-400">
                    Error: {writeError.message.slice(0, 100)}...
                  </div>
                )}

                <button
                  disabled={isWritePending || isTxLoading}
                  onClick={handleMint}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent py-3.5 text-sm font-semibold text-black transition-all hover:bg-accent-hover disabled:opacity-50 disabled:pointer-events-none active:scale-98"
                >
                  {isWritePending || isTxLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isWritePending ? 'Confirming Wallet...' : 'Minting Credential...'}
                    </>
                  ) : (
                    'Mint Handshake Credential'
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
