"use client";

import { AlertTriangle, RotateCw, Pencil } from "lucide-react";
import { RichText, normalizeReasoning, splitConfidence } from "./RichText";
import type {
  ProposalLeaderOutput,
  ReportLeaderOutput,
  UndeterminedResult,
} from "@/lib/hooks/useUndeterminedOutput";

const RISK_LABEL: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };
const RISK_COLOR: Record<string, string> = {
  low: "text-accent",
  medium: "text-warning",
  high: "text-danger",
};
const ROI_LABEL: Record<string, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};
const ROI_COLOR: Record<string, string> = {
  positive: "text-accent",
  neutral: "text-text-dim",
  negative: "text-danger",
};
const REC_LABEL: Record<string, string> = {
  approve: "Approve",
  reject: "Reject",
  modify: "Modify",
};
const REC_COLOR: Record<string, string> = {
  approve: "text-accent",
  reject: "text-danger",
  modify: "text-warning",
};

const ROI_STATUS_LABEL: Record<string, string> = {
  on_track: "On track",
  at_risk: "At risk",
  exceeding: "Exceeding",
  pivoted: "Pivoted",
  failed: "Failed",
};
const ROI_STATUS_COLOR: Record<string, string> = {
  on_track: "text-accent",
  at_risk: "text-warning",
  exceeding: "text-accent",
  pivoted: "text-vetoed",
  failed: "text-danger",
};

const ACTION_LABEL: Record<string, string> = {
  continue_funding: "Continue funding",
  pause_pending_clarification: "Pause pending clarification",
  claw_back: "Claw back",
  terminate: "Terminate",
};
const ACTION_COLOR: Record<string, string> = {
  continue_funding: "text-accent",
  pause_pending_clarification: "text-warning",
  claw_back: "text-danger",
  terminate: "text-danger",
};

function isDisputed<T extends Record<string, unknown>>(
  rotations: Record<keyof T, unknown[]> | undefined,
  key: keyof T,
  scoreTolerance?: number
): { disputed: boolean; values: unknown[] } {
  const seen = rotations?.[key] ?? [];
  if (scoreTolerance !== undefined && seen.length > 1) {
    const nums = seen.filter((v): v is number => typeof v === "number");
    if (nums.length === seen.length) {
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      return { disputed: max - min > scoreTolerance, values: seen };
    }
  }
  return { disputed: seen.length > 1, values: seen };
}

function DisputedMark({ values }: { values: unknown[] }) {
  if (values.length <= 1) return null;
  const tooltip = `Validators saw mixed signals across rotations: ${values
    .map((v) => String(v))
    .join(" / ")}`;
  return (
    <span
      title={tooltip}
      className="text-warning ml-1 cursor-help align-super text-xs"
      aria-label="Validators disagreed across rotations"
    >
      *
    </span>
  );
}

function PreliminaryHeader({ rotationCount }: { rotationCount: number }) {
  return (
    <div className="flex items-start gap-3 border-b border-warning/30 pb-4">
      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-mono text-warning tracking-[0.2em]">
          Validators couldn't reach consensus
        </div>
        <p className="text-xs text-text-dim leading-relaxed mt-1">
          The AI validators ran {rotationCount}{" "}
          {rotationCount === 1 ? "rotation" : "rotations"} and couldn't agree.
          Below is the most recent leader's preliminary view — it has{" "}
          <span className="text-warning">not</span> been committed on-chain.
          Fields marked <span className="text-warning">*</span> were
          contested across rotations.
        </p>
      </div>
    </div>
  );
}

function Score({
  label,
  value,
  valueClass,
  disputed,
  values,
}: {
  label: string;
  value: string;
  valueClass: string;
  disputed?: boolean;
  values?: unknown[];
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-mono text-text-faint tracking-[0.2em]">
        {label}
      </div>
      <div className={`text-xl md:text-2xl font-semibold tracking-tight ${valueClass}`}>
        {value}
        {disputed && values && <DisputedMark values={values} />}
      </div>
    </div>
  );
}

function PreliminaryActions({
  onRetry,
  onModify,
  retrying,
  showModify,
}: {
  onRetry: () => void;
  onModify?: () => void;
  retrying: boolean;
  showModify: boolean;
}) {
  return (
    <div className="border-t border-border-soft pt-5 flex flex-wrap items-center gap-3">
      <button
        onClick={onRetry}
        disabled={retrying}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/50 hover:bg-accent/10 hover:border-accent/70 disabled:opacity-40 transition-all"
      >
        <RotateCw className="w-3.5 h-3.5" />
        {retrying ? "Submitting…" : "Retry evaluation"}
      </button>
      <span className="text-[11px] font-mono text-text-faint">
        Free — already paid for the original evaluation
      </span>
      {showModify && onModify && (
        <button
          onClick={onModify}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-warning border border-warning/50 hover:bg-warning/10 hover:border-warning/70 transition-all ml-auto"
        >
          <Pencil className="w-3.5 h-3.5" />
          Modify before retry
        </button>
      )}
    </div>
  );
}

// ─── Proposal preliminary verdict ───────────────────────────────────────────

interface PreliminaryProposalCardProps {
  result: UndeterminedResult<ProposalLeaderOutput>;
  onRetry: () => void;
  onModify?: () => void;
  retrying: boolean;
  canModify: boolean;
}

