"use client";

import Link from "next/link";
import { VerdictBadge } from "./VerdictBadge";
import type { Proposal } from "@/lib/contracts/types";

interface ProposalDocketProps {
  proposals: Proposal[];
  loading?: boolean;
  onSubmitClick?: () => void;
}

export function ProposalDocket({ proposals, loading, onSubmitClick }: ProposalDocketProps) {
  if (loading) {
    return (
      <div className="gov-card p-8 flex items-center justify-center">
        <div className="text-slate-600 font-mono text-sm tracking-wider">Loading docket...</div>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="gov-card p-12 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-12 h-12 border border-slate-700 flex items-center justify-center">
          <span className="font-mono text-slate-600 text-lg">∅</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-400 font-body font-medium">No proposals on docket</p>
          <p className="text-xs text-slate-600 font-mono">The chamber awaits its first case.</p>
        </div>
        {onSubmitClick && (
          <button
            onClick={onSubmitClick}
            className="mt-2 px-5 py-2 text-xs font-mono uppercase tracking-widest border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          >
            Submit Grant Proposal
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="gov-card overflow-hidden">
      {/* Header */}
      <div className="hidden md:grid grid-cols-12 px-5 py-3 border-b border-slate-800 bg-black/20">
        <div className="col-span-1 text-xs font-mono text-slate-600 uppercase tracking-widest">#</div>
        <div className="col-span-5 text-xs font-mono text-slate-600 uppercase tracking-widest">Proposal</div>
        <div className="col-span-2 text-xs font-mono text-slate-600 uppercase tracking-widest">Program</div>
        <div className="col-span-2 text-xs font-mono text-slate-600 uppercase tracking-widest">Amount</div>
        <div className="col-span-2 text-xs font-mono text-slate-600 uppercase tracking-widest">Verdict</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-800/60">
        {proposals.map((p, i) => (
          <Link
            key={p.id}
            href={`/proposal/${p.id}`}
            className="group block animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Desktop row */}
            <div className="hidden md:grid grid-cols-12 items-center px-5 py-4 hover:bg-white/[0.03] transition-colors">
              <div className="col-span-1 font-mono text-slate-600 text-sm">{p.id}</div>
              <div className="col-span-5 pr-4">
                <div className="font-body font-medium text-slate-200 text-sm group-hover:text-cyan-400 transition-colors line-clamp-1">
                  {p.title}
                </div>
                <div className="text-xs text-slate-600 mt-0.5 line-clamp-1">{p.description}</div>
              </div>
              <div className="col-span-2 text-xs text-slate-500 font-mono">{p.target_program || "—"}</div>
              <div className="col-span-2 text-xs font-mono text-slate-400">${p.requested_amount_usd}</div>
              <div className="col-span-2">
                <VerdictBadge recommendation={p.recommendation} status={p.status} size="sm" animate={false} />
              </div>
            </div>

            {/* Mobile card */}
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
  );
}
