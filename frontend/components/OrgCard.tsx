"use client";

import Link from "next/link";
import type { Organization } from "@/lib/contracts/types";

interface OrgCardProps {
  org: Organization;
  animationDelay?: number;
}

/**
 * Strip a single line of common markdown decorations (heading markers,
 * bold, leading bullet, leading/trailing pipe-table cells).
 */
function cleanLine(s: string): string {
  return s
    .replace(/^[\s]*[-•*·]\s+/, "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*\*/, "")
    .replace(/\*\*$/, "")
    .replace(/\*\*/g, "")
    .replace(/^\|\s*/, "")
    .replace(/\s*\|$/, "")
    .trim();
}

function isHeadingLine(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (/^#{1,6}\s+/.test(t)) return true;
  if (/^\*\*.+\*\*\s*$/.test(t)) return true;
  if (/^[A-Z0-9 &/()\-]+:?$/.test(t) && t.length > 2 && t.length < 80) return true;
  return false;
}

/**
 * Extract a short, readable summary from an org's constitution. Tries (in
 * priority): an inline "MISSION: …" label, the first substantial paragraph
 * after a "Mission" heading, the first substantial paragraph anywhere, and
 * finally just the cleaned first chunk of text.
 */
function extractOrgSummary(constitution: string, maxChars = 200): string {
  if (!constitution) return "";
  const lines = constitution.split("\n");
  const truncate = (s: string) =>
    s.length > maxChars ? s.slice(0, maxChars).trim() + "…" : s;
  const isMetadataLabel = (c: string) =>
    /^[A-Za-z][A-Za-z &]{1,30}\s*:\s*\S/.test(c) && c.length < 80;

  // 1. Inline label form: "MISSION: body" (placeholder template uses this).
  for (const raw of lines) {
    const cleaned = cleanLine(raw);
    const m = cleaned.match(/^Mission(?:\s+Statement)?\s*:\s*(.+)$/i);
    if (m && m[1].trim().length >= 10) return truncate(m[1].trim());
  }

  // 2. "Mission" heading + first substantial paragraph below.
  for (let i = 0; i < lines.length; i++) {
    const cleaned = cleanLine(lines[i]);
    if (!cleaned) continue;
    if (!/\bmission\b/i.test(cleaned)) continue;
    if (cleaned.length > 60) continue;
    if (!isHeadingLine(lines[i])) continue;
    for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
      const c = cleanLine(lines[j]);
      if (!c || c.length < 30) continue;
      if (isHeadingLine(lines[j])) continue;
      if (isMetadataLabel(c)) continue;
      return truncate(c);
    }
  }

  // 3. First substantial non-heading paragraph anywhere.
  for (const raw of lines) {
    const c = cleanLine(raw);
    if (!c || c.length < 30) continue;
    if (isHeadingLine(raw)) continue;
    if (isMetadataLabel(c)) continue;
    return truncate(c);
  }

  // 4. Fallback: stripped first chunk of text.
  const stripped = lines.map(cleanLine).filter(Boolean).join(" ");
  return truncate(stripped);
}

export function OrgCard({ org, animationDelay = 0 }: OrgCardProps) {
  const summary = extractOrgSummary(org.constitution);
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
        {summary || "No summary available."}
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
