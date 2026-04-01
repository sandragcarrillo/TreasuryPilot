"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { VerdictBadge } from "@/components/VerdictBadge";
import { AlignmentScore } from "@/components/AlignmentScore";
import { EvaluationOverlay } from "@/components/EvaluationOverlay";
import { useProposal, useOrg, useEvaluateProposal } from "@/lib/hooks/useTreasuryPilot";
import { useWallet } from "@/lib/genlayer/wallet";

const RISK_COLORS: Record<string, string> = {
  low:    "text-emerald-400 border-emerald-800 bg-emerald-950/30",
  medium: "text-amber-400  border-amber-800  bg-amber-950/30",
  high:   "text-red-400    border-red-800    bg-red-950/30",
};

const ROI_COLORS: Record<string, string> = {
  positive: "text-emerald-400 border-emerald-800 bg-emerald-950/30",
  neutral:  "text-slate-400  border-slate-700  bg-slate-900/40",
  negative: "text-red-400    border-red-800    bg-red-950/30",
};

const STATUS_COLORS: Record<string, string> = {
  pending:            "text-slate-400 border-slate-700 bg-slate-900/40",
  approved:           "text-emerald-400 border-emerald-800 bg-emerald-950/30",
  rejected:           "text-red-400 border-red-800 bg-red-950/30",
  needs_modification: "text-amber-400 border-amber-800 bg-amber-950/30",
  auto_approved:      "text-cyan-400 border-cyan-800 bg-cyan-950/30",
  vetoed:             "text-purple-400 border-purple-800 bg-purple-950/30",
};

const STATUS_LABELS: Record<string, string> = {
  pending:            "Pending",
  approved:           "Approved",
  rejected:           "Rejected",
  needs_modification: "Needs Modification",
  auto_approved:      "Auto-Approved",
  vetoed:             "Vetoed",
};

export default function ProposalPage() {
  const { id } = useParams();
  const router = useRouter();
  const proposalId = Number(id);

  const { data: proposal, isLoading, refetch } = useProposal(isNaN(proposalId) ? null : proposalId);
  const { data: org } = useOrg(proposal?.org_id ?? null);
  const { mutateAsync: evaluate, isPending: evaluating } = useEvaluateProposal();
  const { isConnected } = useWallet();

  const handleEvaluate = async () => {
    try {
      await evaluate(proposalId);
      refetch();
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="grow pt-20 flex items-center justify-center">
          <span className="font-mono text-sm text-slate-600 tracking-wider">Loading...</span>
        </main>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="grow pt-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-400 font-body mb-3">Proposal not found</p>
            <button onClick={() => router.back()} className="text-xs font-mono text-cyan-500 hover:text-cyan-400">← Go back</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <EvaluationOverlay visible={evaluating} />

      <main className="grow pt-14 pb-16">

        {/* Header band */}
        <div className="border-b border-slate-800/80 bg-black/30">
          <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
            <button
              onClick={() => org ? router.push(`/dao/${org.id}`) : router.back()}
              className="flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-400 transition-colors mb-5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {org ? org.name : "Back"}
            </button>
            <div className="flex items-start gap-3 flex-wrap">
              <span className="font-mono text-slate-700 text-sm">#{proposal.id}</span>
              <h1 className="font-display text-2xl md:text-3xl text-slate-100 flex-1">{proposal.title}</h1>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-xs font-mono text-slate-600">
              <span>{proposal.target_program}</span>
              <span>·</span>
              <span>${proposal.requested_amount_usd} USD</span>
              <span>·</span>
              <span>by {proposal.submitter?.slice(0, 10)}...</span>
              {proposal.status !== "pending" && (
                <>
                  <span>·</span>
                  <span className={`px-2 py-0.5 border text-[10px] uppercase tracking-widest ${STATUS_COLORS[proposal.status] || ""}`}>
                    {STATUS_LABELS[proposal.status] || proposal.status}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-10">

          {/* Verdict hero */}
          <div className="flex flex-col md:flex-row items-center gap-12 py-10 animate-fade-in">

            <div className="flex flex-col items-center gap-6">
              <VerdictBadge recommendation={proposal.recommendation} animate={proposal.evaluated} />

              {proposal.evaluated && (
                <div className="flex gap-3 reasoning-reveal">
                  <span className={`font-mono text-xs px-3 py-1 border uppercase tracking-widest ${RISK_COLORS[proposal.risk_level] || "text-slate-500 border-slate-700"}`}>
                    {proposal.risk_level} risk
                  </span>
                  <span className={`font-mono text-xs px-3 py-1 border uppercase tracking-widest ${ROI_COLORS[proposal.roi_assessment] || "text-slate-500 border-slate-700"}`}>
                    {proposal.roi_assessment} ROI
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center">
              <AlignmentScore score={proposal.alignment_score} evaluated={proposal.evaluated} />
            </div>
          </div>

          {/* Evaluate button */}
          {!proposal.evaluated && isConnected && (
            <div className="flex justify-center mb-10">
              <button
                onClick={handleEvaluate}
                disabled={evaluating}
                className="px-8 py-3 text-sm font-mono uppercase tracking-[0.15em] text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Request AI Evaluation
              </button>
            </div>
          )}

          {/* Reasoning */}
          {proposal.evaluated && proposal.reasoning && (
            <div className="gov-card p-6 mb-8 reasoning-reveal">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-600 mb-4 flex items-center gap-2">
                <span className="w-4 h-px bg-slate-700" />
                Evaluator&apos;s Opinion
                <span className="w-4 h-px bg-slate-700" />
              </div>
              <p className="text-slate-300 font-body text-sm leading-relaxed">{proposal.reasoning}</p>
            </div>
          )}

          {/* Proposal details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-4">
              <div className="gov-card p-5 space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-slate-600">Description</div>
                <p className="text-sm text-slate-300 font-body leading-relaxed">{proposal.description}</p>
              </div>

              <div className="gov-card p-5 space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-slate-600">Rationale</div>
                <p className="text-sm text-slate-300 font-body leading-relaxed">{proposal.rationale}</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Target Program", value: proposal.target_program },
                { label: "Requested Amount", value: `$${proposal.requested_amount_usd} USD`, mono: true },
                { label: "Recipient", value: proposal.recipient, mono: true, truncate: true },
                { label: "Submitter", value: proposal.submitter, mono: true, truncate: true },
              ].map((item) => (
                <div key={item.label} className="gov-card p-4 flex items-start justify-between gap-3">
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-600 shrink-0">{item.label}</span>
                  <span className={`text-sm text-slate-300 text-right ${item.mono ? "font-mono" : "font-body"} ${item.truncate ? "truncate max-w-[200px]" : ""}`}>
                    {item.value || "—"}
                  </span>
                </div>
              ))}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
