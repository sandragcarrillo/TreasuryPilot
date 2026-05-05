import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import { requireInt, requireObject } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  proposalId: number;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "veto-proposal",
    paid: false,
    validate: (data) => {
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const proposalId = requireInt(obj.value.proposalId, "proposalId", { min: 0, max: 4294967295 });
      if (!proposalId.ok) return proposalId;
      return { ok: true, value: { proposalId: proposalId.value } };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.vetoProposal(actor, data.proposalId);
      return { genlayerTxHash: tx };
    },
  });
}
