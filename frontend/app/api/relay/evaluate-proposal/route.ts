import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay, verifyUndeterminedTx } from "@/lib/server/genlayer-relay";
import { getRetryStore } from "@/lib/server/retry-store";
import { requireInt, requireObject, requireString } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  proposalId: number;
  // Optional: hash of an UNDETERMINED evaluate_proposal tx for this same
  // proposalId. When present and valid, the retry runs free of charge (one
  // free retry per undetermined tx, tracked server-side).
  retryOfTxHash?: string;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "evaluate-proposal",
    paid: async (data) => {
      if (!data.retryOfTxHash) {
        return { routeId: "evaluate-proposal" };
      }
      const check = await verifyUndeterminedTx(data.retryOfTxHash, [
        "evaluate_proposal",
      ]);
      if (!check.ok) {
        return { reject: { status: 400, error: check.reason || "Invalid retry token" } };
      }
      // The first decoded arg is proposalId.
      const originalProposalId = Number(check.args?.[0]);
      if (!Number.isInteger(originalProposalId) || originalProposalId !== data.proposalId) {
        return {
          reject: {
            status: 400,
            error: "Retry token does not match this proposal",
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
      let retryOfTxHash: string | undefined;
      if (obj.value.retryOfTxHash !== undefined) {
        const h = requireString(obj.value.retryOfTxHash, "retryOfTxHash", { max: 80 });
        if (!h.ok) return h;
        if (!/^0x[a-fA-F0-9]{40,}$/.test(h.value)) {
          return { ok: false, message: "retryOfTxHash must be a 0x-prefixed hex hash" };
        }
        retryOfTxHash = h.value;
      }
      return { ok: true, value: { proposalId: proposalId.value, retryOfTxHash } };
    },
    execute: async ({ data }) => {
      const tx = await genlayerRelay.evaluateProposal(data.proposalId);
      return { genlayerTxHash: tx };
    },
  });
}
