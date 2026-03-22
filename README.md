# TreasuryPilot
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)

**Live app: [treasury-pilot-frontend.vercel.app](https://treasury-pilot-frontend.vercel.app)**
**Contract: [`0x8E09e2d21ba7bfb9A3c15E3AD9f5Ab48Ea6050Dc`](https://explorer-bradbury.genlayer.com/address/0x8E09e2d21ba7bfb9A3c15E3AD9f5Ab48Ea6050Dc) on Bradbury Testnet**
**Demo: [youtu.be/Qi2RoeiSLNk](https://youtu.be/Qi2RoeiSLNk)**

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
