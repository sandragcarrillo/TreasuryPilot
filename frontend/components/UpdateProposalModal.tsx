"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ExternalLink, AlertTriangle } from "lucide-react";
import { useUpdateProposal } from "@/lib/hooks/useTreasuryPilot";
import { useWallet } from "@/lib/genlayer/wallet";
import type { Program, Proposal } from "@/lib/contracts/types";

interface UpdateProposalModalProps {
  proposal: Proposal;
  programs: Program[];
  defaultWindowHours?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

function formatRemaining(
  deadlineIso: string,
  defaultWindowHours: number
): { label: string; expired: boolean } {
  if (!deadlineIso) {
    return { label: `${defaultWindowHours}h window`, expired: false };
  }
  const ts = Date.parse(deadlineIso);
  if (isNaN(ts)) {
    return { label: `${defaultWindowHours}h window`, expired: false };
  }
  const now = Date.now();
  const diff = ts - now;
  if (diff <= 0) return { label: "Window closed", expired: true };
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return { label: `${days}d ${remHours}h remaining`, expired: false };
  }
  return { label: `${hours}h ${minutes}m remaining`, expired: false };
}

export function UpdateProposalModal({
  proposal,
  programs,
  defaultWindowHours = 48,
  onClose,
  onSuccess,
}: UpdateProposalModalProps) {
  const [form, setForm] = useState({
    title: proposal.title,
    description: proposal.description,
    requestedAmountUsd: proposal.requested_amount_usd,
    recipient: proposal.recipient,
    targetProgram: proposal.target_program,
    rationale: proposal.rationale,
  });
  const [txHash, setTxHash] = useState<string | null>(null);
  const { mutateAsync, isPending } = useUpdateProposal();
  const { isConnected } = useWallet();

  // Re-render every 30s so the countdown stays fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const remaining = useMemo(
    () => formatRemaining(proposal.modification_deadline, defaultWindowHours),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [proposal.modification_deadline, defaultWindowHours, /* re-eval on tick */]
  );

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (remaining.expired) return;
    try {
      const result = await mutateAsync({
        proposalId: proposal.id,
        title: form.title,
        description: form.description,
        requestedAmountUsd: form.requestedAmountUsd,
        recipient: form.recipient,
        targetProgram: form.targetProgram,
        rationale: form.rationale,
      });
      const hash = result?.data?.genlayerTxHash;
      if (typeof hash === "string") setTxHash(hash);
      onSuccess?.();
      onClose();
    } catch {}
  };

  const selectedProgram = programs.find((p) => p.name === form.targetProgram);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="gov-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-soft">
          <div>
            <h2 className="font-display text-lg text-text">Revise Proposal</h2>
            <p className="text-xs text-text-faint font-mono mt-0.5">
              Address the AI's required changes, then request a new evaluation
            </p>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-dim transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deadline banner */}
        <div
          className={`px-6 py-3 border-b text-xs flex items-center gap-2 ${
            remaining.expired
              ? "border-danger/30 bg-danger/5 text-danger"
              : "border-warning/30 bg-warning/5 text-warning"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono tracking-wide">
            Modification window · {remaining.label}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-faint">Proposal Title</label>
            <input
              className="gov-input w-full px-4 py-2.5 text-sm"
              value={form.title}
              onChange={set("title")}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-faint">Target Program</label>
              <select
                className="gov-input w-full px-4 py-2.5 text-sm appearance-none cursor-pointer"
                value={form.targetProgram}
                onChange={set("targetProgram")}
                required
              >
                <option value="">Select program...</option>
                {programs.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
              {selectedProgram?.budget && (
                <p className="text-xs text-text-faint font-mono">Budget: {selectedProgram.budget}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-faint">Requested Amount (USD)</label>
              <input
                className="gov-input w-full px-4 py-2.5 text-sm font-mono"
                value={form.requestedAmountUsd}
                onChange={set("requestedAmountUsd")}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-faint">Description</label>
            <textarea
              className="gov-input w-full px-4 py-2.5 text-sm resize-none"
              rows={3}
              value={form.description}
              onChange={set("description")}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-faint">Recipient Address</label>
            <input
              className="gov-input w-full px-4 py-2.5 text-sm font-mono"
              value={form.recipient}
              onChange={set("recipient")}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-faint">Rationale & KPIs</label>
            <textarea
              className="gov-input w-full px-4 py-2.5 text-sm resize-none"
              rows={4}
              value={form.rationale}
              onChange={set("rationale")}
              required
            />
          </div>

          <div className="rounded-xl border border-border-soft bg-bg-elev-2/40 p-3 text-xs text-text-dim leading-relaxed">
            Saving will reset the proposal to <span className="text-text">pending</span>.
            You'll then need to request a new AI evaluation (a new payment is
            required).
          </div>

          {txHash && (
            <div className="rounded border border-accent/20 bg-accent/8 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs font-mono text-accent">Saving Revision</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-text-faint font-mono">Tx:</span>
                <span className="text-xs font-mono text-text-dim truncate">{txHash}</span>
                <a
                  href={`https://explorer-studio.genlayer.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-text-faint hover:text-accent transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-border-soft">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-text-dim border border-border-soft hover:border-border hover:text-text transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !isConnected || remaining.expired}
              className="flex-1 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/70 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? "Saving…" : remaining.expired ? "Window closed" : "Save Revision"}
            </button>
          </div>

          {!isConnected && (
            <p className="text-center text-xs text-text-faint font-mono">Connect your wallet to revise this proposal.</p>
          )}
        </form>
      </div>
    </div>
  );
}
