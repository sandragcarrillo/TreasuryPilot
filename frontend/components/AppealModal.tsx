"use client";

import { useState } from "react";
import { X, ExternalLink, Gavel } from "lucide-react";
import { useFileAppeal } from "@/lib/hooks/useTreasuryPilot";
import { useWallet } from "@/lib/genlayer/wallet";
import type { Program, Proposal } from "@/lib/contracts/types";

interface AppealModalProps {
  proposal: Proposal;
  programs: Program[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function AppealModal({
  proposal,
  programs,
  onClose,
  onSuccess,
}: AppealModalProps) {
  const [form, setForm] = useState({
    appealText: "",
    title: proposal.title,
    description: proposal.description,
    requestedAmountUsd: proposal.requested_amount_usd,
    recipient: proposal.recipient,
    targetProgram: proposal.target_program,
    rationale: proposal.rationale,
  });
  const [txHash, setTxHash] = useState<string | null>(null);
  const { mutateAsync, isPending } = useFileAppeal();
  const { isConnected } = useWallet();

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
    try {
      const result = await mutateAsync({
        proposalId: proposal.id,
        appealText: form.appealText,
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

  // Advisory countdown.
  const ts = proposal.appeal_deadline ? Date.parse(proposal.appeal_deadline) : NaN;
  const isLate = !isNaN(ts) && ts < Date.now();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="gov-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-soft">
          <div className="flex items-center gap-2.5">
            <Gavel className="w-4 h-4 text-warning" />
            <div>
              <h2 className="font-display text-lg text-text">File Appeal</h2>
              <p className="text-xs text-text-faint font-mono mt-0.5">
                Revise your proposal and explain why it deserves human review
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-dim transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLate && (
          <div className="px-6 py-3 border-b border-warning/30 bg-warning/5 text-xs text-warning">
            The advisory appeal window has passed. The org owner can still
            choose to review your appeal — but acceptance is at their
            discretion.
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-faint">
              Why should this be reconsidered?
            </label>
            <textarea
              className="gov-input w-full px-4 py-2.5 text-sm resize-none"
              rows={4}
              placeholder="Explain what changed, what was misunderstood, or why the AI's reasoning shouldn't apply here. Visible to the org owner."
              value={form.appealText}
              onChange={set("appealText")}
              required
            />
          </div>

          <div className="border-t border-border-soft pt-5 space-y-5">
            <div className="text-[11px] font-mono tracking-[0.2em] text-text-faint">
              Revised proposal
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-faint">Title</label>
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
          </div>

          <div className="rounded-xl border border-border-soft bg-bg-elev-2/40 p-3 text-xs text-text-dim leading-relaxed">
            Filing an appeal does <span className="text-warning">not</span>{" "}
            trigger a new AI evaluation. The org owner reviews directly via
            the Human Decision panel.
          </div>

          {txHash && (
            <div className="rounded border border-accent/20 bg-accent/8 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs font-mono text-accent">Recording Appeal</span>
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
              disabled={isPending || !isConnected}
              className="flex-1 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-warning border border-warning/40 hover:bg-warning/10 hover:border-warning/70 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? "Filing…" : "File Appeal"}
            </button>
          </div>

          {!isConnected && (
            <p className="text-center text-xs text-text-faint font-mono">
              Connect your wallet to file an appeal.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
