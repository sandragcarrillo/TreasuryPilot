"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Settings, FileText, Gavel, Users, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ROUTE_PRICE_USD, type PaidRouteId } from "@/lib/payment/prices";

interface PaidRow {
  id: PaidRouteId;
  label: string;
  what: string;
  who: string;
}

const PAID_ROUTES: PaidRow[] = [
  {
    id: "create-org",
    label: "Register an organization",
    what: "Publishes your org and its constitution on-chain. The constitution becomes the authoritative reference every AI evaluation reads from.",
    who: "Anyone bringing a new grants program, foundation, DAO, lab, or community to the platform.",
  },
  {
    id: "submit-proposal",
    label: "Submit a grant proposal",
    what: "Stores your proposal on-chain (title, description, requested amount, recipient, target program, rationale) so it can be evaluated.",
    who: "Anyone applying for a grant from any registered organization.",
  },
  {
    id: "evaluate-proposal",
    label: "AI evaluation of a proposal",
    what: "Triggers multiple AI validators to independently evaluate the proposal against the org's constitution and reach consensus on alignment, risk, ROI, and recommendation. Includes a free retry if validators can't agree.",
    who: "Anyone: the submitter, an org admin, or even a third party. Permissionless.",
  },
  {
    id: "submit-report",
    label: "Submit a progress report",
    what: "Stores a milestone update (deliverables, funds spent, evidence URLs) for an approved grant.",
    who: "The proposal submitter or any wallet on the proposal's reporting team.",
  },
  {
    id: "evaluate-report",
    label: "AI evaluation of a report",
    what: "Triggers AI validators to forensically audit the report against the original proposal: milestone ledger, fund accountability, scope-drift / metric-substitution checks, and a recommended action. Includes a free retry on consensus failure.",
    who: "Anyone, typically the org owner reviewing progress, or the grantee requesting validation.",
  },
];

interface FreeRow {
  label: string;
  what: string;
  who: string;
}

const FREE_ROUTES: FreeRow[] = [
  {
    label: "Update constitution",
    what: "Edit the rules, mission, or program structure. Applies to all future evaluations.",
    who: "Org admin or owner.",
  },
  {
    label: "Configure auto-approval / modification window / appeals / historical baseline",
    what: "Tune how the org handles small grants, modification deadlines, appeal windows, and AI anchoring on prior history.",
    who: "Org owner.",
  },
  {
    label: "Add or remove admins",
    what: "Share governance with trusted collaborators.",
    who: "Org owner.",
  },
  {
    label: "Transfer ownership",
    what: "Move the org to a different wallet (with multi-step UI confirmation).",
    who: "Org owner.",
  },
  {
    label: "Modify a proposal",
    what: "Edit a pending or `needs_modification` proposal. Resets the proposal to pending so it can be (re-)evaluated.",
    who: "Proposal submitter only.",
  },
  {
    label: "File an appeal",
    what: "On a rejected proposal (when the org has appeals enabled), submit revised content + appeal text for human review. The AI does not re-evaluate.",
    who: "Proposal submitter only.",
  },
  {
    label: "Add or remove team members on a proposal",
    what: "Authorize additional wallets to submit progress reports for the grant.",
    who: "Proposal submitter only.",
  },
  {
    label: "Veto an auto-approved proposal",
    what: "Reverse a small-grant auto-approval inside the configured veto window.",
    who: "Org admin or owner.",
  },
  {
    label: "Record a human decision",
    what: "Final verdict (approve / reject / needs-modification) on any proposal, or action (continue / pause / claw_back / terminate) on any report. Stored on-chain and shown alongside the AI verdict.",
    who: "Org admin or owner.",
  },
];

