import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import { requireBool, requireInt, requireObject } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  orgId: number;
  enabled: boolean;
  windowHours: number;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "set-appeals",
    paid: false,
    validate: (data) => {
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const orgId = requireInt(obj.value.orgId, "orgId", { min: 0, max: 4294967295 });
      if (!orgId.ok) return orgId;
      const enabled = requireBool(obj.value.enabled, "enabled");
      if (!enabled.ok) return enabled;
      const windowHours = requireInt(obj.value.windowHours, "windowHours", { min: 1, max: 8760 });
      if (!windowHours.ok) return windowHours;
      return {
        ok: true,
        value: { orgId: orgId.value, enabled: enabled.value, windowHours: windowHours.value },
      };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.setAppeals(
        actor,
        data.orgId,
        data.enabled,
        data.windowHours
      );
      return { genlayerTxHash: tx };
    },
  });
}
