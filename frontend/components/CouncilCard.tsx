"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Program } from "@/lib/contracts/types";

const PROGRAM_COLORS = [
  { accent: "#7FE5B0", cls: "council-teal",  label: "accent" },
  { accent: "#E5C07B", cls: "council-amber", label: "warning" },
  { accent: "#A78BFA", cls: "council-purple", label: "vetoed" },
  { accent: "#8E9793", cls: "council-blue",  label: "dim" },
  { accent: "#5C6360", cls: "council-slate", label: "faint" },
];

interface ProgramCardProps {
  program: Program;
}

export function ProgramCard({ program }: ProgramCardProps) {
  const color = PROGRAM_COLORS[program.colorIndex % PROGRAM_COLORS.length];
  const [expanded, setExpanded] = useState(false);
  const hasFocus = !!program.focus?.trim();
  const expandable = hasFocus || program.name.length > 40;

  return (
    <div
      className={`gov-card ${
        expandable ? "gov-card-hover cursor-pointer" : ""
      } p-6 h-full flex flex-col ${color.cls}`}
      onClick={() => expandable && setExpanded((v) => !v)}
      role={expandable ? "button" : undefined}
      aria-expanded={expandable ? expanded : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          className={`font-medium text-sm text-text leading-snug tracking-tight ${
            expanded ? "" : "line-clamp-2"
          }`}
        >
          {program.name}
        </h3>
        {program.budget && (
          <span
            className="font-mono text-[11px] font-bold px-2.5 py-1 shrink-0 rounded-full"
            style={{ color: color.accent, background: `${color.accent}18` }}
          >
            {program.budget}
          </span>
        )}
      </div>
      {hasFocus && (
        <p
          className={`text-xs text-text-dim leading-relaxed mt-3 ${
            expanded ? "" : "line-clamp-3"
          }`}
        >
          {program.focus}
        </p>
      )}
      {expandable && (
        <div className="mt-auto pt-3 flex items-center justify-end gap-1.5 text-text-faint">
          <span className="text-[10px] font-mono tracking-[0.2em]">
            {expanded ? "collapse" : "read more"}
          </span>
          {expanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Strip markdown decorations (leading `#` heading markers, `**` bold,
 * leading bullet, and pipe-table cells) from a single line so we can match
 * its structural intent regardless of how the user formatted it.
 *
 * Pipe-table rows are normalised:
 *   "| Annual budget | $1,000 USD |"  → "Annual budget: $1,000 USD"
 *   "|---|---|"                       → ""  (separator row)
 *   "| a | b | c |"                   → "a — b — c"
 */
function cleanLine(raw: string): string {
  let s = raw
    .replace(/^[\s]*[-•*·]\s+/, "")     // leading bullet
    .replace(/^#{1,6}\s+/, "")           // leading ATX heading
    .replace(/^\*\*/, "")                // leading bold
    .replace(/\*\*$/, "")                // trailing bold
    .replace(/\*\*/g, "")                // any remaining bold markers
    .trim();

  if (/^\|.*\|$/.test(s)) {
    // Drop separator rows like "|---|---|".
    if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(s)) return "";
    const cells = s
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length === 2) {
      // Treat 2-column rows as label:value (matches the common
      // metadata-table style in constitutions).
      s = `${cells[0]}: ${cells[1]}`;
    } else if (cells.length > 0) {
      s = cells.join(" — ");
    } else {
      s = "";
    }
  }
  return s;
}

/**
 * In a section's lines, find the first line that looks like
 * "<label>: <value>" (case-insensitive, after markdown stripping) and
 * return the value. Empty string if not found.
 */
function findField(sectionLines: string[], labelRe: RegExp): string {
  for (const raw of sectionLines) {
    const cleaned = cleanLine(raw);
    const re = new RegExp(`^${labelRe.source}\\s*:\\s*(.+)$`, "i");
    const m = cleaned.match(re);
    if (m && m[1].trim()) return m[1].trim();
  }
  return "";
}

/**
 * Try a list of label regexes in priority order; return the first match's
 * value. Used to find a "description-like" field across constitutions that
 * may label it Focus / Description / Goal / Eligibility / etc.
 */
function findFirstField(sectionLines: string[], labels: RegExp[]): string {
  for (const label of labels) {
    const v = findField(sectionLines, label);
    if (v) return v;
  }
  return "";
}

/**
 * Parse grant program info from constitution text. Supports two formats:
 *
 *  1. Section format (markdown-style):
 *
 *     ### Program 1: Community Education & Content
 *     Annual budget: $1,000 USD
 *     **Focus:** Original public content...
 *
 *  2. Single-line bullet format (legacy):
 *
 *     - Education Council: budget 100 ETH, focus on workshops, tutorials...
 *
 * Returns an empty array if no programs are detected (rather than guessing
 * based on stray "Program" mentions in unrelated bullets).
 */
export function parsePrograms(constitution: string): Program[] {
  const lines = constitution.split("\n");

  // Pass 1 — find program section headings.
  // A line counts as a heading if (after stripping #/** markers) it matches
  //   "Program <id>: <name>"  or  "Program <id> - <name>"  etc.
  const headingRe = /^Program\s+(?:[A-Za-z0-9]+|\d+(?:\.\d+)?)\s*[:.\-–—]\s*(.+)$/i;
  const headings: { idx: number; name: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cleaned = cleanLine(lines[i]);
    const m = cleaned.match(headingRe);
    if (!m) continue;
    const name = m[1].trim();
    if (name && name.length > 0 && name.length <= 80) {
      headings.push({ idx: i, name });
    }
  }

  if (headings.length > 0) {
    const programs: Program[] = [];
    const seen = new Set<string>();
    // Labels we recognise as "what this program is about", in priority order.
    const descriptionLabels = [
      /Focus/,
      /Description/,
      /About/,
      /Goal/,
      /Purpose/,
      /Eligibility/,
      /Scope/,
    ];
    // Lines that are *structural metadata*, not a description. Used to skip
    // them when falling back to "first substantive paragraph".
    const skipForFallback =
      /^(?:type|annual\s+budget|budget|typical\s+grant\s+size|payment|payouts?|distribution\s+requirement|out\s+of\s+scope|required\s+kpis?|responsible\s+disclosure|relationship\s+disclosure)\s*:/i;

    for (let p = 0; p < headings.length; p++) {
      const start = headings[p].idx + 1;
      const end =
        p + 1 < headings.length ? headings[p + 1].idx : lines.length;
      const sectionLines = lines.slice(start, end);

      // Budget keyword: "Annual budget" or just "Budget".
      const budget = findField(sectionLines, /(?:Annual\s+)?Budget/);

      // Description: try labelled fields in priority order, then fall back
      // to the first substantive paragraph that isn't a metadata field.
      let focus = findFirstField(sectionLines, descriptionLabels);
      if (!focus) {
        for (const raw of sectionLines) {
          const cleaned = cleanLine(raw);
          if (!cleaned) continue;
          if (cleaned.length < 30) continue;
          if (skipForFallback.test(cleaned)) continue;
          // Skip short label-style "Foo: bar" metadata.
          if (/^[A-Za-z][A-Za-z &]{1,30}\s*:\s*\S/.test(cleaned) && cleaned.length < 80) continue;
          focus = cleaned;
          break;
        }
      }

      const key = headings[p].name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      programs.push({
        name: headings[p].name,
        budget,
        focus,
        colorIndex: programs.length,
      });
    }
    if (programs.length > 0) return programs;
  }

  // Legacy single-line bullet format:
  //   - Growth Council: budget 150 ETH, focus on user acquisition…
  const programs: Program[] = [];
  const seen = new Set<string>();
  const push = (name: string, budget: string, focus: string) => {
    const clean = name.trim();
    if (!clean || seen.has(clean.toLowerCase())) return;
    seen.add(clean.toLowerCase());
    programs.push({
      name: clean,
      budget: budget.trim(),
      focus: focus.trim(),
      colorIndex: programs.length,
    });
  };

  const primary =
    /^[\s]*[-•*·]\s*([A-Za-z][A-Za-z0-9\s&\-/]{1,58}(?:Program|Council|Track))\b[:\s]+budget\s+(.+?),\s*focus\s+on\s+([^\n.]+)/gim;
  let m: RegExpExecArray | null;
  while ((m = primary.exec(constitution)) !== null) {
    push(m[1], m[2], m[3]);
  }

  return programs;
}
