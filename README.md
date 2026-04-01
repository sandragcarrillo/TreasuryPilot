# TreasuryPilot
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)

**Live app: [treasury-pilot-frontend.vercel.app](https://treasury-pilot-frontend.vercel.app)**

**Video Demo: [youtu.be/Qi2RoeiSLNk](https://youtu.be/Qi2RoeiSLNk)**

An AI-powered grants evaluation and tracking platform built on [GenLayer](https://genlayer.com). TreasuryPilot lets any organization register its constitution on-chain and automatically evaluate grant proposals against it using AI validators — with consensus ensuring the evaluation is fair and reproducible.

## How it works

1. An organization registers with a name and constitution (mission, programs, budgets, rules)
2. Anyone can submit a grant proposal targeting a specific program
3. AI validators independently evaluate the proposal against the constitution and reach consensus
4. Small grants below a configurable USD threshold can be auto-approved (if enabled by the owner)
5. Approved grantees submit progress reports, which AI validators evaluate for ROI

Each proposal is evaluated on:
- **Alignment score** (0-10): how well it fits the org mission and target program
- **Risk level**: low / medium / high
- **ROI assessment**: positive / neutral / negative
- **Recommendation**: approve / reject / modify
- **Reasoning**: brief explanation covering mission alignment, program fit, and risk factors

## Architecture

```
contracts/          # GenLayer Intelligent Contract (Python)
frontend/           # Next.js 15 app (TypeScript, TanStack Query, Radix UI)
deploy/             # TypeScript deployment script
test/               # Integration tests (gltest)
```

## Requirements

- [GenLayer CLI](https://github.com/genlayerlabs/genlayer-cli): `npm install -g genlayer`
- [GenLayer Studio](https://studio.genlayer.com) (recommended for development)
- Node.js + npm (or bun)

## Contract methods

### Organization Management
| Method | Description |
|--------|-------------|
| `create_org(name, constitution)` | Register a new organization. Caller becomes owner. |
| `update_constitution(org_id, new_constitution)` | Update org constitution (admin or owner). |
| `set_auto_approve(org_id, enabled, threshold_usd, veto_window_hours)` | Configure auto-approval for small grants (owner only). |
| `add_admin(org_id, admin_address)` | Add an admin to the org (owner only). |
| `remove_admin(org_id, admin_address)` | Remove an admin (owner only). |
| `transfer_ownership(org_id, new_owner)` | Transfer org ownership (owner only). |

### Grant Proposals
| Method | Description |
|--------|-------------|
| `submit_proposal(org_id, title, description, requested_amount_usd, recipient, target_program, rationale)` | Submit a grant proposal. |
| `evaluate_proposal(proposal_id)` | Trigger AI evaluation with validator consensus. |
| `veto_proposal(proposal_id)` | Veto an auto-approved proposal (admin or owner). |

### Progress Reports
| Method | Description |
|--------|-------------|
| `submit_report(proposal_id, milestones_completed, funds_spent_usd, deliverables, evidence_urls)` | Submit a progress report for an approved grant. |
| `evaluate_report(proposal_id, report_number)` | AI evaluates report against original proposal KPIs. |

### Read
| Method | Description |
|--------|-------------|
| `get_org(org_id)` | Get org info, constitution, auto-approve config. |
| `get_org_count()` | Total number of registered organizations. |
| `get_org_admins(org_id)` | List of admin addresses for an org. |
| `get_proposal(proposal_id)` | Get proposal details, evaluation, and status. |
| `get_proposal_count()` | Total number of proposals. |
| `get_report(proposal_id, report_number)` | Get a specific progress report. |
| `get_report_count(proposal_id)` | Number of reports for a proposal. |
| `get_program_budget_status(org_id)` | Total USD approved per program. |

## License

MIT
