"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, ExternalLink, Pencil, Clock } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AddressDisplay } from "@/components/AddressDisplay";
import { EvaluationOverlay } from "@/components/EvaluationOverlay";
import { RichText, normalizeReasoning, splitConfidence } from "@/components/RichText";
import { UpdateProposalModal } from "@/components/UpdateProposalModal";
import { TeamMembersPanel } from "@/components/TeamMembersPanel";
import {
  PreliminaryProposalCard,
  PreliminaryReportCard,
} from "@/components/PreliminaryVerdictCard";
import { parsePrograms } from "@/components/CouncilCard";
import {
  useProposal,
  useOrg,
  useOrgAdmins,
  useEvaluateProposal,
  useVetoProposal,
  useProposalReports,
  useProposalTeam,
  useSubmitReport,
  useEvaluateReport,
} from "@/lib/hooks/useTreasuryPilot";
import { usePendingEvaluation, usePendingReportEvaluation } from "@/lib/hooks/usePendingEvaluation";
import {
  useUndeterminedProposalOutput,
  useUndeterminedReportOutput,
} from "@/lib/hooks/useUndeterminedOutput";
import { useWallet } from "@/lib/genlayer/wallet";
import { PaymentNote } from "@/components/PaymentNote";

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
  pivoted: { label: "Pivoted", cls: "text-vetoed border-vetoed/40 bg-vetoed/10" },
  failed: { label: "Failed", cls: "text-danger border-danger/40 bg-danger/10" },
};

const RECOMMENDED_ACTION_PILL: Record<
  string,
  { label: string; cls: string }
