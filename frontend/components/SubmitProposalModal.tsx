"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useSubmitProposal } from "@/lib/hooks/useTreasuryPilot";
import { useWallet } from "@/lib/genlayer/wallet";
import type { Council } from "@/lib/contracts/types";

interface SubmitProposalModalProps {
  daoId: number;
  councils: Council[];
  onClose: () => void;
  onSuccess?: () => void;
}

const EMPTY = { title: "", description: "", requestedAmount: "", recipient: "", targetCouncil: "", rationale: "" };

export function SubmitProposalModal({ daoId, councils, onClose, onSuccess }: SubmitProposalModalProps) {
  const [form, setForm] = useState(EMPTY);
  const { mutateAsync, isPending } = useSubmitProposal();
  const { address, isConnected } = useWallet();

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutateAsync({
        daoId,
        title: form.title,
        description: form.description,
        requestedAmount: form.requestedAmount,
        recipient: form.recipient || address || "",
        targetCouncil: form.targetCouncil,
        rationale: form.rationale,
      });
      onSuccess?.();
      onClose();
    } catch {}
  };

  const selectedCouncil = councils.find((c) => c.name === form.targetCouncil);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="gov-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="font-display text-lg text-slate-100">Submit Funding Proposal</h2>
            <p className="text-xs text-slate-600 font-mono mt-0.5">Official request for treasury allocation</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-widest text-slate-500">Proposal Title</label>
            <input
              className="gov-input w-full px-4 py-2.5 text-sm"
              placeholder="Brief, descriptive title"
              value={form.title}
              onChange={set("title")}
              required
            />
          </div>

          {/* Council + Amount row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-widest text-slate-500">Target Council</label>
              <select
                className="gov-input w-full px-4 py-2.5 text-sm appearance-none cursor-pointer"
                value={form.targetCouncil}
                onChange={set("targetCouncil")}
                required
              >
                <option value="">Select council...</option>
                {councils.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              {selectedCouncil?.budget && (
                <p className="text-xs text-slate-600 font-mono">Budget: {selectedCouncil.budget}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-widest text-slate-500">Requested Amount</label>
              <input
                className="gov-input w-full px-4 py-2.5 text-sm font-mono"
                placeholder="e.g. 15 ETH"
                value={form.requestedAmount}
                onChange={set("requestedAmount")}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-widest text-slate-500">Description</label>
            <textarea
              className="gov-input w-full px-4 py-2.5 text-sm resize-none"
              rows={3}
              placeholder="What will this funding accomplish?"
              value={form.description}
              onChange={set("description")}
              required
            />
          </div>

          {/* Recipient */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-widest text-slate-500">
              Recipient Address <span className="text-slate-700 normal-case">(defaults to your wallet)</span>
            </label>
            <input
              className="gov-input w-full px-4 py-2.5 text-sm font-mono"
              placeholder={address || "0x..."}
              value={form.recipient}
              onChange={set("recipient")}
            />
          </div>

          {/* Rationale */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-widest text-slate-500">Rationale & KPIs</label>
            <textarea
              className="gov-input w-full px-4 py-2.5 text-sm resize-none"
              rows={4}
              placeholder="Why should this be funded? What are the measurable outcomes and success metrics?"
              value={form.rationale}
              onChange={set("rationale")}
              required
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-mono uppercase tracking-widest text-slate-500 border border-slate-700 hover:border-slate-600 hover:text-slate-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !isConnected}
              className="flex-1 py-2.5 text-sm font-mono uppercase tracking-widest text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Submitting..." : "Submit Proposal"}
            </button>
          </div>

          {!isConnected && (
            <p className="text-center text-xs text-slate-600 font-mono">Connect your wallet to submit proposals.</p>
          )}
        </form>
      </div>
    </div>
  );
}
