import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  proposalId: number;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "evaluate-proposal",
    paid: { routeId: "evaluate-proposal" },
    validate: (data) => {
      if (typeof data !== "object" || data === null) return { ok: false, message: "data required" };
      const d = data as Record<string, unknown>;
      if (typeof d.proposalId !== "number" || d.proposalId < 0)
        return { ok: false, message: "proposalId (number) required" };
      return { ok: true, value: { proposalId: d.proposalId } };
    },
    execute: async ({ data }) => {
      const tx = await genlayerRelay.evaluateProposal(data.proposalId);
      return { genlayerTxHash: tx };
    },
  });
}
