import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay, verifyUndeterminedTx } from "@/lib/server/genlayer-relay";
import { getRetryStore } from "@/lib/server/retry-store";
import { requireInt, requireObject, requireString } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  proposalId: number;
  reportNumber: number;
  // Optional: hash of an UNDETERMINED evaluate_report tx for this same
  // (proposalId, reportNumber). When valid, the retry runs free.
  retryOfTxHash?: string;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "evaluate-report",
    paid: async (data) => {
      if (!data.retryOfTxHash) {
        return { routeId: "evaluate-report" };
      }
      const check = await verifyUndeterminedTx(data.retryOfTxHash, [
        "evaluate_report",
      ]);
      if (!check.ok) {
        return { reject: { status: 400, error: check.reason || "Invalid retry token" } };
      }
      const originalProposalId = Number(check.args?.[0]);
      const originalReportNumber = Number(check.args?.[1]);
      if (
        !Number.isInteger(originalProposalId) ||
        originalProposalId !== data.proposalId ||
        !Number.isInteger(originalReportNumber) ||
        originalReportNumber !== data.reportNumber
      ) {
        return {
          reject: {
            status: 400,
            error: "Retry token does not match this report",
          },
        };
      }
      const claimed = await getRetryStore().claim(data.retryOfTxHash);
      if (!claimed) {
        return {
          reject: {
            status: 409,
            error: "Free retry already used for this transaction",
          },
        };
      }
      return false;
    },
    validate: (data) => {
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const proposalId = requireInt(obj.value.proposalId, "proposalId", { min: 0, max: 4294967295 });
      if (!proposalId.ok) return proposalId;
      const reportNumber = requireInt(obj.value.reportNumber, "reportNumber", { min: 0, max: 4294967295 });
      if (!reportNumber.ok) return reportNumber;
      let retryOfTxHash: string | undefined;
      if (obj.value.retryOfTxHash !== undefined) {
        const h = requireString(obj.value.retryOfTxHash, "retryOfTxHash", { max: 80 });
        if (!h.ok) return h;
        if (!/^0x[a-fA-F0-9]{40,}$/.test(h.value)) {
          return { ok: false, message: "retryOfTxHash must be a 0x-prefixed hex hash" };
        }
        retryOfTxHash = h.value;
      }
      return {
        ok: true,
        value: {
          proposalId: proposalId.value,
          reportNumber: reportNumber.value,
          retryOfTxHash,
        },
      };
    },
    execute: async ({ data }) => {
      const tx = await genlayerRelay.evaluateReport(data.proposalId, data.reportNumber);
      return { genlayerTxHash: tx };
    },
  });
}
