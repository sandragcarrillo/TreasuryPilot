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
        <main className="grow pt-20 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-slate-400 font-body">Connect your wallet to view your dashboard</p>
            <p className="text-xs text-slate-600 font-mono">Your organizations and proposals will appear here.</p>
          </div>
        </main>
      </div>
    );
  }

  const loading = loadingOrgs || loadingProposals;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="grow pt-14 pb-16">
        <div className="border-b border-slate-800/80 bg-black/30">
          <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-10">
            <div className="text-xs font-mono text-slate-600 uppercase tracking-[0.2em] mb-2">Dashboard</div>
            <h1 className="font-display text-3xl md:text-4xl text-slate-100">My Account</h1>
            <p className="text-xs font-mono text-slate-700 mt-2">{address}</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-10">

          {/* My Organizations */}
          <section className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-slate-600" />
                <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">
                  My Organizations
                </h2>
                <span className="font-mono text-xs text-slate-700 border border-slate-800 px-2 py-0.5">
                  {myOrgs.length}
                </span>
              </div>
              <button
                onClick={() => router.push("/")}
                className="text-xs font-mono text-cyan-600 hover:text-cyan-400 transition-colors"
              >
                + Register New
              </button>
            </div>

            {loading ? (
              <div className="gov-card p-8 flex items-center justify-center">
                <span className="font-mono text-sm text-slate-600 tracking-wider">Loading...</span>
              </div>
            ) : myOrgs.length === 0 ? (
              <div className="gov-card p-10 flex flex-col items-center gap-3 text-center">
                <Building2 className="w-8 h-8 text-slate-800" />
                <p className="text-sm text-slate-500 font-body">You haven&apos;t created any organizations yet.</p>
                <button
                  onClick={() => router.push("/")}
                  className="mt-1 px-4 py-2 text-xs font-mono uppercase tracking-widest text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/10 transition-colors"
                >
                  Register Organization
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myOrgs.map((org) => (
                  <Link
                    key={org.id}
                    href={`/dao/${org.id}`}
                    className="gov-card gov-card-hover p-5 block group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-base text-slate-100 group-hover:text-cyan-400 transition-colors truncate">
                          {org.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 text-xs font-mono text-slate-600">
                          <span>{org.proposal_count} proposals</span>
                          {org.auto_approve_enabled && (
                            <span className="text-cyan-600 border border-cyan-800/40 px-1.5 py-0.5 text-[10px]">
                              Auto-approve on
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-cyan-400 transition-colors shrink-0 mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* My Proposals */}
          <section className="space-y-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">
                My Grant Proposals
              </h2>
              <span className="font-mono text-xs text-slate-700 border border-slate-800 px-2 py-0.5">
                {myProposals.length}
              </span>
            </div>

            {loading ? (
              <div className="gov-card p-8 flex items-center justify-center">
                <span className="font-mono text-sm text-slate-600 tracking-wider">Loading...</span>
              </div>
            ) : myProposals.length === 0 ? (
              <div className="gov-card p-10 flex flex-col items-center gap-3 text-center">
                <FileText className="w-8 h-8 text-slate-800" />
                <p className="text-sm text-slate-500 font-body">You haven&apos;t submitted any grant proposals yet.</p>
                <button
                  onClick={() => router.push("/")}
                  className="mt-1 px-4 py-2 text-xs font-mono uppercase tracking-widest text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/10 transition-colors"
                >
                  Browse Organizations
                </button>
              </div>
            ) : (
              <div className="gov-card overflow-hidden">
                <div className="hidden md:grid grid-cols-12 px-5 py-3 border-b border-slate-800 bg-black/20">
                  <div className="col-span-1 text-xs font-mono text-slate-600 uppercase tracking-widest">#</div>
                  <div className="col-span-5 text-xs font-mono text-slate-600 uppercase tracking-widest">Proposal</div>
                  <div className="col-span-2 text-xs font-mono text-slate-600 uppercase tracking-widest">Program</div>
                  <div className="col-span-2 text-xs font-mono text-slate-600 uppercase tracking-widest">Amount</div>
                  <div className="col-span-2 text-xs font-mono text-slate-600 uppercase tracking-widest">Verdict</div>
                </div>
                <div className="divide-y divide-slate-800/60">
                  {myProposals.map((p) => (
                    <Link
                      key={p.id}
                      href={`/proposal/${p.id}`}
                      className="group block"
                    >
                      <div className="hidden md:grid grid-cols-12 items-center px-5 py-4 hover:bg-white/[0.03] transition-colors">
                        <div className="col-span-1 font-mono text-slate-600 text-sm">{p.id}</div>
                        <div className="col-span-5 pr-4">
                          <div className="font-body font-medium text-slate-200 text-sm group-hover:text-cyan-400 transition-colors line-clamp-1">
                            {p.title}
                          </div>
                        </div>
                        <div className="col-span-2 text-xs text-slate-500 font-mono">{p.target_program || "—"}</div>
                        <div className="col-span-2 text-xs font-mono text-slate-400">${p.requested_amount_usd}</div>
                        <div className="col-span-2">
                          <VerdictBadge recommendation={p.recommendation} status={p.status} size="sm" animate={false} />
                        </div>
                      </div>
                      {/* Mobile */}
                      <div className="md:hidden p-4 hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="font-mono text-slate-600 text-xs mr-2">#{p.id}</span>
                            <span className="font-body font-medium text-slate-200 text-sm">{p.title}</span>
                          </div>
                          <VerdictBadge recommendation={p.recommendation} status={p.status} size="sm" animate={false} />
                        </div>
                        <div className="flex gap-4 text-xs font-mono text-slate-500">
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