function formatPrice(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="grow pt-18 pb-20">
        {/* Header band */}
        <div className="border-b border-border-soft">
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-16">
            <div className="text-[11px] font-mono tracking-[0.3em] text-text-faint mb-3">
              Pricing
            </div>
            <h1 className="text-5xl md:text-6xl text-text font-semibold leading-[0.95] tracking-tight">
              Pay only for AI work and on-chain actions.
            </h1>
            <p className="text-text-dim text-base md:text-lg mt-5 max-w-2xl leading-relaxed">
              Configuration is free. You pay USDC on Base when something
              actually costs the platform: registering an org, submitting a
              proposal or report, or asking AI validators to deliberate.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-14 space-y-16">
          {/* Paid actions */}
          <section className="space-y-6 animate-fade-in">
            <SectionLabel
              icon={<Sparkles className="w-3.5 h-3.5" />}
              label="Paid actions"
              count={PAID_ROUTES.length}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PAID_ROUTES.map((row) => (
                <PaidCard key={row.id} row={row} priceUsd={ROUTE_PRICE_USD[row.id]} />
              ))}
            </div>

            <div className="rounded-2xl border border-border-soft bg-bg-elev/40 p-6 space-y-3">
              <div className="text-[10px] font-mono tracking-[0.25em] text-text-faint uppercase">
                How payment works
              </div>
              <p className="text-sm text-text-dim leading-relaxed max-w-3xl">
                Paid actions use the{" "}
                <a
                  href="https://x402.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent/80 underline underline-offset-2"
                >
                  x402
                </a>{" "}
                payment protocol with the Coinbase Developer Platform
                facilitator. When you click "Submit" or "Request AI evaluation",
                your wallet signs an authorization to transfer the listed USDC
                amount on Base mainnet. The facilitator settles the payment and
                only then does the action execute. No subscription, no escrow.
              </p>
              <p className="text-sm text-text-dim leading-relaxed max-w-3xl">
                If validator consensus fails (an{" "}
                <span className="font-mono text-warning">UNDETERMINED</span>{" "}
                outcome, rare but possible), the platform records a free
                retry-claim against that transaction. You don't pay twice for
                evaluator drift.
              </p>
            </div>
          </section>

          {/* Free actions */}
          <section className="space-y-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <SectionLabel
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              label="Free actions"
              count={FREE_ROUTES.length}
            />
            <p className="text-sm text-text-dim max-w-2xl leading-relaxed">
              Configuration, governance, and authorship actions don't cost USDC.
              Only the relay's GenLayer gas, which the platform covers.
            </p>
            <div className="gov-card overflow-hidden">
              <div className="hidden md:grid grid-cols-12 px-6 py-4 border-b border-border-soft">
                <div className="col-span-4 text-[10px] font-mono text-text-faint tracking-[0.2em]">
                  Action
                </div>
                <div className="col-span-5 text-[10px] font-mono text-text-faint tracking-[0.2em]">
                  What it does
                </div>
                <div className="col-span-3 text-[10px] font-mono text-text-faint tracking-[0.2em]">
                  Who can do it
                </div>
              </div>
              <div className="divide-y divide-border-soft">
                {FREE_ROUTES.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-0 px-6 py-5"
                  >
                    <div className="md:col-span-4 text-sm text-text font-medium pr-4">
                      {row.label}
                    </div>
                    <div className="md:col-span-5 text-sm text-text-dim leading-relaxed pr-4">
                      {row.what}
                    </div>
                    <div className="md:col-span-3 text-xs text-text-faint font-mono">
                      {row.who}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="space-y-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <SectionLabel
              icon={<Settings className="w-3.5 h-3.5" />}
              label="Good to know"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NoteCard
                icon={<FileText className="w-4 h-4 text-accent" />}
                title="Transparent on-chain"
                body="Every paid action settles a USDC transfer visible on BaseScan; every contract call is visible on the GenLayer Studio explorer. Pricing is what's coded into the relay routes. No hidden fees."
              />
              <NoteCard
                icon={<Gavel className="w-4 h-4 text-accent" />}
                title="The org always has the final word"
                body="AI verdicts are advisory. An org owner or admin can record a human decision on any proposal or report, for free. The human decision is published publicly alongside the AI's recommendation."
              />
              <NoteCard
                icon={<Users className="w-4 h-4 text-accent" />}
                title="Works with any EVM wallet on Base"
                body="MetaMask, Rabby, Coinbase Wallet, Trust, any wallet that signs EIP-712. You hold your USDC; the platform never custodies user funds beyond the per-call fee."
              />
              <NoteCard
                icon={<Sparkles className="w-4 h-4 text-accent" />}
                title="Permissionless evaluations"
                body="Anyone can pay to trigger an evaluation on any proposal: submitter, org admin, or third-party observer. The output is deterministic in expectation given the proposal + constitution; there's no privileged 'evaluator identity'."
              />
            </div>
          </section>

          {/* CTA */}
          <section className="pt-8 animate-fade-in">
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <h2 className="text-2xl md:text-3xl font-semibold text-text tracking-tight leading-snug">
                  Try a $1 evaluation.
                </h2>
                <p className="text-text-dim leading-relaxed">
                  Browse organizations, pick one whose mission resonates, submit
                  a real proposal, and watch AI validators reach consensus on
                  it. End-to-end takes a few minutes and costs less than a
                  coffee.
                </p>
              </div>
              <Link
                href="/organizations"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-medium bg-accent text-bg hover:bg-accent/90 transition-colors shrink-0"
              >
                Browse organizations
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// ─── Section label (matches Dashboard pattern) ──────────────────────────────

function SectionLabel({
  icon,
  label,
  count,
}: {
  icon?: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <div className="flex items-end justify-between border-b border-border-soft pb-4">
      <div className="flex items-baseline gap-3">
        {icon && <span className="text-text-faint">{icon}</span>}
        <h2 className="text-[11px] font-mono tracking-[0.25em] text-text-faint">
          {label}
        </h2>
        {count !== undefined && (
          <span className="font-mono text-[11px] text-text-faint">
            {count.toString().padStart(2, "0")}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Paid action card ──────────────────────────────────────────────────────

function PaidCard({ row, priceUsd }: { row: PaidRow; priceUsd: number }) {
  return (
    <div className="gov-card p-6 md:p-7 flex flex-col gap-4 h-full">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-base md:text-lg text-text leading-snug tracking-tight">
          {row.label}
        </h3>
        <span className="font-mono text-[12px] font-bold px-3 py-1 shrink-0 rounded-full text-accent bg-accent/10 border border-accent/20 whitespace-nowrap">
          {formatPrice(priceUsd)} USDC
        </span>
      </div>
      <p className="text-sm text-text-dim leading-relaxed">{row.what}</p>
      <div className="mt-auto pt-4 border-t border-border-soft text-[11px] font-mono text-text-faint">
        {row.who}
      </div>
    </div>
  );
}

// ─── Note card ─────────────────────────────────────────────────────────────

function NoteCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="gov-card p-6 flex gap-4">
      <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h4 className="text-base font-medium text-text tracking-tight">
          {title}
        </h4>
        <p className="text-sm text-text-dim leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
