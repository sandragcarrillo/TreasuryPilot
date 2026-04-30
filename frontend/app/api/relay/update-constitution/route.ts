import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  orgId: number;
  newConstitution: string;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "update-constitution",
    paid: false,
    validate: (data) => {
      if (typeof data !== "object" || data === null) return { ok: false, message: "data required" };
      const d = data as Record<string, unknown>;
      if (typeof d.orgId !== "number") return { ok: false, message: "orgId (number) required" };
      if (typeof d.newConstitution !== "string" || !d.newConstitution.trim())
        return { ok: false, message: "newConstitution required" };
      return { ok: true, value: { orgId: d.orgId, newConstitution: d.newConstitution } };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.updateConstitution(actor, data.orgId, data.newConstitution);
      return { genlayerTxHash: tx };
    },
  });
}
