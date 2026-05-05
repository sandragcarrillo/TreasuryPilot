import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import { requireInt, requireObject, requireString } from "@/lib/server/validate";

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
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const orgId = requireInt(obj.value.orgId, "orgId", { min: 0, max: 4294967295 });
      if (!orgId.ok) return orgId;
      const constitution = requireString(obj.value.newConstitution, "newConstitution", { max: 16384 });
      if (!constitution.ok) return constitution;
      return { ok: true, value: { orgId: orgId.value, newConstitution: constitution.value } };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.updateConstitution(actor, data.orgId, data.newConstitution);
      return { genlayerTxHash: tx };
    },
  });
}
