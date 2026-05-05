"use client";

import { useState } from "react";
import { Gavel, X } from "lucide-react";
import {
  useSetHumanDecision,
  useSetReportHumanDecision,
} from "@/lib/hooks/useTreasuryPilot";
import { AddressDisplay } from "@/components/AddressDisplay";
import type { HumanReportAction, HumanVerdict } from "@/lib/contracts/types";

const VERDICT_OPTIONS: { value: HumanVerdict; label: string; cls: string }[] = [
  { value: "approved", label: "Approve", cls: "text-accent border-accent/40 hover:bg-accent/10 hover:border-accent/70" },
  { value: "rejected", label: "Reject", cls: "text-danger border-danger/40 hover:bg-danger/10 hover:border-danger/70" },
  { value: "modify", label: "Needs modification", cls: "text-warning border-warning/40 hover:bg-warning/10 hover:border-warning/70" },
];

const VERDICT_LABEL: Record<HumanVerdict, string> = {
  "": "—",
  approved: "Approved",
  rejected: "Rejected",
  modify: "Needs modification",
};

const ACTION_OPTIONS: { value: HumanReportAction; label: string; cls: string }[] = [
  { value: "continue_funding", label: "Continue funding", cls: "text-accent border-accent/40 hover:bg-accent/10 hover:border-accent/70" },
  { value: "pause_pending_clarification", label: "Pause pending clarification", cls: "text-warning border-warning/40 hover:bg-warning/10 hover:border-warning/70" },
  { value: "claw_back", label: "Claw back", cls: "text-danger border-danger/40 hover:bg-danger/10 hover:border-danger/70" },
  { value: "terminate", label: "Terminate", cls: "text-danger border-danger/40 hover:bg-danger/10 hover:border-danger/70" },
];

const ACTION_LABEL: Record<HumanReportAction, string> = {
  "": "—",
  continue_funding: "Continue funding",
  pause_pending_clarification: "Pause pending clarification",
  claw_back: "Claw back",
  terminate: "Terminate",
};

interface ProposalHumanDecisionPanelProps {
  proposalId: number;
  current: {
    verdict: HumanVerdict;
    reason: string;
    decided_at: string;
    decided_by: string;
  };
}

