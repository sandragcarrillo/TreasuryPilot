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
  low:    "text-accent border-accent/50 bg-accent/8",
  medium: "text-warning border-warning/50 bg-warning/10",
  high:   "text-danger  border-danger/50  bg-danger/10",
};

const ROI_COLORS: Record<string, string> = {
  positive: "text-accent border-accent/50 bg-accent/8",
  neutral:  "text-text-dim border-border-soft bg-bg-elev-2/40",
  negative: "text-danger  border-danger/50  bg-danger/10",
};

const STATUS_COLORS: Record<string, string> = {
  pending:            "text-text-dim border-border-soft bg-bg-elev-2/40",
  approved:           "text-accent border-accent/50 bg-accent/8",
  rejected:           "text-danger border-danger/50 bg-danger/10",
  needs_modification: "text-warning border-warning/50 bg-warning/10",
  auto_approved:      "text-accent border-accent/50 bg-accent/8",
  vetoed:             "text-vetoed border-vetoed/50 bg-vetoed/10",
};

const STATUS_LABELS: Record<string, string> = {
  pending:            "Pending",
  approved:           "Approved",
  rejected:           "Rejected",
  needs_modification: "Needs modification",
  auto_approved:      "Auto-approved",
  vetoed:             "Vetoed",
};

const ROI_STATUS_COLORS: Record<string, string> = {
  on_track:  "text-accent border-accent/50 bg-accent/8",
  at_risk:   "text-warning border-warning/50 bg-warning/10",
  exceeding: "text-accent border-accent/50 bg-accent/8",
  failed:    "text-danger border-danger/50 bg-danger/10",
};

