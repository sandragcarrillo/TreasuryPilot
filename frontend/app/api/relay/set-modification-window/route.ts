import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import { requireInt, requireObject } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  orgId: number;
  hours: number;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "set-modification-window",
    paid: false,
    validate: (data) => {
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const orgId = requireInt(obj.value.orgId, "orgId", { min: 0, max: 4294967295 });
      if (!orgId.ok) return orgId;
      const hours = requireInt(obj.value.hours, "hours", { min: 1, max: 720 });
      if (!hours.ok) return hours;
      return { ok: true, value: { orgId: orgId.value, hours: hours.value } };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.setModificationWindow(actor, data.orgId, data.hours);
      return { genlayerTxHash: tx };
    },
  });
}
