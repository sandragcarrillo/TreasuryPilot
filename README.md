# TreasuryPilot
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)

**Live app: [treasury-pilot-frontend.vercel.app](https://treasury-pilot-frontend.vercel.app)**

**Contract: [`0xa477A17e16715e2ec81cf620702f3E0574d15af3`](https://explorer-studio.genlayer.com/address/0xa477A17e16715e2ec81cf620702f3E0574d15af3) on GenLayer Studio**

**Video Demo: [youtu.be/Qi2RoeiSLNk](https://youtu.be/Qi2RoeiSLNk)**

An AI-powered grants evaluation and tracking platform built on [GenLayer](https://genlayer.com). TreasuryPilot lets any organization define its constitution on-chain and automatically evaluate grant proposals against it using AI validators — with consensus ensuring every evaluation is fair and reproducible.

## How it works

1. An organization registers with a name and constitution (mission, grant programs, budgets, rules)
2. The owner can configure auto-approval thresholds, veto windows, and add admins
3. Anyone submits a grant proposal targeting a specific program
4. AI validators independently evaluate the proposal against the constitution and reach consensus
5. Small grants below a configurable USD threshold can be auto-approved (owner can veto within a time window)
6. Approved grantees submit progress reports, which AI validators evaluate for ROI
7. The Telegram bot notifies org owners about new proposals, evaluations, auto-approvals, reports, and more

Each proposal is evaluated on:
- **Alignment score** (0-10): how well it fits the org mission and target program
- **Risk level**: low / medium / high
- **ROI assessment**: positive / neutral / negative
- **Recommendation**: approve / reject / modify
- **Reasoning**: brief explanation covering mission alignment, program fit, and risk factors

Each progress report is evaluated on:
- **Progress score** (0-10): delivery against original proposal KPIs
- **ROI status**: on_track / at_risk / exceeding / failed
- **AI summary**: analysis comparing deliverables against promised outcomes

## Architecture

```
contracts/          # GenLayer Intelligent Contract (Python)
frontend/           # Next.js 15 app (TypeScript, TanStack Query, Radix UI)
bot/                # Telegram bot for notifications (TypeScript, grammY)
deploy/             # TypeScript deployment script
test/               # Integration tests (gltest)
```

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

## Frontend

Next.js 15 app with:
- **Organization Registry** — Browse and register organizations with constitutions
- **Grant Proposals** — Submit proposals targeting specific programs, trigger AI evaluation
- **Dashboard** — Personal view of your organizations and submitted proposals
- **Auto-Approve Settings** — Owner configures USD threshold and veto window
- **Admin Management** — Owner adds/removes admins
- **Program Budget Tracking** — See approved USD per program
- **Progress Reports** — Grantees submit reports, AI evaluates ROI
- **Veto** — Owner/admins can veto auto-approved proposals
- **Status Tracking** — Full proposal lifecycle: pending, approved, rejected, needs_modification, auto_approved, vetoed

## Telegram Bot

Conversational bot for org owners to manage their grants program from Telegram. Wallet links persist across restarts.

**Commands:**
- `/link 0xAddress` — Link wallet, auto-detect owned organizations
- `/unlink` — Remove wallet link
- `/myorgs` — View your organizations
- `/proposals <org_id>` — List proposals with status and AI scores
- `/proposal <id>` — Full proposal detail with evaluation reasoning
- `/budget <org_id>` — Program budget breakdown
- `/reports <proposal_id>` — Progress reports with ROI status
- `/stats` — Overall platform stats

**Push notifications** (automatic, every 30s poll):
- New proposals submitted to your org
- AI evaluation results (with score, risk, recommendation)
- Auto-approved grants (with "process payment" reminder)
- Vetoed proposals
- New progress reports
- Report evaluation results (with ROI status)

## Explorer

All transactions available at [GenLayer Studio Explorer](https://explorer-studio.genlayer.com/address/0xa477A17e16715e2ec81cf620702f3E0574d15af3)

## License

MIT
