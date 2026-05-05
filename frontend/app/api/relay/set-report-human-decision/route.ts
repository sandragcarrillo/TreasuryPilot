import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import { requireInt, requireObject } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ACTIONS = new Set([
  "",
  "continue_funding",
  "pause_pending_clarification",
  "claw_back",
  "terminate",
]);

interface Data {
  proposalId: number;
  reportNumber: number;
  action: string;
  reason: string;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "set-report-human-decision",
    paid: false,
    validate: (data) => {
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const proposalId = requireInt(obj.value.proposalId, "proposalId", { min: 0, max: 4294967295 });
      if (!proposalId.ok) return proposalId;
      const reportNumber = requireInt(obj.value.reportNumber, "reportNumber", { min: 0, max: 4294967295 });
      if (!reportNumber.ok) return reportNumber;
      if (typeof obj.value.action !== "string") {
        return { ok: false, message: "action must be a string" };
      }
      const action = obj.value.action.trim();
      if (!VALID_ACTIONS.has(action)) {
        return {
          ok: false,
          message:
            "action must be 'continue_funding', 'pause_pending_clarification', 'claw_back', 'terminate', or empty to clear",
        };
      }
      if (typeof obj.value.reason !== "string") {
        return { ok: false, message: "reason must be a string" };
      }
      const reason = obj.value.reason;
      if (reason.length > 4096) {
        return { ok: false, message: "reason exceeds 4096 chars" };
      }
      return {
        ok: true,
        value: {
          proposalId: proposalId.value,
          reportNumber: reportNumber.value,
          action,
          reason,
        },
      };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.setReportHumanDecision(
        actor,
        data.proposalId,
        data.reportNumber,
        data.action,
        data.reason
      );
      return { genlayerTxHash: tx };
    },
  });
}
