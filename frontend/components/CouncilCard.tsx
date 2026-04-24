"use client";

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

  return (
    <div className={`gov-card gov-card-hover p-6 h-full flex flex-col ${color.cls}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-sm text-text line-clamp-2 leading-snug tracking-tight">
          {program.name}
        </h3>
        {program.budget && (
          <span
            className="font-mono text-[11px] font-bold px-2 py-0.5 shrink-0"
            style={{ color: color.accent, background: `${color.accent}18` }}
          >
            {program.budget}
          </span>
        )}
      </div>
      {program.focus && (
        <p className="text-xs text-text-dim leading-relaxed line-clamp-3 mt-3">
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
