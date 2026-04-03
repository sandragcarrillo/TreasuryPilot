"use client";

import type { Program } from "@/lib/contracts/types";

const PROGRAM_COLORS = [
  { accent: "#f59e0b", cls: "council-amber", label: "amber" },
  { accent: "#3b82f6", cls: "council-blue",  label: "blue" },
  { accent: "#06b6d4", cls: "council-teal",  label: "teal" },
  { accent: "#8b5cf6", cls: "council-purple", label: "purple" },
  { accent: "#64748b", cls: "council-slate", label: "slate" },
];

interface ProgramCardProps {
  program: Program;
}

export function ProgramCard({ program }: ProgramCardProps) {
  const color = PROGRAM_COLORS[program.colorIndex % PROGRAM_COLORS.length];

  return (
    <div className={`gov-card gov-card-hover p-5 h-full flex flex-col ${color.cls}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-body font-semibold text-sm uppercase tracking-wider text-slate-200 line-clamp-2">
          {program.name}
        </h3>
        {program.budget && (
          <span
            className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm shrink-0"
            style={{ color: color.accent, background: `${color.accent}18` }}
          >
            {program.budget}
          </span>
        )}
      </div>
      {program.focus && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mt-2">
          {program.focus}
        </p>
      )}
    </div>
  );
}

/** Parse grant program info from constitution text */
export function parsePrograms(constitution: string): Program[] {
  const programs: Program[] = [];
  // Match patterns like "- Education Program: budget $100,000 USD, focus on ..."
  // Also matches old format: "- Growth Council: budget 150 ETH, focus on ..."
  const regex = /[-•]\s*([A-Za-z\s&]+(?:Program|Council|Track))[:\s]+budget\s+([^,]+),\s*focus\s+on\s+([^\n.]+)/gi;
  let match;
  while ((match = regex.exec(constitution)) !== null) {
    programs.push({
      name: match[1].trim(),
      budget: match[2].trim(),
      focus: match[3].trim(),
      colorIndex: programs.length,
    });
  }
  // Fallback: look for "X Program" or "X Council" mentions
  if (programs.length === 0) {
    const simple = /([A-Za-z\s]+(?:Program|Council|Track))/g;
    const seen = new Set<string>();
    while ((match = simple.exec(constitution)) !== null) {
      const name = match[1].trim();
      if (!seen.has(name)) {
        seen.add(name);
        programs.push({ name, budget: "", focus: "", colorIndex: programs.length });
      }
    }
  }
  return programs;
}