> = {
  continue_funding: {
    label: "Continue funding",
    cls: "text-accent border-accent/40 bg-accent/10",
  },
  pause_pending_clarification: {
    label: "Pause pending clarification",
    cls: "text-warning border-warning/40 bg-warning/10",
  },
  claw_back: {
    label: "Claw back",
    cls: "text-danger border-danger/40 bg-danger/10",
  },
  terminate: {
    label: "Terminate",
    cls: "text-danger border-danger/40 bg-danger/10",
  },
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
  const { data: team = [] } = useProposalTeam(isNaN(proposalId) ? null : proposalId);
  const { mutateAsync: evaluate, isPending: evaluating } = useEvaluateProposal();
  const { mutateAsync: veto, isPending: vetoing } = useVetoProposal();

  const {
    isPending: evaluationPending,
    elapsedMinutes,
    txHash: evalTxHash,
    markPending: markEvaluationPending,
  } = usePendingEvaluation({
    proposalId: isNaN(proposalId) ? null : proposalId,
    isEvaluated: proposal?.evaluated,
  });

  const { data: undeterminedProposal } = useUndeterminedProposalOutput({
    txHash: evalTxHash,
    enabled: evaluationPending,
  });
  const showPreliminaryProposal =
    !!undeterminedProposal && undeterminedProposal.statusName === "UNDETERMINED";

  const [showReportForm, setShowReportForm] = useState(false);
  const [showRevise, setShowRevise] = useState(false);
  // Tick every 30s so the deadline countdown stays current.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const isOwner = org && address && org.owner.toLowerCase() === address.toLowerCase();
  const isAdmin = admins.some((a) => a.toLowerCase() === address?.toLowerCase());
  const isSubmitter =
    !!proposal && !!address && proposal.submitter.toLowerCase() === address.toLowerCase();
  const canVeto = (isOwner || isAdmin) && proposal?.status === "auto_approved";
  const isProposalActive =
    !!proposal &&
    (proposal.status === "approved" || proposal.status === "auto_approved");
  const isTeamMember =
    !!address &&
    (isSubmitter ||
      team.some((a) => a.toLowerCase() === address.toLowerCase()));
  const canSubmitReport = isProposalActive && isTeamMember;
  // The reports section is visible to anyone once there are reports to read,
  // for transparency. Submission is gated to submitter + team members only.
  const showReportSection =
    isProposalActive && (reports.length > 0 || canSubmitReport);
  const programs = useMemo(() => (org ? parsePrograms(org.constitution) : []), [org]);

  const modificationDeadline =
    proposal?.modification_deadline ? Date.parse(proposal.modification_deadline) : NaN;
  // If a deadline is set, enforce it. Otherwise (e.g. legacy proposal evaluated
  // before deadline tracking shipped), allow revision while status is
  // needs_modification — the contract will still reject if its own deadline
  // check fires.
  const modificationWindowOpen =
    proposal?.status === "needs_modification" &&
    (isNaN(modificationDeadline) || modificationDeadline > Date.now());
  const canRevise = isSubmitter && modificationWindowOpen;

  const handleEvaluate = async (retryOfTxHash?: string) => {
    try {
      const result = await evaluate({ proposalId, retryOfTxHash });
      const hash = result?.data?.genlayerTxHash;
      markEvaluationPending(typeof hash === "string" ? hash : undefined);
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

            {/* AI reasoning, preliminary verdict, deliberating, or empty hint */}
            {proposal.evaluated && proposal.reasoning ? (
              <div className="space-y-4 reasoning-reveal">
                <div className="text-[10px] font-mono text-text-faint tracking-[0.2em]">
                  AI reasoning
                </div>
                {(() => {
                  const { body, confidence } = splitConfidence(
                    proposal.reasoning
                  );
                  return (
                    <>
                      <RichText text={normalizeReasoning(body)} compact />
                      {confidence && <ConfidencePill value={confidence} />}
                    </>
                  );
                })()}
              </div>
            ) : showPreliminaryProposal && undeterminedProposal && evalTxHash ? (
              <PreliminaryProposalCard
                result={undeterminedProposal}
                onRetry={() => handleEvaluate(evalTxHash)}
                onModify={() => setShowRevise(true)}
                retrying={evaluating}
                canModify={!!isSubmitter}
              />
            ) : evaluationPending ? (
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-[11px] font-mono text-accent tracking-[0.2em]">
                    AI Validators Deliberating
                  </span>
                </div>
                <p className="text-sm text-text-dim leading-relaxed">
                  Consensus takes up to 15 minutes. The result will appear here
                  automatically once they agree.
                  {elapsedMinutes > 0 && (
                    <span className="text-text-faint">
                      {" "}
                      ({elapsedMinutes} min from the request)
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <div className="text-sm text-text-dim">
                Not yet evaluated. Once validators reach consensus, scores and
                reasoning will appear here.
              </div>
            )}

            {/* Modification window banner */}
            {proposal.status === "needs_modification" && (
              <ModificationBanner
                deadlineIso={proposal.modification_deadline || ""}
                isSubmitter={isSubmitter}
                canRevise={canRevise}
                onRevise={() => setShowRevise(true)}
              />
            )}

            {/* Footer actions */}
            {(canVeto || canRevise || (!proposal.evaluated && !evaluationPending && isConnected)) && (
              <div className="border-t border-border-soft pt-5 flex flex-wrap items-center gap-3">
                {!proposal.evaluated && !evaluationPending && isConnected && (
                  <>
                    <button
                      onClick={() => handleEvaluate()}
                      disabled={evaluating}
                      className="px-6 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/50 hover:bg-accent/10 hover:border-accent/70 disabled:opacity-40 transition-all"
                    >
                      {evaluating ? "Submitting…" : "Request AI evaluation"}
                    </button>
                    <PaymentNote routeId="evaluate-proposal" variant="inline" />
                  </>
                )}
                {canRevise && (
                  <button
                    onClick={() => setShowRevise(true)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-warning border border-warning/50 hover:bg-warning/10 hover:border-warning/70 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Revise proposal
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
              <div className="gov-card p-6 space-y-4">
                <div className="text-[10px] font-mono tracking-[0.2em] text-text-faint">
                  Description
                </div>
                <RichText text={proposal.description} compact />
              </div>
              <div className="gov-card p-6 space-y-4">
                <div className="text-[10px] font-mono tracking-[0.2em] text-text-faint">
                  Rationale
                </div>
                <RichText text={proposal.rationale} compact />
              </div>
            </div>
            <div className="space-y-4 h-fit">
              <div className="gov-card p-6 flex flex-col divide-y divide-border-soft">
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

              {/* Reporting team — only the submitter sees this panel, and only
                  once the proposal has reached a stage where team membership
                  is meaningful: needs_modification, approved, or auto_approved. */}
              {isSubmitter &&
                (proposal.status === "needs_modification" ||
                  proposal.status === "approved" ||
                  proposal.status === "auto_approved") && (
                  <TeamMembersPanel
                    proposalId={proposalId}
                    submitter={proposal.submitter}
                    isSubmitter={!!isSubmitter}
                  />
                )}
            </div>
          </div>

          {/* Progress Reports */}
          {showReportSection && (
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
                {canSubmitReport ? (
                  <button
                    onClick={() => setShowReportForm((v) => !v)}
                    className="text-[11px] font-mono tracking-[0.2em] text-accent hover:text-accent/80 transition-colors"
                  >
                    + Submit report
                  </button>
                ) : (
                  <span className="text-[10px] font-mono tracking-[0.2em] text-text-faint">
                    Submitter & team only
                  </span>
                )}
              </div>

              {showReportForm && canSubmitReport && (
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

      {showRevise && proposal && (
        <UpdateProposalModal
          proposal={proposal}
          programs={programs}
          defaultWindowHours={org?.modification_window_hours ?? 48}
          onClose={() => setShowRevise(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}

// ─── Modification banner ────────────────────────────────────────────────────

function ModificationBanner({
  deadlineIso,
  isSubmitter,
  canRevise,
  onRevise,
}: {
  deadlineIso: string;
  isSubmitter: boolean;
  canRevise: boolean;
  onRevise: () => void;
}) {
  const ts = Date.parse(deadlineIso);
  const hasDeadline = !isNaN(ts);
  const diff = hasDeadline ? ts - Date.now() : Infinity;
  const expired = hasDeadline && diff <= 0;
  const hours = Math.max(0, Math.floor((hasDeadline ? diff : 0) / 3_600_000));
  const minutes = Math.max(0, Math.floor(((hasDeadline ? diff : 0) % 3_600_000) / 60_000));
  const days = Math.floor(hours / 24);
  const hoursOfDay = hours % 24;
  const remainingLabel = !hasDeadline
    ? "Open for revision"
    : expired
    ? "Modification window closed"
    : days > 0
    ? `${days}d ${hoursOfDay}h remaining`
    : `${hours}h ${minutes}m remaining`;

  const cls = expired
    ? "border-danger/30 bg-danger/5 text-danger"
    : "border-warning/30 bg-warning/5 text-warning";

  return (
    <div className={`rounded-2xl border ${cls} p-4 flex flex-wrap items-center gap-3`}>
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-mono tracking-[0.2em]">
          {remainingLabel}
        </div>
        <p className="text-xs text-text-dim leading-relaxed mt-1">
          {expired
            ? "The submitter cannot revise this proposal anymore. The org owner can extend the modification window in settings."
            : isSubmitter
            ? "Revise the proposal to address the AI's required changes, then request a new evaluation."
            : "The submitter still has time to address the AI's required changes."}
        </p>
      </div>
      {canRevise && (
        <button
          onClick={onRevise}
          className="text-[11px] font-mono tracking-[0.2em] text-warning hover:text-warning/80 transition-colors shrink-0"
        >
          Revise →
        </button>
      )}
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
      const result = await mutateAsync({
        proposalId,
        milestonesCompleted: form.milestones,
        fundsSpentUsd: form.fundsSpent,
        deliverables: form.deliverables,
        evidenceUrls: form.evidenceUrls,
      });
      const hash = result?.data?.genlayerTxHash;
      if (typeof hash === "string") setTxHash(hash);
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

        <PaymentNote routeId="submit-report" />

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

  const {
    isPending: evalPending,
    elapsedMinutes,
    txHash: reportEvalTxHash,
    markPending,
  } = usePendingReportEvaluation({
    proposalId,
    reportNumber: report.report_number,
    isEvaluated: report.evaluated,
  });

  const { data: undeterminedReport } = useUndeterminedReportOutput({
    txHash: reportEvalTxHash,
    enabled: evalPending,
  });
  const showPreliminaryReport =
    !!undeterminedReport && undeterminedReport.statusName === "UNDETERMINED";

  const handleEvaluate = async (retryOfTxHash?: string) => {
    try {
      const result = await evalReport({
        proposalId,
        reportNumber: report.report_number,
        retryOfTxHash,
      });
      const hash = result?.data?.genlayerTxHash;
      markPending(typeof hash === "string" ? hash : undefined);
      onEvaluated();
    } catch {}
  };

  const roiPill = ROI_STATUS_PILL[report.roi_status];
  const actionPill = report.recommended_action
    ? RECOMMENDED_ACTION_PILL[report.recommended_action]
    : undefined;

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
          {report.evaluated && actionPill && (
            <span
              className={`font-mono text-[10px] px-2.5 py-0.5 rounded-full border ${actionPill.cls}`}
            >
              {actionPill.label}
            </span>
          )}
          {report.evaluated && (
            <span className="font-mono text-[11px] text-text-faint">
              Progress <span className="text-text">{report.progress_score}/10</span>
            </span>
          )}
        </div>
        {!report.evaluated && !evalPending && isConnected && (
          <div className="flex items-center gap-3 shrink-0">
            <PaymentNote routeId="evaluate-report" variant="inline" />
            <button
              onClick={() => handleEvaluate()}
              disabled={isPending}
              className="text-[10px] font-mono tracking-[0.2em] text-accent hover:text-accent/80 disabled:opacity-40 transition-colors"
            >
              {isPending ? "Submitting…" : "Evaluate report"}
            </button>
          </div>
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
        <div className="border-t border-border-soft pt-4 space-y-3">
          <span className="font-mono text-text-faint tracking-[0.2em] text-[10px]">
            AI assessment
          </span>
          {(() => {
            const { body, confidence } = splitConfidence(report.ai_summary);
            return (
              <>
                <RichText text={normalizeReasoning(body)} compact />
                {confidence && <ConfidencePill value={confidence} />}
              </>
            );
          })()}
        </div>
      )}

      {!report.evaluated && showPreliminaryReport && undeterminedReport && reportEvalTxHash && (
        <div className="border-t border-border-soft pt-4">
          <PreliminaryReportCard
            result={undeterminedReport}
            onRetry={() => handleEvaluate(reportEvalTxHash)}
            retrying={isPending}
          />
        </div>
      )}

      {!report.evaluated && evalPending && !showPreliminaryReport && (
        <div className="border-t border-border-soft pt-4">
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-mono text-accent tracking-[0.2em]">
                AI Validators Deliberating
              </span>
            </div>
            <p className="text-sm text-text-dim leading-relaxed">
              Consensus typically takes up to 15 minutes. The result will appear here
              automatically once they agree.
              {elapsedMinutes > 0 && (
                <span className="text-text-faint">
                  {" "}
                  ({elapsedMinutes} min from the request)
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Confidence pill ────────────────────────────────────────────────────────

const CONFIDENCE_PILL: Record<"high" | "medium" | "low", string> = {
  high: "text-accent border-accent/40 bg-accent/10",
  medium: "text-warning border-warning/40 bg-warning/10",
  low: "text-danger border-danger/40 bg-danger/10",
};

function ConfidencePill({ value }: { value: "high" | "medium" | "low" }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-[10px] font-mono tracking-[0.25em] text-text-faint">
        CONFIDENCE
      </span>
      <span
        className={`text-[10px] font-mono tracking-[0.25em] px-2.5 py-1 rounded-full border uppercase ${CONFIDENCE_PILL[value]}`}
      >
        {value}
      </span>
    </div>
  );
}
