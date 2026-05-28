'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ShieldCheck, Layers, RefreshCw, PlusCircle, Wallet } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const links = [
    { href: '/', label: 'Threat Dashboard', icon: ShieldCheck },
    { href: '/verify', label: 'Get Verified', icon: Layers },
    { href: '/swap', label: 'Swap Portal', icon: RefreshCw },
    { href: '/deploy', label: 'Pool Deployer', icon: PlusCircle },
  ];

  const handleConnect = () => {
    const injectedConnector = connectors.find((c) => c.id === 'injected');
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    } else if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-black/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-mono text-xl font-black tracking-widest text-white">
                HANDSHAKE<span className="text-accent">.</span>
              </span>
              <span className="hidden sm:inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent border border-accent/20">
                Uniswap V4 Hook
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-neutral-900 text-accent font-semibold'
                        : 'text-neutral-400 hover:bg-neutral-950 hover:text-white'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-accent' : 'text-neutral-400'}`} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Connect Button */}
          <div className="flex items-center gap-4">
            {isConnected && address ? (
              <button
                onClick={() => disconnect()}
                className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs font-mono text-neutral-300 hover:bg-neutral-900 hover:text-white transition-all active:scale-98"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {address.slice(0, 6)}...{address.slice(-4)}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-mono font-bold text-black hover:bg-accent-hover transition-all active:scale-98"
              >
                <Wallet className="h-3.5 w-3.5" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
