"use client";

import { useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { useSubmitProposal } from "@/lib/hooks/useTreasuryPilot";
import { useWallet } from "@/lib/genlayer/wallet";
import type { Program } from "@/lib/contracts/types";

interface SubmitProposalModalProps {
  orgId: number;
  programs: Program[];
  onClose: () => void;
  onSuccess?: () => void;
}

const EMPTY = { title: "", description: "", requestedAmountUsd: "", recipient: "", targetProgram: "", rationale: "" };

export function SubmitProposalModal({ orgId, programs, onClose, onSuccess }: SubmitProposalModalProps) {
  const [form, setForm] = useState(EMPTY);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { mutateAsync, isPending } = useSubmitProposal();
  const { address, isConnected } = useWallet();

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutateAsync({
        orgId,
        title: form.title,
        description: form.description,
        requestedAmountUsd: form.requestedAmountUsd,
        recipient: form.recipient || address || "",
        targetProgram: form.targetProgram,
        rationale: form.rationale,
        onSubmitted: (hash) => setTxHash(hash),
      });
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
            <h2 className="font-display text-lg text-text">Submit Grant Proposal</h2>
            <p className="text-xs text-text-faint font-mono mt-0.5">Official request for grant allocation</p>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-dim transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-faint">Proposal Title</label>
            <input
              className="gov-input w-full px-4 py-2.5 text-sm"
              placeholder="Brief, descriptive title"
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
                placeholder="e.g. 15000"
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
              placeholder="What will this grant accomplish?"
              value={form.description}
              onChange={set("description")}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-faint">
              Recipient Address <span className="text-text-faint normal-case">(defaults to your wallet)</span>
            </label>
            <input
              className="gov-input w-full px-4 py-2.5 text-sm font-mono"
              placeholder={address || "0x..."}
              value={form.recipient}
              onChange={set("recipient")}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-faint">Rationale & KPIs</label>
            <textarea
              className="gov-input w-full px-4 py-2.5 text-sm resize-none"
              rows={4}
              placeholder="Why should this be funded? What are the measurable outcomes and success metrics?"
              value={form.rationale}
              onChange={set("rationale")}
              required
            />
          </div>

          {txHash && (
            <div className="rounded border border-accent/20 bg-accent/8 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs font-mono text-accent">AI Validators Deliberating</span>
              </div>
              <p className="text-xs text-text-dim">Consensus takes 5–15 minutes. You can close this modal — your proposal will appear once validators agree.</p>
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
              className="flex-1 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/70 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? "Submitting…" : "Submit Proposal"}
            </button>
          </div>

          {!isConnected && (
            <p className="text-center text-xs text-text-faint font-mono">Connect your wallet to submit proposals.</p>
          )}
        </form>
      </div>
    </div>
  );
}
