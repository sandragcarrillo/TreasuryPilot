import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import { requireObject, requireString } from "@/lib/server/validate";

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
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const name = requireString(obj.value.name, "name", { max: 200 });
      if (!name.ok) return name;
      const constitution = requireString(obj.value.constitution, "constitution", { max: 16384 });
      if (!constitution.ok) return constitution;
      return { ok: true, value: { name: name.value, constitution: constitution.value } };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.createOrg(actor, data.name, data.constitution);
      return { genlayerTxHash: tx };
    },
  });
}
