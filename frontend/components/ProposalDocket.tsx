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
      <div className="gov-card p-12 flex items-center justify-center">
        <span className="font-mono text-xs text-text-faint tracking-widest">Loading docket…</span>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="gov-card p-14 flex flex-col items-center gap-5 text-center">
        <div className="space-y-2 max-w-md">
          <p className="text-2xl text-text font-medium tracking-tight">The chamber is empty.</p>
          <p className="text-sm text-text-dim leading-relaxed">
            No proposals yet. Submit the first one to kick off the review.
          </p>
        </div>
        {onSubmitClick && (
          <button
            onClick={onSubmitClick}
            className="mt-1 px-5 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/70 transition-all"
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
      <div className="hidden md:grid grid-cols-12 px-6 py-4 border-b border-border-soft">
        <div className="col-span-1 text-[10px] font-mono text-text-faint tracking-[0.2em]">#</div>
        <div className="col-span-5 text-[10px] font-mono text-text-faint tracking-[0.2em]">Proposal</div>
        <div className="col-span-2 text-[10px] font-mono text-text-faint tracking-[0.2em]">Program</div>
        <div className="col-span-2 text-[10px] font-mono text-text-faint tracking-[0.2em]">Amount</div>
        <div className="col-span-2 text-[10px] font-mono text-text-faint tracking-[0.2em]">Verdict</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border-soft">
        {proposals.map((p, i) => (
          <Link
            key={p.id}
            href={`/proposal/${p.id}`}
            className="group block animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Desktop */}
            <div className="hidden md:grid grid-cols-12 items-center px-6 py-5 hover:bg-bg-elev-2/40 transition-colors">
              <div className="col-span-1 font-mono text-text-faint text-sm">{p.id}</div>
              <div className="col-span-5 pr-4">
                <div className="font-body font-medium text-text text-sm group-hover:text-accent transition-colors line-clamp-1">
                  {p.title}
                </div>
                <div className="text-xs text-text-faint mt-1 line-clamp-1">{p.description}</div>
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
  );
}
