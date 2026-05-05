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

/** Parse grant program info from constitution text */
export function parsePrograms(constitution: string): Program[] {
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

  // Primary: bullet + name + budget + focus.
  // Bullets: -, •, *, · (middle dot). Name must be short (≤ 60 chars) and end
  // in Program / Council / Track. Budget capture is non-greedy so commas inside
  // "$120,000 USD" don't terminate it early.
  const primary =
    /^[\s]*[-•*·]\s*([A-Za-z][A-Za-z0-9\s&\-/]{1,58}(?:Program|Council|Track))\b[:\s]+budget\s+(.+?),\s*focus\s+on\s+([^\n.]+)/gim;
  let m: RegExpExecArray | null;
  while ((m = primary.exec(constitution)) !== null) {
    push(m[1], m[2], m[3]);
  }

  if (programs.length > 0) return programs;

  // Fallback: only accept lines that START with a bullet, where the name is
  // short and ends in Program/Council/Track. Avoids matching arbitrary mid-sentence
  // mentions like "...emerging researchers Grant Programs".
  const fallback =
    /^[\s]*[-•*·]\s*([A-Za-z][A-Za-z0-9\s&\-/]{1,40}(?:Program|Council|Track))\b/gim;
  while ((m = fallback.exec(constitution)) !== null) {
    push(m[1], "", "");
  }

  return programs;
}
