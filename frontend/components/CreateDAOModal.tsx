"use client";

import { useState } from "react";
import { X, ExternalLink, Check, Copy } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
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

  const handleUseTemplate = () => {
    if (
      constitution.trim() &&
      !confirm("This will replace your current constitution text. Continue?")
    ) {
      return;
    }
    setConstitution(PLACEHOLDER_CONSTITUTION);
  };

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(PLACEHOLDER_CONSTITUTION);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="gov-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-soft">
          <div>
            <h2 className="font-display text-lg text-text">Register Organization</h2>
            <p className="text-xs text-text-faint font-mono mt-0.5">Add your organization to the TreasuryPilot registry</p>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-dim transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-faint">Organization Name</label>
            <input
              className="gov-input w-full px-4 py-2.5 text-sm"
              placeholder="e.g. LATAM Web3 Public Goods"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-mono text-text-faint">Constitution</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleUseTemplate}
                  className="text-[11px] font-mono text-accent hover:text-accent/80 transition-colors"
                >
                  Use template
                </button>
                <span className="text-text-faint/40">·</span>
                <button
                  type="button"
                  onClick={handleCopyTemplate}
                  className="flex items-center gap-1.5 text-[11px] font-mono text-text-dim hover:text-text transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-accent" />
                      <span className="text-accent">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy template
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-text-faint">
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
            <div className="rounded border border-accent/20 bg-accent/8 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs font-mono text-accent">AI Validators Deliberating</span>
              </div>
              <p className="text-xs text-text-dim">Consensus takes 5–15 minutes. You can close this modal — your organization will appear once validators agree.</p>
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
              {isPending ? "Registering…" : "Register Organization"}
            </button>
          </div>

          {!isConnected && (
            <p className="text-center text-xs text-text-faint font-mono">Connect your wallet to register an organization.</p>
          )}
        </form>
      </div>
    </div>
  );
}
