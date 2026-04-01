"use client";

import { useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { useCreateOrg } from "@/lib/hooks/useTreasuryPilot";
import { useWallet } from "@/lib/genlayer/wallet";

interface CreateOrgModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const PLACEHOLDER_CONSTITUTION = `This organization manages a grants program dedicated to [your mission].

MISSION: [Describe the organization's core purpose]

GRANT PROGRAMS:

- [Program Name]: budget $[X] USD, focus on [description].
- [Program Name]: budget $[X] USD, focus on [description].

ALLOCATION RULES:
1. Maximum single grant: $[X] USD
2. Proposals must target a specific program
3. All recipients must have prior relevant contributions

RISK GUIDELINES:
- Reject proposals without clear deliverables and timelines
- Prefer milestone-based payment structures

ALIGNMENT CRITERIA:
- Must serve [community] directly
- Must include measurable KPIs and success metrics`;

export function CreateDAOModal({ onClose, onSuccess }: CreateOrgModalProps) {
  const [name, setName] = useState("");
  const [constitution, setConstitution] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const { mutateAsync, isPending } = useCreateOrg();
  const { isConnected } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutateAsync({ name, constitution, onSubmitted: (hash) => setTxHash(hash) });
      onSuccess?.();
      onClose();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="gov-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="font-display text-lg text-slate-100">Register Organization</h2>
            <p className="text-xs text-slate-600 font-mono mt-0.5">Add your organization to the TreasuryPilot registry</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-widest text-slate-500">Organization Name</label>
            <input
              className="gov-input w-full px-4 py-2.5 text-sm"
              placeholder="e.g. LATAM Web3 Public Goods"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-widest text-slate-500">Constitution</label>
            <p className="text-xs text-slate-600">
              Include your mission, grant programs with budgets, allocation rules, and alignment criteria.
            </p>
            <textarea
              className="gov-input w-full px-4 py-3 text-sm font-mono resize-none"
              rows={14}
              placeholder={PLACEHOLDER_CONSTITUTION}
              value={constitution}
              onChange={(e) => setConstitution(e.target.value)}
              required
            />
          </div>

          {txHash && (
            <div className="rounded border border-cyan-500/20 bg-cyan-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">AI Validators Deliberating</span>
              </div>
              <p className="text-xs text-slate-400">Consensus takes 5–15 minutes. You can close this modal — your organization will appear once validators agree.</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-600 font-mono">Tx:</span>
                <span className="text-xs font-mono text-slate-400 truncate">{txHash}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-mono uppercase tracking-widest text-slate-500 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !isConnected}
              className="flex-1 py-2.5 text-sm font-mono uppercase tracking-widest text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Registering..." : "Register Organization"}
            </button>
          </div>

          {!isConnected && (
            <p className="text-center text-xs text-slate-600 font-mono">Connect your wallet to register an organization.</p>
          )}
        </form>
      </div>
    </div>
  );
}
