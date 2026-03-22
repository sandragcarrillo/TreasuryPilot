"use client";

import type { Council } from "@/lib/contracts/types";

const COUNCIL_COLORS = [
  { accent: "#f59e0b", cls: "council-amber", label: "amber" },
  { accent: "#3b82f6", cls: "council-blue",  label: "blue" },
  { accent: "#06b6d4", cls: "council-teal",  label: "teal" },
  { accent: "#8b5cf6", cls: "council-purple", label: "purple" },
  { accent: "#64748b", cls: "council-slate", label: "slate" },
];

interface CouncilCardProps {
  council: Council;
}

export function CouncilCard({ council }: CouncilCardProps) {
  const color = COUNCIL_COLORS[council.colorIndex % COUNCIL_COLORS.length];

  return (
    <div className={`gov-card gov-card-hover p-5 ${color.cls}`}>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-body font-semibold text-sm uppercase tracking-wider text-slate-200"
          >
            {council.name}
          </h3>
          {council.budget && (
            <span
              className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm shrink-0"
              style={{ color: color.accent, background: `${color.accent}18` }}
            >
              {council.budget}
            </span>
          )}
        </div>
        {council.focus && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
            {council.focus}
          </p>
        )}
      </div>
    </div>
  );
}

/** Parse council info from constitution text */
export function parseCouncils(constitution: string): Council[] {
  const councils: Council[] = [];
  // Match patterns like "- Growth Council: budget 150 ETH, focus on ..."
  const regex = /[-•]\s*([A-Za-z\s&]+Council)[:\s]+budget\s+([^,]+),\s*focus\s+on\s+([^\n.]+)/gi;
  let match;
  while ((match = regex.exec(constitution)) !== null) {
    councils.push({
      name: match[1].trim(),
      budget: match[2].trim(),
      focus: match[3].trim(),
      colorIndex: councils.length,
    });
  }
  // Fallback: look for "X Council" mentions
  if (councils.length === 0) {
    const simple = /([A-Za-z\s]+Council)/g;
    const seen = new Set<string>();
    while ((match = simple.exec(constitution)) !== null) {
      const name = match[1].trim();
      if (!seen.has(name)) {
        seen.add(name);
        councils.push({ name, budget: "", focus: "", colorIndex: councils.length });
      }
    }
  }
  return councils;
}
