# TreasuryPilot Frontend

**Live: [treasury-pilot-frontend.vercel.app](https://treasury-pilot-frontend.vercel.app)**

Next.js frontend for TreasuryPilot — AI-powered grants evaluation and tracking on GenLayer.

## Running locally

1. Install dependencies: `bun install` or `npm install`
2. Create `.env`:

```
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_CHAIN_NAME=GenLayer Studio
NEXT_PUBLIC_GENLAYER_SYMBOL=GEN
NEXT_PUBLIC_CONTRACT_ADDRESS=0xa477A17e16715e2ec81cf620702f3E0574d15af3
```

3. `bun dev` or `npm run dev` → [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **genlayer-js** - GenLayer blockchain SDK
- **TanStack Query** - Data fetching and caching with polling
- **MetaMask** - Wallet connection via `window.ethereum`