const ROI_STATUS_LABELS: Record<string, string> = {
  on_track:  "On track",
  at_risk:   "At risk",
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
        <main className="grow pt-24 flex items-center justify-center">
          <span className="font-mono text-xs text-text-faint tracking-widest">Loading…</span>
        </main>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="grow pt-24 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-2xl text-text font-medium tracking-tight">Proposal not found.</p>
            <button
              onClick={() => router.back()}
              className="text-[11px] font-mono text-accent hover:text-accent/80 tracking-widest"
            >
              ← Go back
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <EvaluationOverlay visible={evaluating} />

      <main className="grow pt-18 pb-20">
        {/* Header band */}
        <div className="border-b border-border-soft">
          <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-12">
            <button
              onClick={() => org ? router.push(`/org/${org.id}`) : router.back()}
              className="flex items-center gap-1.5 text-[11px] font-mono text-text-faint hover:text-text-dim tracking-[0.2em] transition-colors mb-6"
            >
              <ArrowLeft className="w-3 h-3" />
              {org ? org.name : "Back"}
            </button>
            <div className="flex items-start gap-4 flex-wrap">
              <span className="font-mono text-text-faint text-sm pt-2">№ {proposal.id}</span>
              <h1 className="font-display text-3xl md:text-5xl text-text leading-[1.05] flex-1 tracking-tight">
                {proposal.title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4 text-[11px] font-mono text-text-faint tracking-wider">
              <span>{proposal.target_program}</span>
              <span className="text-text-faint/50">·</span>
              <span className="text-text-dim">${proposal.requested_amount_usd} USD</span>
              <span className="text-text-faint/50">·</span>
              <span>by {proposal.submitter?.slice(0, 10)}…</span>
              {proposal.status !== "pending" && (
                <>
                  <span className="text-text-faint/50">·</span>
                  <span className={`px-2 py-0.5 border text-[10px] tracking-[0.15em] ${STATUS_COLORS[proposal.status] || ""}`}>
                    {STATUS_LABELS[proposal.status] || proposal.status}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-12">
          {/* Verdict hero */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-14 py-14 animate-fade-in">
            <div className="flex flex-col items-center gap-6">
              <VerdictBadge recommendation={proposal.recommendation} animate={proposal.evaluated} />
              {proposal.evaluated && (
                <div className="flex gap-3 reasoning-reveal">
                  <span className={`font-mono text-[11px] px-3 py-1 border tracking-widest ${RISK_COLORS[proposal.risk_level] || "text-text-faint border-border-soft"}`}>
                    {proposal.risk_level} risk
                  </span>
                  <span className={`font-mono text-[11px] px-3 py-1 border tracking-widest ${ROI_COLORS[proposal.roi_assessment] || "text-text-faint border-border-soft"}`}>
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
          <div className="flex justify-center gap-4 mb-12">
            {!proposal.evaluated && isConnected && (
              <button
                onClick={handleEvaluate}
                disabled={evaluating}
                className="px-8 py-3 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/50 hover:bg-accent/10 hover:border-accent/70 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Request AI Evaluation
              </button>
            )}
            {canVeto && (
              <button
                onClick={handleVeto}
                disabled={vetoing}
                className="px-8 py-3 rounded-xl text-[11px] font-mono tracking-[0.2em] text-danger border border-danger/50 hover:bg-danger/10 hover:border-danger/70 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {vetoing ? "Vetoing…" : "Veto Proposal"}
              </button>
            )}
          </div>

          {/* Reasoning */}
          {proposal.evaluated && proposal.reasoning && (
            <div className="gov-card p-8 mb-10 reasoning-reveal">
              <div className="text-[10px] font-mono tracking-[0.25em] text-text-faint mb-4 flex items-center gap-2">
                <span className="w-4 h-px bg-border" />
                Evaluator&apos;s Opinion
                <span className="w-4 h-px bg-border" />
              </div>
              <p className="text-text-dim font-body text-base leading-relaxed">
                {proposal.reasoning}
              </p>
            </div>
          )}

          {/* Proposal details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-14">
            <div className="space-y-4">
              <div className="gov-card p-6 space-y-2.5">
                <div className="text-[10px] font-mono tracking-[0.25em] text-text-faint">
                  Description
                </div>
                <p className="text-sm text-text-dim font-body leading-relaxed">
                  {proposal.description}
                </p>
              </div>
              <div className="gov-card p-6 space-y-2.5">
                <div className="text-[10px] font-mono tracking-[0.25em] text-text-faint">
                  Rationale
                </div>
                <p className="text-sm text-text-dim font-body leading-relaxed">
                  {proposal.rationale}
                </p>
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
                  <span className="text-[10px] font-mono tracking-[0.2em] text-text-faint shrink-0">
                    {item.label}
                  </span>
                  <span
                    className={`text-sm text-text text-right ${item.mono ? "font-mono" : "font-body"} ${item.truncate ? "truncate max-w-[200px]" : ""}`}
                    title={item.truncate ? String(item.value ?? "") : undefined}
                  >
                    {item.value || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Reports */}
          {canReport && (
            <section className="space-y-6">
              <div className="flex items-end justify-between border-b border-border-soft pb-4">
                <div className="flex items-baseline gap-3">
                  <FileText className="w-3.5 h-3.5 text-text-faint self-center" />
                  <h2 className="text-[11px] font-mono tracking-[0.25em] text-text-faint">
                    Progress Reports
                  </h2>
                  <span className="font-mono text-[11px] text-text-faint">
                    {reports.length.toString().padStart(2, "0")}
                  </span>
                </div>
                <button
                  onClick={() => setShowReportForm((v) => !v)}
                  className="text-[11px] font-mono tracking-[0.2em] text-accent hover:text-accent/80 transition-colors"
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
                <div className="gov-card p-10 text-center">
                  <p className="text-sm text-text-dim">
                    No progress reports yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <ReportCard
                      key={report.report_number}
                      report={report}
                      proposalId={proposalId}
                      onEvaluated={refetchReports}
                      roiColors={ROI_STATUS_COLORS}
                      roiLabels={ROI_STATUS_LABELS}
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
    <div className="gov-card p-8 animate-fade-in">
      <h3 className="text-[11px] font-mono tracking-[0.25em] text-text-dim mb-6 border-b border-border-soft pb-4">
        Submit Progress Report
      </h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-[0.2em] text-text-faint block">
              Milestones Completed
            </label>
            <input
              className="gov-input w-full px-3 py-2.5 text-sm"
              placeholder="e.g. 3 of 5"
              value={form.milestones}
              onChange={set("milestones")}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-[0.2em] text-text-faint block">
              Funds Spent (USD)
            </label>
            <input
              className="gov-input w-full px-3 py-2.5 text-sm font-mono"
              placeholder="e.g. 8000 of 15000"
              value={form.fundsSpent}
              onChange={set("fundsSpent")}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-mono tracking-[0.2em] text-text-faint block">
            Deliverables
          </label>
          <textarea
            className="gov-input w-full px-3 py-2.5 text-sm resize-none"
            rows={3}
            placeholder="What has been delivered so far?"
            value={form.deliverables}
            onChange={set("deliverables")}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-mono tracking-[0.2em] text-text-faint block">
            Evidence URLs
          </label>
          <input
            className="gov-input w-full px-3 py-2.5 text-sm font-mono"
            placeholder="GitHub repos, docs, dashboards…"
            value={form.evidenceUrls}
            onChange={set("evidenceUrls")}
          />
        </div>

        {txHash && (
          <div className="border border-accent/25 bg-accent-bg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-mono tracking-[0.25em] text-accent">
                Validators Deliberating
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-text-faint font-mono tracking-wider">Tx</span>
              <span className="text-xs font-mono text-text-dim truncate">{txHash}</span>
              <a
                href={`https://explorer-studio.genlayer.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-text-faint hover:text-accent transition-colors shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-text-dim border border-border-soft hover:border-border hover:text-text transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/70 disabled:opacity-40 transition-all"
          >
            {isPending ? "Submitting…" : "Submit Report"}
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
  roiColors,
  roiLabels,
}: {
  report: any;
  proposalId: number;
  onEvaluated: () => void;
  roiColors: Record<string, string>;
  roiLabels: Record<string, string>;
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
    <div className="gov-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[11px] text-text-faint tracking-wider">
            Report № {report.report_number}
          </span>
          {report.evaluated && report.roi_status && (
            <span className={`font-mono text-[10px] px-2 py-0.5 border tracking-[0.15em] ${roiColors[report.roi_status] || "text-text-faint border-border-soft"}`}>
              {roiLabels[report.roi_status] || report.roi_status}
            </span>
          )}
          {report.evaluated && (
            <span className="font-mono text-[11px] text-text-faint">
              Progress <span className="text-text">{report.progress_score}/10</span>
            </span>
          )}
        </div>
        {!report.evaluated && isConnected && (
          <button
            onClick={handleEvaluate}
            disabled={isPending}
            className="text-[10px] font-mono tracking-[0.2em] text-accent hover:text-accent/80 disabled:opacity-40 transition-colors shrink-0"
          >
            {isPending ? "Evaluating…" : "Evaluate Report"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <span className="font-mono text-text-faint tracking-[0.2em] text-[10px]">
            Milestones
          </span>
          <p className="text-text-dim">{report.milestones_completed}</p>
        </div>
        <div className="space-y-1">
          <span className="font-mono text-text-faint tracking-[0.2em] text-[10px]">
            Funds Spent
          </span>
          <p className="text-text-dim font-mono">${report.funds_spent_usd}</p>
        </div>
      </div>

      <div className="text-xs space-y-1">
        <span className="font-mono text-text-faint tracking-[0.2em] text-[10px]">
          Deliverables
        </span>
        <p className="text-text-dim leading-relaxed">{report.deliverables}</p>
      </div>

      {report.evidence_urls && (
        <div className="text-xs space-y-1">
          <span className="font-mono text-text-faint tracking-[0.2em] text-[10px]">
            Evidence
          </span>
          <p className="text-accent/80 font-mono break-all">{report.evidence_urls}</p>
        </div>
      )}

      {report.evaluated && report.ai_summary && (
        <div className="border-t border-border-soft pt-4 mt-2 space-y-1.5">
          <span className="font-mono text-text-faint tracking-[0.2em] text-[10px]">
            AI Assessment
          </span>
          <p className="text-text-dim text-sm leading-relaxed">{report.ai_summary}</p>
        </div>
      )}
    </div>
  );
}
