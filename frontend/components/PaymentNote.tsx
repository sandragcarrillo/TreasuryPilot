"use client";

import { formatUsdcCost, type PaidRouteId } from "@/lib/payment/prices";

interface PaymentNoteProps {
  routeId: PaidRouteId;
  variant?: "block" | "inline";
  className?: string;
}

export function PaymentNote({ routeId, variant = "block", className = "" }: PaymentNoteProps) {
  const cost = formatUsdcCost(routeId);

  if (variant === "inline") {
    return (
      <span
        className={`text-[10px] font-mono tracking-[0.2em] text-text-faint ${className}`}
      >
        Cost <span className="text-text-dim">{cost}</span>
      </span>
    );
  }

  return (
    <div
      className={`rounded-xl border border-border-soft/70 bg-bg/40 px-4 py-3 flex items-start gap-3 ${className}`}
    >
      <span className="text-[10px] font-mono tracking-[0.25em] text-text-faint mt-0.5 shrink-0">
        NOTE
      </span>
      <p className="text-xs text-text-dim leading-relaxed">
        This action costs <span className="font-mono text-text">{cost}</span>. Your
        wallet will open to authorize the payment before submission.
      </p>
    </div>
  );
}
