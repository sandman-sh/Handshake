# Handshake Frontend

Next.js 16 web application for the Handshake Protocol — a Sybil-resistant fair launch exchange portal built on Uniswap V4 Hooks.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with live on-chain metrics (verified humans, pool TVL, deployed contracts) |
| `/verify` | Mint or view your Handshake human verification NFT credential |
| `/swap` | Execute token swaps through the protected swap router + test token faucet |
| `/deploy` | Initialize Uniswap V4 pools with Handshake Hook protection + seed liquidity |

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Web3**: Wagmi v2, Viem v2, TanStack React Query v5
- **Styling**: Tailwind CSS v4, Framer Motion
- **Wallet**: Injected connector (OKX Wallet, MetaMask)
- **Network**: X Layer Testnet — `https://testrpc.xlayer.tech/terigon`

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3001](http://localhost:3001)

## Configuration

All contract addresses and ABIs are defined in [`src/config/contracts.ts`](src/config/contracts.ts).  
Chain and RPC configuration is in [`src/config/wagmi.ts`](src/config/wagmi.ts).

## Design System

| Token | Value |
|-------|-------|
| `--background` | `#000000` |
| `--card` | `#0A0A0A` |
| `--border` | `#262626` |
| `--accent` | `#CCFF00` |
| Font Sans | `Inter` |
| Font Mono | `JetBrains Mono` |

All metrics displayed are live on-chain data — zero simulated telemetry.
