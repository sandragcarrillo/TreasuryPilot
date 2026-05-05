"use client";

import { useCallback, useEffect, useState } from "react";

const STALE_AFTER_MS = 30 * 60 * 1000; // 30 min — generous upper bound for consensus

interface PendingRecord {
  ts: number;
  txHash?: string;
}

function readPending(key: string): PendingRecord | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  let parsed: PendingRecord;
  // Backward compat: old entries stored just the timestamp as a string.
  if (/^\d+$/.test(raw)) {
    parsed = { ts: Number(raw) };
  } else {
    try {
      parsed = JSON.parse(raw) as PendingRecord;
    } catch {
      return null;
    }
  }
  if (!Number.isFinite(parsed.ts)) return null;
  if (Date.now() - parsed.ts > STALE_AFTER_MS) {
    localStorage.removeItem(key);
    return null;
  }
  return parsed;
}

function usePendingByKey(args: {
  key: string | null;
  isResolved: boolean | undefined;
}) {
  const { key, isResolved } = args;
  const [record, setRecord] = useState<PendingRecord | null>(null);

  useEffect(() => {
    if (!key) return;
    setRecord(readPending(key));
  }, [key]);

  useEffect(() => {
    if (!key) return;
    if (isResolved && record !== null) {
      localStorage.removeItem(key);
      setRecord(null);
    }
  }, [key, isResolved, record]);

  const markPending = useCallback(
    (txHash?: string) => {
      if (!key) return;
      const next: PendingRecord = { ts: Date.now(), txHash };
      localStorage.setItem(key, JSON.stringify(next));
      setRecord(next);
    },
    [key]
  );

  const clearPending = useCallback(() => {
    if (!key) return;
    localStorage.removeItem(key);
    setRecord(null);
  }, [key]);

  const isPending = record !== null && !isResolved;
  const elapsedMinutes = record ? Math.floor((Date.now() - record.ts) / 60000) : 0;
  const txHash = record?.txHash;

  return { isPending, pendingSince: record?.ts ?? null, elapsedMinutes, txHash, markPending, clearPending };
}

export function usePendingEvaluation(args: {
  proposalId: number | null;
  isEvaluated: boolean | undefined;
}) {
  const key = args.proposalId == null ? null : `tp:eval-pending:${args.proposalId}`;
  return usePendingByKey({ key, isResolved: args.isEvaluated });
}

export function usePendingReportEvaluation(args: {
  proposalId: number | null;
  reportNumber: number | null;
  isEvaluated: boolean | undefined;
}) {
  const key =
    args.proposalId == null || args.reportNumber == null
      ? null
      : `tp:report-eval-pending:${args.proposalId}:${args.reportNumber}`;
  return usePendingByKey({ key, isResolved: args.isEvaluated });
}
