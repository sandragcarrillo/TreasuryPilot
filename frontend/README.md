# TreasuryPilot Frontend

Next.js frontend for TreasuryPilot — AI-powered DAO treasury governance on GenLayer's Bradbury Testnet.

## Setup

1. Install dependencies:

```bash
bun install
# or
npm install
```

2. Create `.env` file and configure environment variables:

```bash
NEXT_PUBLIC_GENLAYER_RPC_URL=https://rpc-bradbury.genlayer.com
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_CHAIN_NAME=Genlayer Bradbury Testnet
NEXT_PUBLIC_GENLAYER_SYMBOL=GEN
NEXT_PUBLIC_CONTRACT_ADDRESS=0x8E09e2d21ba7bfb9A3c15E3AD9f5Ab48Ea6050Dc
```

## Development

```bash
bun dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

```bash
bun run build && bun start
# or
npm run build && npm start
```

## Deploy to Vercel

1. Import the repo in Vercel and set the **Root Directory** to `frontend/`
2. Add the environment variables above in the Vercel dashboard
3. Deploy — no other configuration needed

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **genlayer-js** - GenLayer blockchain SDK
- **TanStack Query** - Data fetching and caching with polling
- **MetaMask** - Wallet connection via `window.ethereum`

## Wallet

Connects via MetaMask. Requires the GenLayer Bradbury Testnet added to MetaMask (chain ID 61999, RPC `https://rpc-bradbury.genlayer.com`). The app will prompt MetaMask to add the network on first connect.

Get testnet GEN tokens from the GenLayer faucet.

## Features

- **DAO Registry** — Register DAOs with a name and constitution defining councils, budgets, and allocation rules
- **Proposal Submission** — Submit funding proposals targeting specific councils with amount, description, and rationale
- **AI Evaluation** — Trigger GenLayer AI validators to evaluate proposals against the DAO constitution and reach consensus
- **Live Status** — See transaction hash and validator deliberation status immediately after submitting (consensus takes 5–15 min)
- **Block Explorer** — Direct links to [explorer-bradbury.genlayer.com](https://explorer-bradbury.genlayer.com) for every transaction
