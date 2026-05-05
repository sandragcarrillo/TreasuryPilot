"use client";

import { useState } from "react";
import { X, ExternalLink, AlertTriangle } from "lucide-react";
import { useUpdateConstitution } from "@/lib/hooks/useTreasuryPilot";
import { useWallet } from "@/lib/genlayer/wallet";

interface EditConstitutionModalProps {
  orgId: number;
  orgName: string;
  currentConstitution: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditConstitutionModal({
  orgId,
  orgName,
  currentConstitution,
  onClose,
  onSuccess,
}: EditConstitutionModalProps) {
  const [constitution, setConstitution] = useState(currentConstitution);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { mutateAsync, isPending } = useUpdateConstitution();
  const { isConnected } = useWallet();

  const dirty = constitution !== currentConstitution;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    try {
      const result = await mutateAsync({ orgId, newConstitution: constitution });
      const hash = result?.data?.genlayerTxHash;
      if (typeof hash === "string") setTxHash(hash);
      onSuccess?.();
      onClose();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="gov-card w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-soft">
          <div>
            <h2 className="font-display text-lg text-text">Edit Constitution</h2>
            <p className="text-xs text-text-faint font-mono mt-0.5">
              {orgName}
            </p>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-dim transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-warning/30 bg-warning/5 text-xs text-warning flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Changes apply immediately to all future AI evaluations. Existing
            evaluated proposals are not re-judged.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-faint">
              Constitution
            </label>
            <textarea
              className="gov-input w-full px-4 py-3 text-sm font-mono resize-y min-h-72 max-h-[60vh]"
              rows={20}
              value={constitution}
              onChange={(e) => setConstitution(e.target.value)}
              required
            />
            <p className="text-[11px] text-text-faint font-mono">
              {constitution.length.toLocaleString()} characters
            </p>
          </div>

          {txHash && (
            <div className="rounded border border-accent/20 bg-accent/8 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs font-mono text-accent">Saving Update</span>
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
              disabled={isPending || !isConnected || !dirty}
              className="flex-1 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/70 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? "Saving…" : "Save Constitution"}
            </button>
          </div>

          {!isConnected && (
            <p className="text-center text-xs text-text-faint font-mono">
              Connect your wallet to update the constitution.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
