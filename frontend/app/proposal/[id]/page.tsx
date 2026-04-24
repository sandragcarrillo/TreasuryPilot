"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AddressDisplay } from "@/components/AddressDisplay";
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

// ─── Label / color maps ─────────────────────────────────────────────────────

const RISK_COLOR: Record<string, string> = {
  low: "text-accent",
  medium: "text-warning",
  high: "text-danger",
};
const RISK_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const ROI_COLOR: Record<string, string> = {
  positive: "text-accent",
  neutral: "text-text-dim",
  negative: "text-danger",
};
const ROI_LABEL: Record<string, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

const RECOMMENDATION_COLOR: Record<string, string> = {
  approve: "text-accent",
  reject: "text-danger",
  modify: "text-warning",
  pending: "text-text-dim",
};
const RECOMMENDATION_LABEL: Record<string, string> = {
  approve: "Approve",
  reject: "Reject",
  modify: "Modify",
  pending: "Pending",
};

const STATUS_PILL: Record<
  string,
  { label: string; cls: string }
> = {
  pending: {
    label: "Pending",
    cls: "text-text-dim border-border-soft bg-bg-elev-2/40",
  },
  approved: {
    label: "Approved",
    cls: "text-accent border-accent/40 bg-accent/10",
  },
  rejected: {
    label: "Rejected",
    cls: "text-danger border-danger/40 bg-danger/10",
  },
  needs_modification: {
    label: "Needs modification",
    cls: "text-warning border-warning/40 bg-warning/10",
  },
  auto_approved: {
    label: "Auto-approved",
    cls: "text-accent border-accent/40 bg-accent/10",
  },
  vetoed: {
    label: "Vetoed",
    cls: "text-vetoed border-vetoed/40 bg-vetoed/10",
  },
};

const ROI_STATUS_PILL: Record<string, { label: string; cls: string }> = {
  on_track: { label: "On track", cls: "text-accent border-accent/40 bg-accent/10" },
  at_risk: { label: "At risk", cls: "text-warning border-warning/40 bg-warning/10" },
  exceeding: { label: "Exceeding", cls: "text-accent border-accent/40 bg-accent/10" },
  failed: { label: "Failed", cls: "text-danger border-danger/40 bg-danger/10" },
};

