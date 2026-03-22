"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Scroll } from "lucide-react";

interface ConstitutionViewerProps {
  constitution: string;
  daoName?: string;
}

export function ConstitutionViewer({ constitution, daoName }: ConstitutionViewerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="gov-card">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Scroll className="w-4 h-4 text-cyan-500 shrink-0" />
          <span className="text-sm font-body font-medium text-slate-300 tracking-wide">
            {daoName ? `${daoName} — Constitution` : "DAO Constitution"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <span className="text-xs font-mono uppercase tracking-widest">
            {expanded ? "collapse" : "read"}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-800">
          <pre className="constitution-block p-5 whitespace-pre-wrap overflow-auto max-h-96">
            {constitution}
          </pre>
        </div>
      )}
    </div>
  );
}
