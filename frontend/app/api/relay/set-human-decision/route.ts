import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import { requireInt, requireObject, requireString } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_VERDICTS = new Set(["", "approved", "rejected", "modify"]);

interface Data {
  proposalId: number;
  verdict: string;
  reason: string;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "set-human-decision",
    paid: false,
    validate: (data) => {
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const proposalId = requireInt(obj.value.proposalId, "proposalId", { min: 0, max: 4294967295 });
      if (!proposalId.ok) return proposalId;
      // verdict allows empty string (clearing), so don't use requireString.
      if (typeof obj.value.verdict !== "string") {
        return { ok: false, message: "verdict must be a string" };
      }
      const verdict = obj.value.verdict.trim();
      if (!VALID_VERDICTS.has(verdict)) {
        return {
          ok: false,
          message: "verdict must be 'approved', 'rejected', 'modify', or empty to clear",
        };
      }
      // reason allows empty string and is bounded.
      if (typeof obj.value.reason !== "string") {
        return { ok: false, message: "reason must be a string" };
      }
      const reason = obj.value.reason;
      if (reason.length > 4096) {
        return { ok: false, message: "reason exceeds 4096 chars" };
      }
      return {
        ok: true,
        value: { proposalId: proposalId.value, verdict, reason },
      };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.setHumanDecision(
        actor,
        data.proposalId,
        data.verdict,
        data.reason
      );
      return { genlayerTxHash: tx };
    },
  });
}
