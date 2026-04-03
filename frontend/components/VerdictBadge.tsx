"use client";

import { useEffect, useState } from "react";
import type { Proposal } from "@/lib/contracts/types";

type Recommendation = Proposal["recommendation"];
type Status = Proposal["status"];

const VERDICT_CONFIG: Record<string, { label: string; color: string; glowClass: string; border: string; bg: string }> = {
  approve: {
    label: "APPROVED",
    color: "#10b981",
    glowClass: "verdict-glow-approve",
    border: "border-emerald-500/60",
    bg: "bg-emerald-950/40",
  },
  reject: {
    label: "REJECTED",
    color: "#ef4444",
    glowClass: "verdict-glow-reject",
    border: "border-red-500/60",
    bg: "bg-red-950/40",
  },
  modify: {
    label: "MODIFY",
    color: "#f59e0b",
    glowClass: "verdict-glow-modify",
    border: "border-amber-500/60",
    bg: "bg-amber-950/40",
  },
  pending: {
    label: "PENDING",
    color: "#475569",
    glowClass: "",
    border: "border-slate-600/40",
    bg: "bg-slate-900/40",
  },
  auto_approved: {
    label: "AUTO-APPROVED",
    color: "#06b6d4",
    glowClass: "",
    border: "border-cyan-500/60",
    bg: "bg-cyan-950/40",
  },
  vetoed: {
    label: "VETOED",
    color: "#a78bfa",
    glowClass: "",
    border: "border-purple-500/60",
    bg: "bg-purple-950/40",
  },
};

/** Pick the right verdict key: status overrides recommendation for special cases */
function getVerdictKey(recommendation: Recommendation, status?: Status): string {
  if (status === "vetoed") return "vetoed";
  if (status === "auto_approved") return "auto_approved";
  return recommendation;
}

interface VerdictBadgeProps {
  recommendation: Recommendation;
  status?: Status;
  size?: "sm" | "lg";
  animate?: boolean;
}

export function VerdictBadge({ recommendation, status, size = "lg", animate = true }: VerdictBadgeProps) {
  const [visible, setVisible] = useState(false);
  const key = getVerdictKey(recommendation, status);
  const config = VERDICT_CONFIG[key] ?? VERDICT_CONFIG.pending;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, [recommendation, status]);

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 border font-mono text-xs font-bold tracking-widest uppercase ${config.border} ${config.bg}`}
        style={{ color: config.color }}
      >
        {config.label}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`
          relative inline-flex items-center justify-center
          px-10 py-5 border-2
          font-mono font-black tracking-[0.25em] uppercase
          text-3xl md:text-4xl
          ${config.border} ${config.bg}
          ${config.glowClass}
          ${animate && visible ? "verdict-stamp" : "opacity-0"}
        `}
        style={{ color: config.color }}
      >
        {/* Corner marks */}
        <span className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: config.color }} />
        <span className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: config.color }} />
        <span className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: config.color }} />
        <span className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: config.color }} />
        {config.label}
      </div>
      {key === "pending" && (
        <p className="text-xs text-slate-500 tracking-wider uppercase font-mono">Awaiting evaluation</p>
      )}
    </div>
  );
}
