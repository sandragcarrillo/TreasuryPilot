import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateOrgData {
  name: string;
  constitution: string;
}

export async function POST(req: Request) {
  return handleRelay<CreateOrgData, { genlayerTxHash: string }>({
    request: req,
    action: "create-org",
    paid: { routeId: "create-org" },
    validate: (data) => {
      if (typeof data !== "object" || data === null) return { ok: false, message: "data required" };
      const d = data as Record<string, unknown>;
      if (typeof d.name !== "string" || !d.name.trim()) return { ok: false, message: "name required" };
      if (typeof d.constitution !== "string" || !d.constitution.trim())
        return { ok: false, message: "constitution required" };
      return { ok: true, value: { name: d.name, constitution: d.constitution } };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.createOrg(actor, data.name, data.constitution);
      return { genlayerTxHash: tx };
    },
  });
}
