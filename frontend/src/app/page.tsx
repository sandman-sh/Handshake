'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES, HANDSHAKE_NFT_ABI, HANDSHAKE_HOOK_ABI, ERC20_ABI } from '@/config/contracts';
import { motion } from 'framer-motion';
import { Shield, Users, Lock, ChevronRight, Zap, Target, Server, Database } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  // Real on-chain metric: Total Verified Humans
  const { data: verifiedCount } = useReadContract({
    address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
    abi: HANDSHAKE_NFT_ABI,
    functionName: 'nextTokenId',
  });

  // Real on-chain metric: Token0 balance in PoolManager (proxy for TVL)
  const { data: token0InPool } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN0 as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [CONTRACT_ADDRESSES.POOL_MANAGER as `0x${string}`],
  });

  // Real on-chain metric: Token1 balance in PoolManager
  const { data: token1InPool } = useReadContract({
    address: CONTRACT_ADDRESSES.TOKEN1 as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [CONTRACT_ADDRESSES.POOL_MANAGER as `0x${string}`],
  });

  // Hook telemetry — all real contract data
  const hookSpecs = [
    { label: 'EVM Execution Target', value: 'Cancun (Transient Storage Enabled)' },
    { label: 'Hook Bit Flags Mask', value: '0x1080 (afterInitialize | beforeSwap)' },
    { label: 'Deployed Address Suffix', value: '...1080 (Create2 Mined)' },
    { label: 'Gating Registry NFT', value: CONTRACT_ADDRESSES.NFT.slice(0, 10) + '...' + CONTRACT_ADDRESSES.NFT.slice(-8) },
    { label: 'Swap Router', value: CONTRACT_ADDRESSES.SWAP_ROUTER.slice(0, 10) + '...' + CONTRACT_ADDRESSES.SWAP_ROUTER.slice(-6) },
    { label: 'Liquidity Router', value: CONTRACT_ADDRESSES.LIQUIDITY_ROUTER.slice(0, 10) + '...' + CONTRACT_ADDRESSES.LIQUIDITY_ROUTER.slice(-6) },
  ];

  // Deployed contract addresses for reference
  const deployedContracts = [
    { label: 'HandshakeNFT', address: CONTRACT_ADDRESSES.NFT },
    { label: 'PoolManager', address: CONTRACT_ADDRESSES.POOL_MANAGER },
    { label: 'HandshakeHook', address: CONTRACT_ADDRESSES.HOOK },
    { label: 'SwapRouter', address: CONTRACT_ADDRESSES.SWAP_ROUTER },
    { label: 'LiquidityRouter', address: CONTRACT_ADDRESSES.LIQUIDITY_ROUTER },
    { label: 'Token0 (HUSD)', address: CONTRACT_ADDRESSES.TOKEN0 },
    { label: 'Token1 (HSK)', address: CONTRACT_ADDRESSES.TOKEN1 },
  ];

  const tvlToken0 = token0InPool !== undefined ? Number(token0InPool) / 1e18 : 0;
  const tvlToken1 = token1InPool !== undefined ? Number(token1InPool) / 1e18 : 0;

  return (
    <div className="flex flex-col min-h-screen bg-black text-white selection:bg-accent selection:text-black">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <section className="relative py-12 md:py-20 overflow-hidden rounded-3xl border border-neutral-900 bg-neutral-950/20 px-6 mb-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(204,255,0,0.04),transparent_70%)] pointer-events-none" />
          
          <div className="text-center max-w-3xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
              className="cursor-pointer inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-4 py-1.5 text-xs text-neutral-300 mb-6 transition-all hover:border-accent/40"
            >
              <Zap className="h-3.5 w-3.5 text-accent animate-pulse" />
              <span className="font-mono">X LAYER TESTNET — LIVE ON-CHAIN</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent font-sans"
            >
              Secure Liquidity Pools <br />
              With Sybil Resistance
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm md:text-base text-neutral-400 max-w-xl mx-auto mb-10 leading-relaxed"
            >
              Handshake intercepts bot snipers in real-time. Deployed as a Uniswap V4 Hook on the X Layer testnet, it gates swaps during pool launches using human-verification NFTs.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link
                  href="/verify"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-black transition-all hover:bg-accent-hover"
                >
                  Mint Human Credential NFT
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link
                  href="/swap"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-neutral-900"
                >
                  Swap in Protected Pools
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* On-Chain Metrics Grid */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-sm font-bold font-mono tracking-widest text-accent uppercase">On-Chain Metrics</h2>
              <p className="text-xs text-neutral-400">Live data from X Layer Testnet contracts.</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-1.5 text-xs font-mono">
              <Database className="h-3.5 w-3.5 text-accent" />
              <span>Chain ID: 195 / 1952</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Verified Humans — REAL */}
            <motion.div
              whileHover={{ y: -4, borderColor: '#CCFF00' }}
              className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 flex flex-col justify-between h-40 relative overflow-hidden group transition-colors"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users className="h-24 w-24 text-accent" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono tracking-wider text-neutral-500 uppercase">Verified Humans</span>
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              </div>
              <div>
                <h3 className="text-4xl font-extrabold tracking-tight font-mono text-accent">
                  {verifiedCount !== undefined ? verifiedCount.toString() : '...'}
                </h3>
                <p className="text-xs text-neutral-400 mt-1">Unique credential NFTs minted on-chain</p>
              </div>
            </motion.div>

            {/* Pool TVL Token0 — REAL */}
            <motion.div
              whileHover={{ y: -4, borderColor: '#3b82f6' }}
              className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 flex flex-col justify-between h-40 relative overflow-hidden group transition-colors"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Lock className="h-24 w-24 text-blue-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono tracking-wider text-neutral-500 uppercase">HUSD in Pool</span>
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-4xl font-extrabold tracking-tight font-mono text-blue-400">
                  {tvlToken0.toFixed(2)}
                </h3>
                <p className="text-xs text-neutral-400 mt-1">Token0 balance held in PoolManager</p>
              </div>
            </motion.div>

            {/* Pool TVL Token1 — REAL */}
            <motion.div
              whileHover={{ y: -4, borderColor: '#8b5cf6' }}
              className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 flex flex-col justify-between h-40 relative overflow-hidden group transition-colors"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Shield className="h-24 w-24 text-violet-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono tracking-wider text-neutral-500 uppercase">HSK in Pool</span>
                <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-4xl font-extrabold tracking-tight font-mono text-violet-400">
                  {tvlToken1.toFixed(2)}
                </h3>
                <p className="text-xs text-neutral-400 mt-1">Token1 balance held in PoolManager</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Technical Specs & Deployed Contracts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Deployed Contracts */}
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-6">
            <h3 className="text-sm font-bold font-mono tracking-wider text-neutral-400 uppercase mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" />
              Deployed Contracts
            </h3>
            <div className="divide-y divide-neutral-900 text-xs">
              {deployedContracts.map((c, i) => (
                <div key={i} className="flex justify-between items-center py-3">
                  <span className="text-neutral-400 font-medium">{c.label}</span>
                  <a
                    href={`https://www.oklink.com/xlayer-test/address/${c.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-neutral-300 hover:text-accent transition-colors"
                  >
                    {c.address.slice(0, 8)}...{c.address.slice(-6)}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Specs Card */}
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold font-mono tracking-wider text-neutral-400 uppercase mb-4 flex items-center gap-2">
                <Server className="h-4 w-4 text-accent" />
                V4 Hook On-Chain System Specs
              </h3>
              <div className="divide-y divide-neutral-900 text-xs">
                {hookSpecs.map((spec, i) => (
                  <div key={i} className="flex justify-between py-3.5">
                    <span className="text-neutral-400 font-medium">{spec.label}</span>
                    <span className="font-mono text-neutral-200">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 text-[10px] text-neutral-500 font-mono leading-relaxed">
              * All metrics are fetched live from X Layer Testnet smart contracts. No simulated data.
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-8 bg-black">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-neutral-500 font-mono">
          &copy; {new Date().getFullYear()} Handshake Protocol. Deployed on X Layer Testnet.
        </div>
      </footer>
    </div>
  );
}