export function ProposalHumanDecisionPanel({
  proposalId,
  current,
}: ProposalHumanDecisionPanelProps) {
  const [reason, setReason] = useState(current.reason || "");
  const [picked, setPicked] = useState<HumanVerdict>(current.verdict);
  const { mutateAsync, isPending } = useSetHumanDecision();

  const dirty =
    picked !== current.verdict ||
    (picked !== "" && reason.trim() !== (current.reason || "").trim());

  const handleSubmit = async () => {
    if (!picked) return;
    try {
      await mutateAsync({ proposalId, verdict: picked, reason: reason.trim() });
    } catch {}
  };

  const handleClear = async () => {
    if (!current.verdict) {
      setPicked("");
      setReason("");
      return;
    }
    try {
      await mutateAsync({ proposalId, verdict: "", reason: "" });
      setPicked("");
      setReason("");
    } catch {}
  };

  return (
    <div className="gov-card p-6 md:p-8 space-y-5">
      <div className="flex items-center gap-2.5 border-b border-border-soft pb-4">
        <Gavel className="w-4 h-4 text-accent" />
        <h3 className="text-[11px] font-mono tracking-[0.25em] text-text-dim">
          Human Decision
        </h3>
      </div>

      {current.verdict ? (
        <div className="rounded-xl border border-border-soft bg-bg-elev-2/40 p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-mono tracking-[0.25em] text-text-faint uppercase">
              Current decision
            </span>
            <button
              onClick={handleClear}
              disabled={isPending}
              className="text-[10px] font-mono tracking-[0.2em] text-text-faint hover:text-danger disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
          <div className="text-lg font-medium text-text">
            {VERDICT_LABEL[current.verdict]}
          </div>
          {current.reason && (
            <p className="text-sm text-text-dim leading-relaxed">{current.reason}</p>
          )}
          <div className="flex items-center gap-2 pt-2 text-[11px] font-mono text-text-faint">
            <span>By</span>
            <AddressDisplay address={current.decided_by} className="text-text-dim" showCopy />
            {current.decided_at && (
              <>
                <span className="text-text-faint/40">·</span>
                <span>{new Date(current.decided_at).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-text-faint">
          No human decision recorded yet. Override the AI verdict by selecting
          one below.
        </p>
      )}

      <div className="space-y-3">
        <span className="text-[10px] font-mono tracking-[0.25em] text-text-faint uppercase">
          {current.verdict ? "Update decision" : "Set decision"}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {VERDICT_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setPicked(o.value)}
              className={`px-3 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] border transition-all ${o.cls} ${
                picked === o.value ? "bg-bg-elev-2 ring-1 ring-current/30" : ""
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <textarea
          className="gov-input w-full px-3 py-2.5 text-sm resize-none"
          rows={3}
          placeholder="Reason (optional but encouraged — visible publicly)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSubmit}
            disabled={!picked || isPending || !dirty}
            className="px-5 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] bg-accent text-bg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Saving…" : "Save Decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ReportHumanDecisionPanelProps {
  proposalId: number;
  reportNumber: number;
  current: {
    action: HumanReportAction;
    reason: string;
    decided_at: string;
    decided_by: string;
  };
}

export function ReportHumanDecisionPanel({
  proposalId,
  reportNumber,
  current,
}: ReportHumanDecisionPanelProps) {
  const [reason, setReason] = useState(current.reason || "");
  const [picked, setPicked] = useState<HumanReportAction>(current.action);
  const { mutateAsync, isPending } = useSetReportHumanDecision();

  const dirty =
    picked !== current.action ||
    (picked !== "" && reason.trim() !== (current.reason || "").trim());

  const handleSubmit = async () => {
    if (!picked) return;
    try {
      await mutateAsync({ proposalId, reportNumber, action: picked, reason: reason.trim() });
    } catch {}
  };

  const handleClear = async () => {
    if (!current.action) {
      setPicked("");
      setReason("");
      return;
    }
    try {
      await mutateAsync({ proposalId, reportNumber, action: "", reason: "" });
      setPicked("");
      setReason("");
    } catch {}
  };

  return (
    <div className="border-t border-border-soft pt-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <Gavel className="w-3.5 h-3.5 text-accent" />
        <span className="text-[10px] font-mono tracking-[0.25em] text-text-faint uppercase">
          Human Decision
        </span>
      </div>

      {current.action && (
        <div className="rounded-xl border border-border-soft bg-bg-elev-2/40 p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-text">
              {ACTION_LABEL[current.action]}
            </div>
            <button
              onClick={handleClear}
              disabled={isPending}
              className="text-[10px] font-mono tracking-[0.2em] text-text-faint hover:text-danger disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
          {current.reason && (
            <p className="text-xs text-text-dim leading-relaxed">{current.reason}</p>
          )}
          <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-text-faint">
            <span>By</span>
            <AddressDisplay address={current.decided_by} className="text-text-dim" showCopy />
            {current.decided_at && (
              <>
                <span className="text-text-faint/40">·</span>
                <span>{new Date(current.decided_at).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {ACTION_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setPicked(o.value)}
              className={`px-3 py-2 rounded-xl text-[10px] font-mono tracking-[0.2em] border transition-all ${o.cls} ${
                picked === o.value ? "bg-bg-elev-2 ring-1 ring-current/30" : ""
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <textarea
          className="gov-input w-full px-3 py-2 text-xs resize-none"
          rows={2}
          placeholder="Reason (optional, public)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!picked || isPending || !dirty}
            className="px-4 py-2 rounded-xl text-[10px] font-mono tracking-[0.2em] bg-accent text-bg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Saving…" : "Save Decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Display pills (for read-only consumption) ──────────────────────────────

const VERDICT_PILL_CLS: Record<Exclude<HumanVerdict, "">, string> = {
  approved: "text-accent border-accent/40 bg-accent/10",
  rejected: "text-danger border-danger/40 bg-danger/10",
  modify: "text-warning border-warning/40 bg-warning/10",
};

const ACTION_PILL_CLS: Record<Exclude<HumanReportAction, "">, string> = {
  continue_funding: "text-accent border-accent/40 bg-accent/10",
  pause_pending_clarification: "text-warning border-warning/40 bg-warning/10",
  claw_back: "text-danger border-danger/40 bg-danger/10",
  terminate: "text-danger border-danger/40 bg-danger/10",
};

export function HumanVerdictPill({ verdict }: { verdict: HumanVerdict }) {
  if (!verdict) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.15em] px-2.5 py-0.5 rounded-full border uppercase ${VERDICT_PILL_CLS[verdict]}`}
      title="Org's final human verdict"
    >
      <Gavel className="w-2.5 h-2.5" />
      Human · {VERDICT_LABEL[verdict]}
    </span>
  );
}

export function HumanActionPill({ action }: { action: HumanReportAction }) {
  if (!action) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.15em] px-2.5 py-0.5 rounded-full border ${ACTION_PILL_CLS[action]}`}
      title="Org's final human action on this report"
    >
      <Gavel className="w-2.5 h-2.5" />
      Human · {ACTION_LABEL[action]}
    </span>
  );
}
