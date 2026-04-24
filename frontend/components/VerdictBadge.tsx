"use client";

import { useEffect, useState } from "react";
import type { Proposal } from "@/lib/contracts/types";

type Recommendation = Proposal["recommendation"];
type Status = Proposal["status"];

const VERDICT_CONFIG: Record<string, { label: string; color: string; glowClass: string; border: string; bg: string }> = {
  approve: {
    label: "Approved",
    color: "#7FE5B0",
    glowClass: "verdict-glow-approve",
    border: "border-accent/50",
    bg: "bg-accent/10",
  },
  reject: {
    label: "Rejected",
    color: "#E57373",
    glowClass: "verdict-glow-reject",
    border: "border-danger/50",
    bg: "bg-danger/10",
  },
  modify: {
    label: "Modify",
    color: "#E5C07B",
    glowClass: "verdict-glow-modify",
    border: "border-warning/50",
    bg: "bg-warning/10",
  },
  pending: {
    label: "Pending",
    color: "#5C6360",
    glowClass: "",
    border: "border-border-soft",
    bg: "bg-bg-elev-2/40",
  },
  auto_approved: {
    label: "Auto-approved",
    color: "#7FE5B0",
    glowClass: "",
    border: "border-accent/50",
    bg: "bg-accent/8",
  },
  vetoed: {
    label: "Vetoed",
    color: "#A78BFA",
    glowClass: "",
    border: "border-vetoed/50",
    bg: "bg-vetoed/10",
  },
};

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
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${config.border} ${config.bg}`}
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
          px-10 py-5 rounded-2xl border-2
          font-medium tracking-tight
          text-3xl md:text-4xl
          ${config.border} ${config.bg}
          ${config.glowClass}
          ${animate && visible ? "verdict-stamp" : "opacity-0"}
        `}
        style={{ color: config.color }}
      >
        <span className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: config.color }} />
        <span className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: config.color }} />
        <span className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: config.color }} />
        <span className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: config.color }} />
        {config.label}
      </div>
      {key === "pending" && (
        <p className="text-[11px] text-text-faint">Awaiting evaluation</p>
      )}
    </div>
  );
}