export function PreliminaryProposalCard({
  result,
  onRetry,
  onModify,
  retrying,
  canModify,
}: PreliminaryProposalCardProps) {
  const o = result.output;
  if (!o) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5 space-y-3">
        <PreliminaryHeader rotationCount={result.rotationCount} />
        <p className="text-sm text-text-dim">
          The leader's output couldn't be parsed from the transaction. Retry to
          get a fresh evaluation.
        </p>
        <PreliminaryActions
          onRetry={onRetry}
          onModify={onModify}
          retrying={retrying}
          showModify={canModify}
        />
      </div>
    );
  }

  const score = isDisputed(result.perFieldRotations, "alignment_score", 1);
  const risk = isDisputed(result.perFieldRotations, "risk_level");
  const roi = isDisputed(result.perFieldRotations, "roi_assessment");

  const { body, confidence } = splitConfidence(String(o.reasoning ?? ""));

  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/5 p-6 md:p-8 space-y-6">
      <PreliminaryHeader rotationCount={result.rotationCount} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-y border-warning/20 py-6">
        <Score
          label="Alignment"
          value={`${o.alignment_score} / 10`}
          valueClass="text-text"
          disputed={score.disputed}
          values={score.values}
        />
        <Score
          label="Risk"
          value={RISK_LABEL[o.risk_level] ?? o.risk_level ?? "—"}
          valueClass={RISK_COLOR[o.risk_level] ?? "text-text"}
          disputed={risk.disputed}
          values={risk.values}
        />
        <Score
          label="ROI"
          value={ROI_LABEL[o.roi_assessment] ?? o.roi_assessment ?? "—"}
          valueClass={ROI_COLOR[o.roi_assessment] ?? "text-text"}
          disputed={roi.disputed}
          values={roi.values}
        />
        <Score
          label="Recommendation"
          value={REC_LABEL[o.recommendation] ?? o.recommendation ?? "—"}
          valueClass={REC_COLOR[o.recommendation] ?? "text-text"}
        />
      </div>

      {body && (
        <div className="space-y-3">
          <div className="text-[10px] font-mono text-text-faint tracking-[0.2em]">
            Leader's reasoning
            <span className="text-text-faint/60 ml-2">
              · From rotation {result.rotationCount} of {result.rotationCount}
            </span>
          </div>
          <RichText text={normalizeReasoning(body)} compact />
          {confidence && (
            <div className="flex items-center gap-3 pt-2">
              <span className="text-[10px] font-mono tracking-[0.25em] text-text-faint">
                CONFIDENCE
              </span>
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-text-dim">
                {confidence}
              </span>
            </div>
          )}
        </div>
      )}

      <PreliminaryActions
        onRetry={onRetry}
        onModify={onModify}
        retrying={retrying}
        showModify={canModify}
      />
    </div>
  );
}

// ─── Report preliminary verdict ─────────────────────────────────────────────

interface PreliminaryReportCardProps {
  result: UndeterminedResult<ReportLeaderOutput>;
  onRetry: () => void;
  retrying: boolean;
}

export function PreliminaryReportCard({
  result,
  onRetry,
  retrying,
}: PreliminaryReportCardProps) {
  const o = result.output;
  if (!o) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5 space-y-3">
        <PreliminaryHeader rotationCount={result.rotationCount} />
        <p className="text-sm text-text-dim">
          The leader's output couldn't be parsed. Retry to get a fresh evaluation.
        </p>
        <PreliminaryActions
          onRetry={onRetry}
          retrying={retrying}
          showModify={false}
        />
      </div>
    );
  }

  const score = isDisputed(result.perFieldRotations, "progress_score", 1);
  const roi = isDisputed(result.perFieldRotations, "roi_status");
  const action = isDisputed(result.perFieldRotations, "recommended_action");

  const { body, confidence } = splitConfidence(String(o.ai_summary ?? ""));

  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/5 p-6 md:p-8 space-y-6">
      <PreliminaryHeader rotationCount={result.rotationCount} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 border-y border-warning/20 py-6">
        <Score
          label="Progress"
          value={`${o.progress_score} / 10`}
          valueClass="text-text"
          disputed={score.disputed}
          values={score.values}
        />
        <Score
          label="ROI status"
          value={ROI_STATUS_LABEL[o.roi_status] ?? o.roi_status ?? "—"}
          valueClass={ROI_STATUS_COLOR[o.roi_status] ?? "text-text"}
          disputed={roi.disputed}
          values={roi.values}
        />
        <Score
          label="Recommended action"
          value={ACTION_LABEL[o.recommended_action] ?? o.recommended_action ?? "—"}
          valueClass={ACTION_COLOR[o.recommended_action] ?? "text-text"}
          disputed={action.disputed}
          values={action.values}
        />
      </div>

      {body && (
        <div className="space-y-3">
          <div className="text-[10px] font-mono text-text-faint tracking-[0.2em]">
            Leader's summary
            <span className="text-text-faint/60 ml-2">
              · From rotation {result.rotationCount} of {result.rotationCount}
            </span>
          </div>
          <RichText text={normalizeReasoning(body)} compact />
          {confidence && (
            <div className="flex items-center gap-3 pt-2">
              <span className="text-[10px] font-mono tracking-[0.25em] text-text-faint">
                CONFIDENCE
              </span>
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-text-dim">
                {confidence}
              </span>
            </div>
          )}
        </div>
      )}

      <PreliminaryActions
        onRetry={onRetry}
        retrying={retrying}
        showModify={false}
      />
    </div>
  );
}