// ─── Page ────────────────────────────────────────────────────────────────────

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

  const statusPill = STATUS_PILL[proposal.status] ?? STATUS_PILL.pending;
  const recColor = RECOMMENDATION_COLOR[proposal.recommendation] ?? "text-text-dim";
  const recLabel = RECOMMENDATION_LABEL[proposal.recommendation] ?? proposal.recommendation;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <EvaluationOverlay visible={evaluating} />

      <main className="grow pt-18 pb-20">
        {/* Breadcrumb */}
        <div className="border-b border-border-soft">
          <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8">
            <button
              onClick={() => org ? router.push(`/org/${org.id}`) : router.back()}
              className="flex items-center gap-1.5 text-[11px] font-mono text-text-faint hover:text-text-dim tracking-[0.2em] transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              {org ? org.name : "Back"}
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-12 space-y-10">

          {/* Main evaluation card */}
          <div className="rounded-2xl bg-bg-elev border border-border-soft p-8 md:p-10 space-y-8 animate-fade-in">
            {/* Top meta row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft pb-5">
              <div className="flex items-center gap-3 text-[11px] font-mono text-text-faint tracking-wider">
                <span>Proposal № {proposal.id}</span>
                <span className="text-text-faint/40">·</span>
                <span>{proposal.target_program || "—"}</span>
                {org && (
                  <>
                    <span className="text-text-faint/40">·</span>
                    <span>{org.name}</span>
                  </>
                )}
              </div>
              <span
                className={`text-[11px] font-mono border rounded-full px-3 py-1 ${statusPill.cls}`}
              >
                {statusPill.label}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-4xl font-semibold text-text tracking-tight leading-snug">
              {proposal.title}
            </h1>

            {/* Meta line */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-text-faint tracking-wider -mt-4">
              <span className="text-text-dim">
                ${parseFloat(proposal.requested_amount_usd).toLocaleString()} USD
              </span>
              <span className="text-text-faint/40">·</span>
              <span className="inline-flex items-center gap-1.5">
                Submitted by
                <AddressDisplay address={proposal.submitter} showCopy />
              </span>
            </div>

            {/* Scores grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-y border-border-soft py-6">
              <Score
                label="Alignment"
                value={proposal.evaluated ? `${proposal.alignment_score} / 10` : "—"}
                valueClass="text-text"
              />
              <Score
                label="Risk"
                value={proposal.evaluated ? RISK_LABEL[proposal.risk_level] ?? "—" : "—"}
                valueClass={proposal.evaluated ? RISK_COLOR[proposal.risk_level] ?? "text-text" : "text-text-faint"}
              />
              <Score
                label="ROI"
                value={proposal.evaluated ? ROI_LABEL[proposal.roi_assessment] ?? "—" : "—"}
                valueClass={proposal.evaluated ? ROI_COLOR[proposal.roi_assessment] ?? "text-text" : "text-text-faint"}
              />
              <Score
                label="Recommendation"
                value={proposal.evaluated ? recLabel : "Pending"}
                valueClass={proposal.evaluated ? recColor : "text-text-faint"}
              />
            </div>

            {/* AI reasoning or empty hint */}
            {proposal.evaluated && proposal.reasoning ? (
              <div className="space-y-3 reasoning-reveal">
                <div className="text-[10px] font-mono text-text-faint tracking-[0.2em]">
                  AI reasoning
                </div>
                <p className="text-sm md:text-base text-text-dim leading-relaxed">
                  {proposal.reasoning}
                </p>
              </div>
            ) : (
              <div className="text-sm text-text-dim">
                Not yet evaluated. Once validators reach consensus, scores and
                reasoning will appear here.
              </div>
            )}

            {/* Footer actions */}
            {(canVeto || (!proposal.evaluated && isConnected)) && (
              <div className="border-t border-border-soft pt-5 flex flex-wrap gap-3">
                {!proposal.evaluated && isConnected && (
                  <button
                    onClick={handleEvaluate}
                    disabled={evaluating}
                    className="px-6 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/50 hover:bg-accent/10 hover:border-accent/70 disabled:opacity-40 transition-all"
                  >
                    Request AI evaluation
                  </button>
                )}
                {canVeto && (
                  <button
                    onClick={handleVeto}
                    disabled={vetoing}
                    className="px-6 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-danger border border-danger/50 hover:bg-danger/10 hover:border-danger/70 disabled:opacity-40 transition-all"
                  >
                    {vetoing ? "Vetoing…" : "Veto proposal"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Proposal details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <div className="gov-card p-6 space-y-3">
                <div className="text-[10px] font-mono tracking-[0.2em] text-text-faint">
                  Description
                </div>
                <p className="text-sm text-text-dim leading-relaxed">
                  {proposal.description}
                </p>
              </div>
              <div className="gov-card p-6 space-y-3">
                <div className="text-[10px] font-mono tracking-[0.2em] text-text-faint">
                  Rationale
                </div>
                <p className="text-sm text-text-dim leading-relaxed">
                  {proposal.rationale}
                </p>
              </div>
            </div>
            <div className="gov-card p-6 flex flex-col h-fit divide-y divide-border-soft">
              <DetailRow label="Target program">
                <span className="text-sm text-text text-right">
                  {proposal.target_program || "—"}
                </span>
              </DetailRow>
              <DetailRow label="Requested amount">
                <span className="text-sm text-text text-right font-mono">
                  ${parseFloat(proposal.requested_amount_usd).toLocaleString()} USD
                </span>
              </DetailRow>
              <DetailRow label="Recipient">
                <AddressDisplay
                  address={proposal.recipient}
                  className="text-sm text-text"
                  showCopy
                />
              </DetailRow>
              <DetailRow label="Submitter">
                <AddressDisplay
                  address={proposal.submitter}
                  className="text-sm text-text"
                  showCopy
                />
              </DetailRow>
            </div>
          </div>

          {/* Progress Reports */}
          {canReport && (
            <section className="space-y-6 pt-4">
              <div className="flex items-end justify-between border-b border-border-soft pb-4">
                <div className="flex items-baseline gap-3">
                  <FileText className="w-3.5 h-3.5 text-text-faint self-center" />
                  <h2 className="text-[11px] font-mono tracking-[0.25em] text-text-faint">
                    Progress reports
                  </h2>
                  <span className="font-mono text-[11px] text-text-faint">
                    {reports.length.toString().padStart(2, "0")}
                  </span>
                </div>
                <button
                  onClick={() => setShowReportForm((v) => !v)}
                  className="text-[11px] font-mono tracking-[0.2em] text-accent hover:text-accent/80 transition-colors"
                >
                  + Submit report
                </button>
              </div>

              {showReportForm && (
                <ReportForm
                  proposalId={proposalId}
                  onSuccess={() => {
                    setShowReportForm(false);
                    refetchReports();
                  }}
                  onCancel={() => setShowReportForm(false)}
                />
              )}

              {reports.length === 0 && !showReportForm ? (
                <div className="gov-card p-10 text-center">
                  <p className="text-sm text-text-dim">No progress reports yet.</p>
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

// ─── Score cell (matches Trust Moment card) ─────────────────────────────────

function Score({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-mono text-text-faint tracking-[0.2em]">
        {label}
      </div>
      <div className={`text-xl md:text-2xl font-semibold tracking-tight ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

// ─── Detail row ─────────────────────────────────────────────────────────────

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <span className="text-[10px] font-mono tracking-[0.2em] text-text-faint shrink-0">
        {label}
      </span>
      <div className="flex items-center justify-end">{children}</div>
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

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
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
    <div className="rounded-2xl bg-bg-elev border border-border-soft p-8 animate-fade-in">
      <h3 className="text-[11px] font-mono tracking-[0.25em] text-text-dim mb-6 border-b border-border-soft pb-4">
        Submit progress report
      </h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-[0.2em] text-text-faint block">
              Milestones completed
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
              Funds spent (USD)
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
          <div className="rounded-xl border border-accent/25 bg-accent-bg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-mono tracking-[0.25em] text-accent">
                Validators deliberating
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
            {isPending ? "Submitting…" : "Submit report"}
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

  const roiPill = ROI_STATUS_PILL[report.roi_status];

  return (
    <div className="rounded-2xl bg-bg-elev border border-border-soft p-6 md:p-8 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[11px] text-text-faint tracking-wider">
            Report № {report.report_number}
          </span>
          {report.evaluated && roiPill && (
            <span
              className={`font-mono text-[10px] px-2.5 py-0.5 rounded-full border ${roiPill.cls}`}
            >
              {roiPill.label}
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
            {isPending ? "Evaluating…" : "Evaluate report"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs border-y border-border-soft py-4">
        <div className="space-y-1.5">
          <span className="font-mono text-text-faint tracking-[0.2em] text-[10px]">
            Milestones
          </span>
          <p className="text-text-dim">{report.milestones_completed}</p>
        </div>
        <div className="space-y-1.5">
          <span className="font-mono text-text-faint tracking-[0.2em] text-[10px]">
            Funds spent
          </span>
          <p className="text-text-dim font-mono">${report.funds_spent_usd}</p>
        </div>
      </div>

      <div className="text-xs space-y-1.5">
        <span className="font-mono text-text-faint tracking-[0.2em] text-[10px]">
          Deliverables
        </span>
        <p className="text-text-dim leading-relaxed text-sm">{report.deliverables}</p>
      </div>

      {report.evidence_urls && (
        <div className="text-xs space-y-1.5">
          <span className="font-mono text-text-faint tracking-[0.2em] text-[10px]">
            Evidence
          </span>
          <p className="text-accent/80 font-mono break-all">{report.evidence_urls}</p>
        </div>
      )}

      {report.evaluated && report.ai_summary && (
        <div className="border-t border-border-soft pt-4 space-y-1.5">
          <span className="font-mono text-text-faint tracking-[0.2em] text-[10px]">
            AI assessment
          </span>
          <p className="text-text-dim text-sm leading-relaxed">{report.ai_summary}</p>
        </div>
      )}
    </div>
  );
}
