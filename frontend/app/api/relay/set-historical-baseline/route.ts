import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import { requireBool, requireInt, requireObject } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  orgId: number;
  enabled: boolean;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "set-historical-baseline",
    paid: false,
    validate: (data) => {
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const orgId = requireInt(obj.value.orgId, "orgId", { min: 0, max: 4294967295 });
      if (!orgId.ok) return orgId;
      const enabled = requireBool(obj.value.enabled, "enabled");
      if (!enabled.ok) return enabled;
      return { ok: true, value: { orgId: orgId.value, enabled: enabled.value } };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.setHistoricalBaseline(actor, data.orgId, data.enabled);
      return { genlayerTxHash: tx };
    },
  });
}
