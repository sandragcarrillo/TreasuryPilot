import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";

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
      if (typeof data !== "object" || data === null) return { ok: false, message: "data required" };
      const d = data as Record<string, unknown>;
      if (typeof d.proposalId !== "number") return { ok: false, message: "proposalId (number) required" };
      const stringFields: Array<keyof Data> = [
        "milestonesCompleted",
        "fundsSpentUsd",
        "deliverables",
        "evidenceUrls",
      ];
      for (const f of stringFields) {
        if (typeof d[f] !== "string") return { ok: false, message: `${f} (string) required` };
      }
      return {
        ok: true,
        value: {
          proposalId: d.proposalId,
          milestonesCompleted: d.milestonesCompleted as string,
          fundsSpentUsd: d.fundsSpentUsd as string,
          deliverables: d.deliverables as string,
          evidenceUrls: d.evidenceUrls as string,
        },
      };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.submitReport(actor, data);
      return { genlayerTxHash: tx };
    },
  });
}
