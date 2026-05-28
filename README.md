<p align="center">
  <img src="https://img.shields.io/badge/Uniswap-V4_Hook-ff007a?style=for-the-badge&logo=uniswap&logoColor=white" />
  <img src="https://img.shields.io/badge/X_Layer-Testnet-000000?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Solidity-^0.8.24-363636?style=for-the-badge&logo=solidity&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

# Handshake Protocol

**Sybil-Resistant Fair Launch Infrastructure — Powered by Uniswap V4 Hooks on X Layer**

Handshake is an on-chain anti-sniper system that protects new token launches from bot exploitation. It deploys as a **Uniswap V4 `beforeSwap` hook** that gates swap access during a configurable protection window, allowing only wallets holding a human-verification NFT credential to trade.

> _"A handshake before every trade."_

---

## The Problem

When a new token launches on a DEX, sniper bots front-run human traders within the first few blocks — extracting value and dumping on retail. Existing solutions rely on centralized allowlists or off-chain oracles, neither of which are composable or trustless.

## The Solution

Handshake solves this entirely on-chain:

1. **Mint** a soulbound NFT credential that proves you're a unique human wallet
2. **Deploy** a Uniswap V4 pool with the Handshake Hook attached
3. **During the protection window**, only NFT holders can swap — bots get reverted with `BotBlocked()`
4. **After the window expires**, the pool becomes fully permissionless

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Human Wallet │────▶│  Handshake   │────▶│  Uniswap V4  │
│  + NFT ✓      │     │  Hook Gate   │     │  PoolManager  │
└──────────────┘     └──────────────┘     └──────────────┘
        │                    │                     │
        │              beforeSwap()          swap() executes
        │              checks NFT            if verified ✓
        │                    │
        │              ┌─────▼─────┐
        │              │ BotBlocked │ ← unverified wallet
        │              └───────────┘
