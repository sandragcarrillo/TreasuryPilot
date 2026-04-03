# TreasuryPilot Frontend

**Live: [treasury-pilot-frontend.vercel.app](https://treasury-pilot-frontend.vercel.app)**

Next.js frontend for TreasuryPilot — AI-powered grants evaluation and tracking on GenLayer.

## Running locally

1. Install dependencies: `bun install` or `npm install`
2. Create `.env` with your contract address and RPC URL
3. `bun dev` or `npm run dev` → [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Next.js 15** — React framework with App Router
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **genlayer-js** — GenLayer blockchain SDK
- **TanStack Query** — Data fetching and caching with polling
- **MetaMask** — Wallet connection via `window.ethereum`

## Pages

| Route | Description |
|-------|-------------|
| `/` | Organization registry — browse, register new orgs |
| `/dashboard` | Personal dashboard — your orgs and submitted proposals |
| `/org/[id]` | Organization detail — constitution, programs, budget, proposals, settings |
| `/proposal/[id]` | Proposal detail — AI verdict, status, veto, progress reports |
