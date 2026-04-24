"use client";

import Link from "next/link";
import type { Organization } from "@/lib/contracts/types";

interface OrgCardProps {
  org: Organization;
  animationDelay?: number;
}

export function OrgCard({ org, animationDelay = 0 }: OrgCardProps) {
  return (
    <Link
      href={`/org/${org.id}`}
      className="group gov-card gov-card-hover p-6 h-full flex flex-col animate-fade-in"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Title row — reserves 2-line height so all cards align */}
      <div className="flex items-start justify-between gap-3 mb-3 min-h-14">
        <h3 className="text-lg md:text-xl font-medium text-text group-hover:text-accent transition-colors leading-snug line-clamp-2 tracking-tight">
          {org.name}
        </h3>
        <span className="text-[11px] text-text-dim border border-border-soft rounded-full px-2.5 py-0.5 shrink-0 whitespace-nowrap">
          {org.proposal_count} {org.proposal_count === 1 ? "proposal" : "proposals"}
        </span>
      </div>
      <p className="text-[11px] text-text-faint font-mono mb-4 truncate" title={org.owner}>
        Owner · {org.owner.slice(0, 10)}…{org.owner.slice(-6)}
      </p>
      {/* Description — reserves 3-line height */}
      <p className="text-sm text-text-dim leading-relaxed line-clamp-3 flex-1 min-h-15">
        {org.constitution.slice(0, 200)}…
      </p>
      {/* Footer — always present so the card ends at a consistent row */}
      <div className="mt-4 pt-4 border-t border-border-soft min-h-9 flex items-center">
        {org.auto_approve_enabled ? (
          <span className="text-[11px] text-accent/90">
            Auto-approve up to ${parseFloat(org.auto_approve_threshold_usd).toLocaleString()}
          </span>
        ) : (
          <span className="text-[11px] text-text-faint">Manual review</span>
        )}
      </div>
    </Link>
  );
}