```

---

## Architecture

```
handshake/
├── contracts/                          # Solidity Smart Contracts (Hardhat)
│   ├── contracts/
│   │   ├── HandshakeHook.sol           # Uniswap V4 beforeSwap + afterInitialize hook
│   │   ├── HandshakeNFT.sol            # On-chain SVG human verification credential
│   │   ├── HandshakeSwapRouter.sol     # Unlock-callback swap router for EOA wallets
│   │   ├── HandshakeLiquidityRouter.sol# Unlock-callback liquidity router for EOA wallets
│   │   ├── Create2Deployer.sol         # Deterministic CREATE2 deployer
│   │   ├── MockERC20.sol               # Test tokens (HUSD / HSK) with public mint
│   │   └── PoolManagerWrapper.sol      # Compilation trigger for v4-core PoolManager
│   ├── scripts/
│   │   ├── deploy.js                   # Full deployment with CREATE2 salt mining
│   │   ├── deploy-routers.js           # Router contract deployment
│   │   └── setup-pool.js              # Pool initialization + liquidity seeding
│   └── test/
│       └── HandshakeHook.test.js       # 5 integration tests covering all swap states
│
├── frontend/                           # Next.js 16 Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                # Dashboard — live on-chain metrics
│   │   │   ├── verify/page.tsx         # Mint / view human credential NFT
│   │   │   ├── swap/page.tsx           # Protected swap interface + token faucet
│   │   │   └── deploy/page.tsx         # Pool deployer + liquidity seeding
│   │   ├── components/
│   │   │   ├── Navbar.tsx              # Navigation with wallet connect
│   │   │   └── Providers.tsx           # Wagmi + QueryClient providers
│   │   └── config/
│   │       ├── wagmi.ts                # X Layer Testnet chain config + RPC
│   │       └── contracts.ts            # Addresses, ABIs for all deployed contracts
│   └── package.json
│
└── README.md
```

---

## Deployed Contracts — X Layer Testnet

| Contract | Address | Purpose |
|----------|---------|---------|
| **HandshakeNFT** | `0xE6676fB1d98333839375D872A96643339c7AF87D` | Human verification credential (on-chain SVG) |
| **PoolManager** | `0x0415085583bDDe9924C3E907102A0b3C71cC41fE` | Uniswap V4 singleton pool manager |
| **HandshakeHook** | `0xEb980De49497e528328A0bf4d05AA5e99c2CD080` | `beforeSwap` + `afterInitialize` hook |
| **SwapRouter** | `0x96f628465C7FA2c3E5a0E98fcA1EEBe1311A45ae` | Unlock-callback swap router |
| **LiquidityRouter** | `0xD29a80Bd5533BaBeb8Add00A4331C32Bb928CB18` | Unlock-callback liquidity router |
| **Token0 (HUSD)** | `0xaF55284883BFe888A26d0811097b85ac18f7A389` | Mock stablecoin |
| **Token1 (HSK)** | `0xC2862B57243264e3160e2bB6F5687f0D4460144D` | Mock governance token |

**Network**: X Layer Testnet (Chain ID `195` / `1952`)  
**RPC**: `https://testrpc.xlayer.tech/terigon`  
**Explorer**: [OKLink X Layer Testnet](https://www.oklink.com/xlayer-test)

---

## Smart Contract Design

### HandshakeHook — Uniswap V4 Hook

The core innovation. Implements two V4 hook callbacks:

- **`afterInitialize`** — Records the pool creator and launch block when a new pool is created
- **`beforeSwap`** — Intercepts every swap and enforces the gating logic:

```
if (pool is protected AND block.number < endBlock) {
    if (swapper == creator) → allow (creator exemption)
    if (NFT.balanceOf(swapper) > 0) → allow (verified human)
    else → revert BotBlocked()
}
```

**Hook Permissions**: `afterInitialize | beforeSwap` → Address suffix `0x1080` (mined via CREATE2)

### HandshakeNFT — On-Chain SVG Credential

- One mint per wallet (soulbound-style enforcement)
- Token metadata is generated entirely on-chain as Base64-encoded SVG
- No IPFS, no external hosting — fully self-contained

### Router Contracts — V4 Unlock Pattern

Uniswap V4's PoolManager uses a **lock/unlock callback pattern**. EOA wallets cannot call `swap()` or `modifyLiquidity()` directly. The router contracts handle this:

```
User EOA → Router.swap() → PoolManager.unlock() → Router.unlockCallback() → PoolManager.swap() → settle tokens
```

---

## Getting Started

### Prerequisites

- Node.js v20+
- A wallet with X Layer Testnet OKB ([faucet](https://www.okx.com/xlayer/faucet))

### 1. Clone & Install

```bash
git clone https://github.com/sandman-sh/Handshake.git
cd Handshake

# Install contract dependencies
cd contracts
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

Create `contracts/.env`:
```env
PRIVATE_KEY=your_private_key_here
```

### 3. Deploy Contracts

```bash
cd contracts

# Deploy all contracts (includes CREATE2 salt mining for hook address)
npx hardhat run scripts/deploy.js --network xlayerTestnet

# Deploy router contracts
npx hardhat run scripts/deploy-routers.js --network xlayerTestnet

# Initialize pool + seed liquidity
npx hardhat run scripts/setup-pool.js --network xlayerTestnet
```

### 4. Update Frontend Config

Copy the deployed addresses into `frontend/src/config/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  NFT: '0x...',
  POOL_MANAGER: '0x...',
  HOOK: '0x...',
  TOKEN0: '0x...',
  TOKEN1: '0x...',
  SWAP_ROUTER: '0x...',
  LIQUIDITY_ROUTER: '0x...',
};
```

### 5. Run Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

---

## Testing

The contract test suite covers all critical swap states:

```bash
cd contracts
npx hardhat test
```

```
  HandshakeHook Integration Tests
    ✓ should initialize pool and check protection stats
    ✓ should fail swap from unverified user during protection window
    ✓ should allow swap from creator even if they are unverified
    ✓ should allow swap from user after minting Handshake NFT
    ✓ should allow swap from unverified user after protection window ends

  5 passing
```

| Test | Validates |
|------|-----------|
| Pool Init | Pool creation triggers `afterInitialize`, sets protection window |
| Bot Gating | Unverified wallet reverts with `BotBlocked()` during protection |
| Creator Exemption | Pool creator can swap without NFT credential |
| Human Swap | NFT holder can swap during protection window |
| Auto-Unlock | After protection expires, all wallets can swap freely |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Smart Contracts** | Solidity ^0.8.24, Hardhat, OpenZeppelin, Uniswap V4 Core |
| **Hook Framework** | `@uniswap/v4-core v1.0.2` — `BaseHook`, `PoolManager`, `BalanceDelta` |
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| **Web3** | Wagmi v2, Viem v2, TanStack React Query v5 |
| **Styling** | Tailwind CSS v4, Framer Motion |
| **Network** | X Layer Testnet (EVM-compatible, Cancun fork) |
| **Deployment** | Vercel (frontend), Hardhat (contracts) |

---

## User Flow

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   1. VERIFY         2. DEPLOY          3. SWAP          │
│   ┌───────────┐    ┌───────────┐    ┌───────────┐      │
│   │ Mint NFT  │───▶│ Init Pool │───▶│ Execute   │      │
│   │ credential│    │ + Set     │    │ protected │      │
│   │           │    │ protection│    │ swap      │      │
│   └───────────┘    │ + Seed    │    └───────────┘      │
│                    │ liquidity │                        │
│                    └───────────┘                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**`/verify`** — Connect wallet → Mint one-time Handshake NFT → View on-chain SVG credential  
**`/deploy`** — Set token pair → Choose fee tier → Set protection duration → Initialize pool → Seed liquidity  
**`/swap`** — Mint test tokens via faucet → Enter amount → Approve → Execute swap through router  

---

## Design

The frontend follows a strict dark-mode design system:

| Element | Value |
|---------|-------|
| Background | `#000000` (Pure Black) |
| Card Surfaces | `#0A0A0A` (Elevated Dark) |
| Borders | `#262626` (Neutral 800) |
| Accent Color | `#CCFF00` (Neon Lime) |
| Typography | `Inter` (Sans), `JetBrains Mono` (Mono) |

All dashboard metrics are **live on-chain data** — no simulated or mock telemetry.

---

## License

MIT

---

<p align="center">
  <sub>Built for the X Layer ecosystem. Powered by Uniswap V4 Hooks.</sub>
</p>
