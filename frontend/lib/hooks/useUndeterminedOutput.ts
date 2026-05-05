"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";

export type ProposalLeaderOutput = {
  alignment_score: number;
  risk_level: string;
  roi_assessment: string;
  recommendation: string;
  reasoning: string;
};

export type ReportLeaderOutput = {
  progress_score: number;
  roi_status: string;
  ai_summary: string;
  recommended_action: string;
};

export interface UndeterminedResult<T> {
  output: T | null;
  // For each output field, list of distinct values seen across rotations.
  // A field is "disputed" when this array has length > 1.
  perFieldRotations: Record<keyof T, unknown[]>;
  rotationCount: number;
  statusName: string;
}

let cachedClient: ReturnType<typeof createClient> | null = null;
function getClient() {
  if (cachedClient) return cachedClient;
  cachedClient = createClient({ chain: studionet, endpoint: RPC_URL } as any);
  return cachedClient;
}

/**
 * Walk a leader-receipt object and extract the leader's structured return
 * value. The shape varies by runtime; we try a few likely paths defensively.
 */
function extractLeaderReturn(receipt: any): Record<string, unknown> | null {
  if (!receipt || typeof receipt !== "object") return null;
  // 1) Direct on receipt — sometimes the structured return is mirrored here.
  for (const key of ["return_value", "result_value", "output"]) {
    const v = receipt[key];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
  }
  // 2) eq_outputs is a dict keyed by validator/round; pick the first object value.
  const eq = receipt.eq_outputs;
  if (eq && typeof eq === "object") {
    for (const v of Object.values(eq)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const candidate = v as Record<string, unknown>;
        if (
          "alignment_score" in candidate ||
          "recommendation" in candidate ||
          "progress_score" in candidate ||
          "roi_status" in candidate
        ) {
          return candidate;
        }
        // Some runtimes wrap one more level: { value: { ... } }
        const nested = (candidate as any).value;
        if (nested && typeof nested === "object") {
          return nested as Record<string, unknown>;
        }
      }
      // 3) eq_outputs may contain a JSON string.
      if (typeof v === "string") {
        try {
          const parsed = JSON.parse(v);
          if (parsed && typeof parsed === "object") {
            return parsed as Record<string, unknown>;
          }
        } catch {
          // fall through
        }
      }
    }
  }
  return null;
}

function fieldsFromOutputs<T extends Record<string, unknown>>(
  outputs: Array<Record<string, unknown> | null>,
  keys: (keyof T)[]
): Record<keyof T, unknown[]> {
  const map = {} as Record<keyof T, unknown[]>;
  for (const k of keys) {
    const seen: unknown[] = [];
    for (const o of outputs) {
      if (!o) continue;
      const v = o[k as string];
      if (v === undefined || v === null) continue;
      if (!seen.some((existing) => deepEqual(existing, v))) {
        seen.push(v);
      }
    }
    map[k] = seen;
  }
  return map;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === "number" && typeof b === "number") return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}

async function fetchUndetermined<T extends Record<string, unknown>>(
  txHash: string,
  keys: (keyof T)[]
): Promise<UndeterminedResult<T> | null> {
  const client = getClient();
  let tx: any;
  try {
    tx = await (client as any).getTransaction({ hash: txHash });
  } catch {
    return null;
  }
  if (!tx) return null;
  const statusName = String(tx.statusName || "").toUpperCase();

  // We only surface the preliminary view once consensus has actually failed.
  // While the tx is mid-flight (PROPOSING/COMMITTING/REVEALING/etc.) we
  // signal that to the caller via statusName so the UI can keep showing
  // "Deliberating".
  if (statusName !== "UNDETERMINED") {
    return {
      output: null,
      perFieldRotations: {} as Record<keyof T, unknown[]>,
      rotationCount: 0,
      statusName,
    };
  }

  const receipts: any[] = Array.isArray(tx.consensus_data?.leader_receipt)
    ? tx.consensus_data.leader_receipt
    : [];
  const outputs = receipts.map(extractLeaderReturn);
  const lastNonNull = [...outputs].reverse().find((o) => o !== null) ?? null;

  const output = lastNonNull
    ? (lastNonNull as unknown as T)
    : null;

  return {
    output,
    perFieldRotations: fieldsFromOutputs<T>(outputs, keys),
    rotationCount: receipts.length,
    statusName,
  };
}

export function useUndeterminedProposalOutput(args: {
  txHash: string | undefined;
  enabled?: boolean;
}) {
  const enabled = !!args.txHash && args.enabled !== false;
  const txHash = args.txHash;
  const keys = useMemo(
    () =>
      [
        "alignment_score",
        "risk_level",
        "roi_assessment",
        "recommendation",
        "reasoning",
      ] as (keyof ProposalLeaderOutput)[],
    []
  );
  return useQuery<UndeterminedResult<ProposalLeaderOutput> | null, Error>({
    queryKey: ["undeterminedProposal", txHash],
    queryFn: () =>
      txHash ? fetchUndetermined<ProposalLeaderOutput>(txHash, keys) : Promise.resolve(null),
    enabled,
    staleTime: 5_000,
    refetchInterval: (q) => {
      const data = q.state.data as UndeterminedResult<ProposalLeaderOutput> | null | undefined;
      // Keep polling while the tx hasn't reached UNDETERMINED yet (it may
      // still be in flight). Stop once we have a final undetermined snapshot
      // or when there's nothing to query.
      if (!enabled) return false;
      if (data && data.statusName === "UNDETERMINED") return false;
      return 8_000;
    },
  });
}

export function useUndeterminedReportOutput(args: {
  txHash: string | undefined;
  enabled?: boolean;
}) {
  const enabled = !!args.txHash && args.enabled !== false;
  const txHash = args.txHash;
  const keys = useMemo(
    () =>
      [
        "progress_score",
        "roi_status",
        "ai_summary",
        "recommended_action",
      ] as (keyof ReportLeaderOutput)[],
    []
  );
  return useQuery<UndeterminedResult<ReportLeaderOutput> | null, Error>({
    queryKey: ["undeterminedReport", txHash],
    queryFn: () =>
      txHash ? fetchUndetermined<ReportLeaderOutput>(txHash, keys) : Promise.resolve(null),
    enabled,
    staleTime: 5_000,
    refetchInterval: (q) => {
      const data = q.state.data as UndeterminedResult<ReportLeaderOutput> | null | undefined;
      if (!enabled) return false;
      if (data && data.statusName === "UNDETERMINED") return false;
      return 8_000;
    },
  });
}
