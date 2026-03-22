# TreasuryPilot
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)

An AI-powered DAO treasury management platform built on [GenLayer](https://genlayer.com). TreasuryPilot lets any DAO register its constitution on-chain and automatically evaluate funding proposals against it using an LLM — with validator consensus ensuring the evaluation is fair and reproducible.

## How it works

1. A DAO registers itself with a name and constitution (mission, councils, budgets, rules)
2. Anyone can submit a treasury proposal targeting a specific council
3. The contract uses GenLayer's AI capabilities to evaluate the proposal against the constitution
4. Multiple validators independently run the same evaluation and must reach consensus before the result is stored
5. The proposal receives a score, risk level, ROI assessment, and a final recommendation (approve / reject / modify)

Each proposal is evaluated on:
- **Alignment score** (0–10): how well it fits the DAO mission and target council mandate
- **Risk level**: low / medium / high, considering budget fit and operational risk
- **ROI assessment**: positive / neutral / negative
- **Recommendation**: approve / reject / modify
- **Reasoning**: brief explanation covering mission alignment, council fit, and risk factors

## Architecture

```
contracts/          # GenLayer Intelligent Contract (Python)
frontend/           # Next.js 15 app (TypeScript, TanStack Query, Radix UI)
deploy/             # TypeScript deployment script
test/               # Integration tests (gltest)
```

## Requirements

- [GenLayer CLI](https://github.com/genlayerlabs/genlayer-cli): `npm install -g genlayer`
- [GenLayer Studio](https://studio.genlayer.com) (hosted) or running locally
- Node.js + npm (or bun)

## Setup & deployment

### 1. Switch to the target network

```bash
genlayer network set testnet-bradbury   # or studionet / localnet
```

### 2. Set up your account

```bash
genlayer account import --name myaccount --private-key YOUR_PRIVATE_KEY
genlayer account unlock
```

### 3. Deploy the contract

```bash
npm run deploy
```

Copy the printed contract address.

### 4. Configure the frontend

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...     # address from step 3
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
```

### 5. Run the frontend

```bash
cd frontend && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Contract methods

### Write
| Method | Description |
|--------|-------------|
| `create_dao(name, constitution)` | Register a new DAO. Caller becomes admin. |
| `submit_proposal(dao_id, title, description, requested_amount, recipient, target_council, rationale)` | Submit a funding proposal to a DAO. |
| `evaluate_proposal(proposal_id)` | Trigger AI evaluation with validator consensus. |
| `update_constitution(dao_id, new_constitution)` | Update DAO constitution (admin only). |

### Read
| Method | Description |
|--------|-------------|
| `get_dao(dao_id)` | Get DAO info and proposal count. |
| `get_proposal(proposal_id)` | Get proposal details and evaluation results. |
| `get_dao_count()` | Total number of registered DAOs. |
| `get_proposal_count()` | Total number of proposals across all DAOs. |

## License

MIT
