import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  proposalId: number;
  reportNumber: number;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "evaluate-report",
    paid: { routeId: "evaluate-report" },
    validate: (data) => {
      if (typeof data !== "object" || data === null) return { ok: false, message: "data required" };
      const d = data as Record<string, unknown>;
      if (typeof d.proposalId !== "number") return { ok: false, message: "proposalId (number) required" };
      if (typeof d.reportNumber !== "number")
        return { ok: false, message: "reportNumber (number) required" };
      return { ok: true, value: { proposalId: d.proposalId, reportNumber: d.reportNumber } };
    },
    execute: async ({ data }) => {
      const tx = await genlayerRelay.evaluateReport(data.proposalId, data.reportNumber);
      return { genlayerTxHash: tx };
    },
  });
}
