# Axiom Pilot
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)

**Live app: [axiompilot.org](https://www.axiompilot.org/)**

**Contract: [`0x7961Ff3a8e4a63505e4bc89a97575A44af0B7AaC`](https://explorer-studio.genlayer.com/address/0x7961Ff3a8e4a63505e4bc89a97575A44af0B7AaC) on GenLayer Studio**

**Payments: Base mainnet USDC** via [x402](https://x402.org/) / Coinbase Developer Platform facilitator.

**Video Demo: [youtu.be/Qi2RoeiSLNk](https://youtu.be/Qi2RoeiSLNk)** *(earlier hackathon build; UI and feature set have evolved significantly)*

An AI-powered grants evaluation and tracking platform built on [GenLayer](https://genlayer.com). Axiom Pilot lets any organization define its constitution on-chain and automatically evaluate grant proposals against it using AI validators — with consensus ensuring every evaluation is fair and reproducible. Org owners always retain the final word: every AI verdict can be overridden by a human decision recorded on-chain.

## How it works

1. An organization registers with a name and constitution (mission, grant programs, budgets, rules)
2. The owner configures auto-approval thresholds, veto windows, modification windows, appeals, and historical-baseline anchoring; admins can be added to share governance
3. Anyone submits a grant proposal targeting a specific program (USDC paid via x402 on Base)
4. AI validators independently evaluate the proposal against the constitution and reach consensus
5. Small grants below a configurable USD threshold can be auto-approved (owner can veto within a time window)
6. Rejected proposals can be revised and re-submitted within the modification window; if appeals are enabled, rejected proposals can also be appealed for human review (no AI re-evaluation, the org owner decides)
7. The org owner can record a public **human decision** on any proposal or report — recommended, approved, rejected, or any other action — sitting alongside the AI verdict on-chain
8. Approved grantees (and their team members) submit progress reports, which AI validators evaluate for ROI
9. When validator consensus fails (UNDETERMINED), the leader's preliminary view is surfaced in the UI with disputed-field markers and a free retry — paid evaluations don't get silently swallowed
10. The Telegram bot notifies org owners about new proposals, evaluations, auto-approvals, appeals, human decisions, reports, and more

Each proposal is evaluated on:
- **Alignment score** (0-10): how well it fits the org mission and target program
- **Risk level**: low / medium / high
- **ROI assessment**: positive / neutral / negative
- **Recommendation**: approve / reject / modify (with explicit decision-tree criteria — modify is reserved for cases with concrete required changes)
- **Reasoning**: structured analysis (red-team concerns, budget arithmetic, mission alignment, deliverable specificity, recipient track record, key risks, red flags, required changes if any)

Each progress report is evaluated on:
- **Progress score** (0-10): delivery against original proposal KPIs
- **ROI status**: on_track / at_risk / exceeding / pivoted / failed
- **Recommended action**: continue_funding / pause_pending_clarification / claw_back / terminate
- **AI summary**: forensic-audit analysis covering milestone ledger, fund accountability, pathology checks, and cross-report consistency

Both layer additionally with:
- **Appeal layer** (proposals only): submitter's revised content + appeal text after a rejection
- **Human decision layer**: org's final verdict (proposal: approved / rejected / modify) or action (report: continue / pause / claw_back / terminate) with optional reason and timestamped author

## Architecture

```
contracts/          # GenLayer Intelligent Contract (Python)
frontend/           # Next.js 15 app (TypeScript, TanStack Query, Radix UI)
bot/                # Telegram bot for notifications (TypeScript, grammY)
deploy/             # TypeScript deployment script
test/               # Integration tests (gltest)
```

## Contract methods

All write methods accept an `actor_address` first argument so the relay (paid via x402) can submit on behalf of the user's wallet without requiring the user to hold GenLayer-native tokens.

### Organization Management
| Method | Description |
|--------|-------------|
| `create_org(actor, name, constitution)` | Register a new organization. `actor` becomes owner. |
| `update_constitution(actor, org_id, new_constitution)` | Update org constitution (admin or owner). |
| `set_auto_approve(actor, org_id, enabled, threshold_usd, veto_window_hours)` | Configure auto-approval for small grants (owner only). |
| `set_modification_window(actor, org_id, hours)` | Configure how long submitters have to revise a `needs_modification` proposal (owner only; default 48h, capped at 720h). |
| `set_appeals(actor, org_id, enabled, window_hours)` | Enable/disable appeals on rejected proposals and configure the advisory window (owner only; default off, default window 168h). |
| `set_historical_baseline(actor, org_id, enabled)` | Toggle whether `evaluate_proposal` feeds the AI an aggregate of past grant amounts and delivery rates from prior grants in the same program (owner only; off by default). |
| `add_admin(actor, org_id, admin_address)` | Add an admin (owner only). |
| `remove_admin(actor, org_id, admin_address)` | Remove an admin (owner only). |
| `transfer_ownership(actor, org_id, new_owner)` | Transfer org ownership (owner only). |

### Grant Proposals
| Method | Description |
|--------|-------------|
| `submit_proposal(actor, org_id, title, description, requested_amount_usd, recipient, target_program, rationale)` | Submit a grant proposal. |
| `evaluate_proposal(proposal_id)` | Trigger AI evaluation with validator consensus. Permissionless. |
| `update_proposal(actor, proposal_id, ...content)` | Submitter revises a proposal in `pending` or `needs_modification` status. Resets the proposal to `pending` for re-evaluation; clears any prior appeal/human-decision layer. |
| `veto_proposal(actor, proposal_id)` | Veto an auto-approved proposal (admin or owner). |
| `file_appeal(actor, proposal_id, appeal_text, ...revised_content)` | Submitter files an appeal on a rejected proposal (requires appeals enabled on the org). Stores the revised content + appeal justification for human review; AI does NOT re-evaluate. |
| `set_human_decision(actor, proposal_id, verdict, reason)` | Admin or owner records the final human verdict on any proposal — `approved` / `rejected` / `modify`, or empty string to clear. Public, layered on top of the AI recommendation. |

### Team Members
Per-proposal team allowing wallets other than the submitter to submit progress reports.

| Method | Description |
|--------|-------------|
| `add_team_member(actor, proposal_id, member_address)` | Add a wallet to the proposal's reporting team (submitter only). |
| `remove_team_member(actor, proposal_id, member_address)` | Remove a wallet from the team (submitter only). |

### Progress Reports
| Method | Description |
|--------|-------------|
| `submit_report(actor, proposal_id, milestones_completed, funds_spent_usd, deliverables, evidence_urls)` | Submit a progress report for an approved grant (submitter or any team member). |
| `evaluate_report(proposal_id, report_number)` | AI evaluates report against original proposal KPIs. Permissionless. |
| `set_report_human_decision(actor, proposal_id, report_number, action, reason)` | Admin or owner records final human action on a report — `continue_funding` / `pause_pending_clarification` / `claw_back` / `terminate`, or empty string to clear. Layered on top of the AI's recommended action. |

### Read
| Method | Description |
|--------|-------------|
| `get_org(org_id)` | Org info: name, owner, constitution, auto-approve / modification / appeals / historical-baseline configuration. |
| `get_org_count()` | Total number of registered organizations. |
| `get_org_admins(org_id)` | List of admin addresses for an org. |
| `get_proposal(proposal_id)` | Full proposal: content, AI evaluation, status, modification deadline, appeal layer, human-decision layer. |
| `get_proposal_count()` | Total number of proposals. |
| `get_proposal_team(proposal_id)` | Team members authorized to submit reports for this proposal. |
| `get_report(proposal_id, report_number)` | Report: content, AI assessment, human-decision layer. |
| `get_report_count(proposal_id)` | Number of reports for a proposal. |
| `get_program_budget_status(org_id)` | Total USD approved per program. |
| `get_relay_address()` | The trusted relay's address (the project wallet that submits on behalf of users). |

## Frontend

Next.js 16 app (TypeScript, TanStack Query, Tailwind v4, Radix UI) with:

- **Organization Registry** — Browse, search, and register organizations. Org cards extract a clean mission summary from any constitution format (markdown, all-caps, table, etc.).
- **Constitution Editor** — Markdown-aware viewer that handles `#`/`##`/`###` headings, `**bold**`, lists, pipe-tables, and clickable links. Owner can update the constitution at any time.
- **Grant Proposals** — Submit proposals targeting specific programs (paid via x402 USDC on Base mainnet). Edit while pending or after a `needs_modification` verdict.
- **Reporting Team** — Submitter can authorize additional wallets to submit progress reports on the proposal.
- **Dashboard** — Personal view of your organizations and submitted proposals.
- **Org Settings panels** — Auto-approve thresholds + veto window, modification window, appeals on/off + window, historical-baseline anchoring, admin management, ownership transfer (with two-step confirmation).
- **Program Budget Tracking** — Approved USD per program shown alongside the constitution-defined budget.
- **AI Evaluation** — Click "Request AI evaluation" → consensus reached on-chain → verdict surfaced with structured reasoning, alignment score, risk, ROI, and (if relevant) required changes.
- **Preliminary Verdict** — When validator consensus fails (`UNDETERMINED`), the leader's preliminary view is shown with `*` markers on disputed fields, the rotation count, and a free retry button. Submitter can also revise the proposal before retrying.
- **Modification flow** — Rejected-with-modify proposals get an inline countdown banner and "Revise" action while the modification window is open.
- **Appeals flow** — Rejected proposals (when the org has appeals enabled) show a "File appeal" action; the submitter writes a justification + revises content, the org owner reviews via the Human Decision panel.
- **Human Decision** — Admin/owner can record a public verdict on any proposal (approve / reject / needs-modification) and any report (continue / pause / claw-back / terminate). Verdicts are pill-displayed alongside the AI recommendation, never replacing it.
- **Progress Reports** — Submitter or team submits reports; AI evaluates ROI. Cards collapse by default for scannability with a `Read more ↓` toggle.
- **Veto** — Owner/admins can veto auto-approved proposals.
- **Status Tracking** — Full proposal lifecycle: `pending` / `approved` / `rejected` / `needs_modification` / `auto_approved` / `vetoed`, plus orthogonal `appealed` and `human_verdict` layers.

### Payments

x402-mediated USDC payments on Base mainnet. The Coinbase Developer Platform facilitator handles `verify` + `settle`; the project's payment wallet receives USDC directly (project does not custody user funds beyond the per-call fee). Pricing per route: `create-org` $2.00, `submit-proposal` $1.00, `evaluate-proposal` $1.50, `submit-report` $0.25, `evaluate-report` $0.75. Configuration writes (settings, admin management, appeals, human decisions, etc.) are free.

When a paid evaluation hits `UNDETERMINED` consensus, a server-side retry-claim store grants exactly one free retry per failed transaction (per-tx, atomic via Upstash KV + SETNX, 30-day TTL).

## Telegram Bot

**[@TreasuryPilotBot](https://t.me/TreasuryPilotBot)** — *currently under deployment with new features (appeals, human-decision overrides, team members, expanded notifications). The handle above will continue to work; expect downtime as the new build ships.*

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
- *(coming with the new build)* Appeals filed, human decisions recorded, team members added/removed

## Explorer

All transactions available at [GenLayer Studio Explorer](https://explorer-studio.genlayer.com/address/0x7961Ff3a8e4a63505e4bc89a97575A44af0B7AaC). Payment transactions are visible on [BaseScan](https://basescan.org/address/0x142217B4ce14C801AB5FF3b700eedfac05B78897) (the project's USDC receiving wallet).

## License

MIT
