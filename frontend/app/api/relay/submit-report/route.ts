import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import { requireInt, requireObject, requireString } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  proposalId: number;
  milestonesCompleted: string;
  fundsSpentUsd: string;
  deliverables: string;
  evidenceUrls: string;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "submit-report",
    paid: { routeId: "submit-report" },
    validate: (data) => {
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const proposalId = requireInt(obj.value.proposalId, "proposalId", { min: 0, max: 4294967295 });
      if (!proposalId.ok) return proposalId;
      const milestonesCompleted = requireString(obj.value.milestonesCompleted, "milestonesCompleted", { max: 500 });
      if (!milestonesCompleted.ok) return milestonesCompleted;
      const fundsSpentUsd = requireString(obj.value.fundsSpentUsd, "fundsSpentUsd", { max: 500 });
      if (!fundsSpentUsd.ok) return fundsSpentUsd;
      const deliverables = requireString(obj.value.deliverables, "deliverables", { max: 8192 });
      if (!deliverables.ok) return deliverables;
      const evidenceUrls = requireString(obj.value.evidenceUrls, "evidenceUrls", { max: 4096 });
      if (!evidenceUrls.ok) return evidenceUrls;
      return {
        ok: true,
        value: {
          proposalId: proposalId.value,
          milestonesCompleted: milestonesCompleted.value,
          fundsSpentUsd: fundsSpentUsd.value,
          deliverables: deliverables.value,
          evidenceUrls: evidenceUrls.value,
        },
      };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.submitReport(actor, data);
      return { genlayerTxHash: tx };
    },
  });
}
