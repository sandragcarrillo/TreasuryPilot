"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, FileText, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { VerdictBadge } from "@/components/VerdictBadge";
import { useOrgs, useAllProposals } from "@/lib/hooks/useTreasuryPilot";
import { useWallet } from "@/lib/genlayer/wallet";

export default function DashboardPage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const { data: allOrgs = [], isLoading: loadingOrgs } = useOrgs();
  const { data: allProposals = [], isLoading: loadingProposals } = useAllProposals();

  const lowerAddress = address?.toLowerCase();

  const myOrgs = useMemo(
    () => allOrgs.filter((o) => o.owner.toLowerCase() === lowerAddress),
    [allOrgs, lowerAddress]
  );

  const myProposals = useMemo(
    () => allProposals.filter((p) => p.submitter?.toLowerCase() === lowerAddress),
    [allProposals, lowerAddress]
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="grow pt-24 flex items-center justify-center px-6">
          <div className="text-center max-w-sm space-y-3">
            <p className="text-2xl text-text font-medium tracking-tight">Connect your wallet.</p>
            <p className="text-sm text-text-dim leading-relaxed">
              Your organizations and grant proposals will appear here.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const loading = loadingOrgs || loadingProposals;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="grow pt-18 pb-20">
        {/* Header band */}
        <div className="border-b border-border-soft">
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-16">
            <div className="text-[11px] font-mono tracking-[0.3em] text-text-faint mb-3">
              Dashboard
            </div>
            <h1 className="text-5xl md:text-6xl text-text font-medium leading-[0.95] tracking-tight">
              My Account
            </h1>
            <p className="text-[11px] font-mono text-text-faint mt-4 truncate" title={address ?? ""}>
              {address}
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-14 space-y-16">
          {/* My Organizations */}
          <section className="space-y-6 animate-fade-in">
            <SectionLabel
              icon={<Building2 className="w-3.5 h-3.5" />}
              label="My Organizations"
              count={myOrgs.length}
              action={
                <button
                  onClick={() => router.push("/")}
                  className="text-[11px] font-mono tracking-[0.2em] text-accent hover:text-accent/80 transition-colors"
                >
                  + Register New
                </button>
              }
            />

            {loading ? (
              <div className="gov-card p-12 flex items-center justify-center">
                <span className="font-mono text-xs text-text-faint tracking-widest">Loading…</span>
              </div>
            ) : myOrgs.length === 0 ? (
              <EmptyState
                headline="Nothing here yet."
                body="Create your first organization and define how AI evaluates proposals against your mission."
                cta={{ label: "Register Organization", onClick: () => router.push("/") }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myOrgs.map((org) => (
                  <Link
                    key={org.id}
                    href={`/org/${org.id}`}
                    className="gov-card gov-card-hover p-6 block group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-xl text-text group-hover:text-accent transition-colors truncate leading-snug">
                          {org.name}
                        </h3>
                        <div className="flex items-center gap-2.5 mt-2 text-[11px] text-text-faint">
                          <span>
                            {org.proposal_count}{" "}
                            {org.proposal_count === 1 ? "proposal" : "proposals"}
                          </span>
                          {org.auto_approve_enabled && (
                            <span className="text-accent/90 border border-accent/30 bg-accent/5 rounded-full px-2 py-0.5 text-[10px]">
                              Auto-approve on
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-text-faint group-hover:text-accent transition-colors shrink-0 mt-1.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* My Proposals */}
          <section className="space-y-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <SectionLabel
              icon={<FileText className="w-3.5 h-3.5" />}
              label="My Grant Proposals"
              count={myProposals.length}
            />

            {loading ? (
              <div className="gov-card p-12 flex items-center justify-center">
                <span className="font-mono text-xs text-text-faint tracking-widest">Loading…</span>
              </div>
            ) : myProposals.length === 0 ? (
              <EmptyState
                headline="Still waiting."
                body="You haven't submitted any proposals yet. Browse organizations and find one that aligns with your work."
                cta={{ label: "Browse Organizations", onClick: () => router.push("/") }}
              />
            ) : (
              <div className="gov-card overflow-hidden">
                <div className="hidden md:grid grid-cols-12 px-6 py-4 border-b border-border-soft">
                  <div className="col-span-1 text-[10px] font-mono text-text-faint tracking-[0.2em]">#</div>
                  <div className="col-span-5 text-[10px] font-mono text-text-faint tracking-[0.2em]">Proposal</div>
                  <div className="col-span-2 text-[10px] font-mono text-text-faint tracking-[0.2em]">Program</div>
                  <div className="col-span-2 text-[10px] font-mono text-text-faint tracking-[0.2em]">Amount</div>
                  <div className="col-span-2 text-[10px] font-mono text-text-faint tracking-[0.2em]">Verdict</div>
                </div>
                <div className="divide-y divide-border-soft">
                  {myProposals.map((p) => (
                    <Link
                      key={p.id}
                      href={`/proposal/${p.id}`}
                      className="group block"
                    >
                      {/* Desktop */}
                      <div className="hidden md:grid grid-cols-12 items-center px-6 py-5 hover:bg-bg-elev-2/40 transition-colors">
                        <div className="col-span-1 font-mono text-text-faint text-sm">{p.id}</div>
                        <div className="col-span-5 pr-4">
                          <div className="font-body font-medium text-text text-sm group-hover:text-accent transition-colors line-clamp-1">
                            {p.title}
                          </div>
                        </div>
                        <div className="col-span-2 text-xs text-text-dim font-mono">{p.target_program || "—"}</div>
                        <div className="col-span-2 text-xs font-mono text-text-dim">${p.requested_amount_usd}</div>
                        <div className="col-span-2">
                          <VerdictBadge recommendation={p.recommendation} status={p.status} size="sm" animate={false} />
                        </div>
                      </div>
                      {/* Mobile */}
                      <div className="md:hidden p-5 hover:bg-bg-elev-2/40 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <span className="font-mono text-text-faint text-xs mr-2">#{p.id}</span>
                            <span className="font-body font-medium text-text text-sm">{p.title}</span>
                          </div>
                          <VerdictBadge recommendation={p.recommendation} status={p.status} size="sm" animate={false} />
                        </div>
                        <div className="flex gap-4 text-xs font-mono text-text-faint">
                          <span>{p.target_program}</span>
                          <span>${p.requested_amount_usd}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// ─── Section Label ───────────────────────────────────────────────────────────

function SectionLabel({
  icon,
  label,
  count,
  action,
}: {
  icon?: React.ReactNode;
  label: string;
  count?: number;
  action?: React.ReactNode;
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
      {action}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({
  headline,
  body,
  cta,
}: {
  headline: string;
  body: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="gov-card p-14 flex flex-col items-center gap-5 text-center">
      <div className="space-y-2 max-w-md">
        <p className="text-2xl text-text font-medium tracking-tight">{headline}</p>
        <p className="text-sm text-text-dim leading-relaxed">{body}</p>
      </div>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-1 px-5 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/70 transition-all"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
