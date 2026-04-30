import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  orgId: number;
  title: string;
  description: string;
  requestedAmountUsd: string;
  recipient: string;
  targetProgram: string;
  rationale: string;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "submit-proposal",
    paid: { routeId: "submit-proposal" },
    validate: (data) => {
      if (typeof data !== "object" || data === null) return { ok: false, message: "data required" };
      const d = data as Record<string, unknown>;
      if (typeof d.orgId !== "number") return { ok: false, message: "orgId (number) required" };
      const stringFields: Array<keyof Data> = [
        "title",
        "description",
        "requestedAmountUsd",
        "recipient",
        "targetProgram",
        "rationale",
      ];
      for (const f of stringFields) {
        const v = d[f];
        if (typeof v !== "string" || !v.trim()) {
          return { ok: false, message: `${f} required` };
        }
      }
      return {
        ok: true,
        value: {
          orgId: d.orgId,
          title: d.title as string,
          description: d.description as string,
          requestedAmountUsd: d.requestedAmountUsd as string,
          recipient: d.recipient as string,
          targetProgram: d.targetProgram as string,
          rationale: d.rationale as string,
        },
      };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.submitProposal(actor, data);
      return { genlayerTxHash: tx };
    },
  });
}
