"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { VerdictBadge } from "@/components/VerdictBadge";
import { AlignmentScore } from "@/components/AlignmentScore";
import { EvaluationOverlay } from "@/components/EvaluationOverlay";
import {
  useProposal,
  useOrg,
  useOrgAdmins,
  useEvaluateProposal,
  useVetoProposal,
  useProposalReports,
  useSubmitReport,
  useEvaluateReport,
} from "@/lib/hooks/useTreasuryPilot";
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

const ROI_STATUS_COLORS: Record<string, string> = {
  on_track:  "text-emerald-400 border-emerald-800 bg-emerald-950/30",
  at_risk:   "text-amber-400 border-amber-800 bg-amber-950/30",
  exceeding: "text-cyan-400 border-cyan-800 bg-cyan-950/30",
  failed:    "text-red-400 border-red-800 bg-red-950/30",
};

const ROI_STATUS_LABELS: Record<string, string> = {
  on_track:  "On Track",
  at_risk:   "At Risk",
  exceeding: "Exceeding",
  failed:    "Failed",
};

export default function ProposalPage() {
  const { id } = useParams();
  const router = useRouter();
  const proposalId = Number(id);
  const { address, isConnected } = useWallet();

  const { data: proposal, isLoading, refetch } = useProposal(isNaN(proposalId) ? null : proposalId);
  const { data: org } = useOrg(proposal?.org_id ?? null);
  const { data: admins = [] } = useOrgAdmins(proposal?.org_id ?? null);
  const { data: reports = [], refetch: refetchReports } = useProposalReports(isNaN(proposalId) ? null : proposalId);
  const { mutateAsync: evaluate, isPending: evaluating } = useEvaluateProposal();
  const { mutateAsync: veto, isPending: vetoing } = useVetoProposal();

  const [showReportForm, setShowReportForm] = useState(false);

  const isOwner = org && address && org.owner.toLowerCase() === address.toLowerCase();
  const isAdmin = admins.some((a) => a.toLowerCase() === address?.toLowerCase());
  const canVeto = (isOwner || isAdmin) && proposal?.status === "auto_approved";
  const canReport = proposal && (proposal.status === "approved" || proposal.status === "auto_approved");

  const handleEvaluate = async () => {
    try {
      await evaluate(proposalId);
      refetch();
    } catch {}
  };

  const handleVeto = async () => {
    try {
      await veto(proposalId);
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
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-mono text-slate-600">
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

          {/* Action buttons */}
          <div className="flex justify-center gap-4 mb-10">
            {!proposal.evaluated && isConnected && (
              <button
                onClick={handleEvaluate}
                disabled={evaluating}
                className="px-8 py-3 text-sm font-mono uppercase tracking-[0.15em] text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Request AI Evaluation
              </button>
            )}
            {canVeto && (
              <button
                onClick={handleVeto}
                disabled={vetoing}
                className="px-8 py-3 text-sm font-mono uppercase tracking-[0.15em] text-red-400 border border-red-500/50 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {vetoing ? "Vetoing..." : "Veto Proposal"}
              </button>
            )}
          </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
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

          {/* Progress Reports Section */}
          {canReport && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-600">
                    Progress Reports
                  </h2>
                  <span className="font-mono text-xs text-slate-700 border border-slate-800 px-2 py-0.5">
                    {reports.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowReportForm((v) => !v)}
                  className="text-xs font-mono text-cyan-600 hover:text-cyan-400 transition-colors"
                >
                  + Submit Report
                </button>
              </div>

              {showReportForm && (
                <ReportForm
                  proposalId={proposalId}
                  onSuccess={() => { setShowReportForm(false); refetchReports(); }}
                  onCancel={() => setShowReportForm(false)}
                />
              )}

              {reports.length === 0 && !showReportForm ? (
                <div className="gov-card p-8 text-center">
                  <p className="text-xs text-slate-600 font-mono">No progress reports submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <ReportCard
                      key={report.report_number}
                      report={report}
                      proposalId={proposalId}
                      onEvaluated={refetchReports}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

        </div>
      </main>
    </div>
  );
}

// ─── Report Form ─────────────────────────────────────────────────────────────

function ReportForm({
  proposalId,
  onSuccess,
  onCancel,
}: {
  proposalId: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    milestones: "",
    fundsSpent: "",
    deliverables: "",
    evidenceUrls: "",
  });
  const [txHash, setTxHash] = useState<string | null>(null);
  const { mutateAsync, isPending } = useSubmitReport();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutateAsync({
        proposalId,
        milestonesCompleted: form.milestones,
        fundsSpentUsd: form.fundsSpent,
        deliverables: form.deliverables,
        evidenceUrls: form.evidenceUrls,
        onSubmitted: (hash) => setTxHash(hash),
      });
      onSuccess();
    } catch {}
  };

  return (
    <div className="gov-card p-6 animate-fade-in">
      <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500 mb-4">Submit Progress Report</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-widest text-slate-600">Milestones Completed</label>
            <input className="gov-input w-full px-3 py-2 text-sm" placeholder="e.g. 3 of 5" value={form.milestones} onChange={set("milestones")} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-widest text-slate-600">Funds Spent (USD)</label>
            <input className="gov-input w-full px-3 py-2 text-sm font-mono" placeholder="e.g. 8000 of 15000" value={form.fundsSpent} onChange={set("fundsSpent")} required />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-slate-600">Deliverables</label>
          <textarea className="gov-input w-full px-3 py-2 text-sm resize-none" rows={3} placeholder="What has been delivered so far?" value={form.deliverables} onChange={set("deliverables")} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-slate-600">Evidence URLs</label>
          <input className="gov-input w-full px-3 py-2 text-sm font-mono" placeholder="GitHub repos, docs, dashboards..." value={form.evidenceUrls} onChange={set("evidenceUrls")} />
        </div>

        {txHash && (
          <div className="rounded border border-cyan-500/20 bg-cyan-950/20 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">Validators Deliberating</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-mono">Tx:</span>
              <span className="text-xs font-mono text-slate-400 truncate">{txHash}</span>
              <a href={`https://explorer-studio.genlayer.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-slate-600 hover:text-cyan-400 transition-colors shrink-0">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-slate-500 border border-slate-700 hover:border-slate-600 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isPending} className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/10 disabled:opacity-40 transition-colors">
            {isPending ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Report Card ─────────────────────────────────────────────────────────────

function ReportCard({
  report,
  proposalId,
  onEvaluated,
}: {
  report: any;
  proposalId: number;
  onEvaluated: () => void;
}) {
  const { mutateAsync: evalReport, isPending } = useEvaluateReport();
  const { isConnected } = useWallet();

  const handleEvaluate = async () => {
    try {
      await evalReport({ proposalId, reportNumber: report.report_number });
      onEvaluated();
    } catch {}
  };

  return (
    <div className="gov-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-600">Report #{report.report_number}</span>
          {report.evaluated && report.roi_status && (
            <span className={`font-mono text-[10px] px-2 py-0.5 border uppercase tracking-widest ${ROI_STATUS_COLORS[report.roi_status] || "text-slate-500 border-slate-700"}`}>
              {ROI_STATUS_LABELS[report.roi_status] || report.roi_status}
            </span>
          )}
          {report.evaluated && (
            <span className="font-mono text-xs text-slate-400">
              Progress: <span className="text-slate-200">{report.progress_score}/10</span>
            </span>
          )}
        </div>
        {!report.evaluated && isConnected && (
          <button
            onClick={handleEvaluate}
            disabled={isPending}
            className="text-[10px] font-mono uppercase tracking-widest text-cyan-500 hover:text-cyan-400 disabled:opacity-40 transition-colors shrink-0"
          >
            {isPending ? "Evaluating..." : "Evaluate Report"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="font-mono text-slate-600 uppercase tracking-widest text-[10px]">Milestones</span>
          <p className="text-slate-300 mt-0.5">{report.milestones_completed}</p>
        </div>
        <div>
          <span className="font-mono text-slate-600 uppercase tracking-widest text-[10px]">Funds Spent</span>
          <p className="text-slate-300 font-mono mt-0.5">${report.funds_spent_usd}</p>
        </div>
      </div>

      <div className="text-xs">
        <span className="font-mono text-slate-600 uppercase tracking-widest text-[10px]">Deliverables</span>
        <p className="text-slate-400 mt-0.5 leading-relaxed">{report.deliverables}</p>
      </div>

      {report.evidence_urls && (
        <div className="text-xs">
          <span className="font-mono text-slate-600 uppercase tracking-widest text-[10px]">Evidence</span>
          <p className="text-cyan-600 font-mono mt-0.5 break-all">{report.evidence_urls}</p>
        </div>
      )}

      {report.evaluated && report.ai_summary && (
        <div className="border-t border-slate-800 pt-3 mt-3">
          <span className="font-mono text-slate-600 uppercase tracking-widest text-[10px]">AI Assessment</span>
          <p className="text-slate-300 text-xs mt-1 leading-relaxed">{report.ai_summary}</p>
        </div>
      )}
    </div>
  );
}
