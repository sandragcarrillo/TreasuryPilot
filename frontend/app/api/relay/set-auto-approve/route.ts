import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import {
  requireBool,
  requireInt,
  requireObject,
  requireUsdAmount,
} from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  orgId: number;
  enabled: boolean;
  thresholdUsd: string;
  vetoWindowHours: number;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "set-auto-approve",
    paid: false,
    validate: (data) => {
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const orgId = requireInt(obj.value.orgId, "orgId", { min: 0, max: 4294967295 });
      if (!orgId.ok) return orgId;
      const enabled = requireBool(obj.value.enabled, "enabled");
      if (!enabled.ok) return enabled;
      const thresholdUsd = requireUsdAmount(obj.value.thresholdUsd, "thresholdUsd");
      if (!thresholdUsd.ok) return thresholdUsd;
      // Veto window: 0 (effectively disabled) to one year, in hours.
      const vetoWindowHours = requireInt(obj.value.vetoWindowHours, "vetoWindowHours", {
        min: 0,
        max: 8760,
      });
      if (!vetoWindowHours.ok) return vetoWindowHours;
      return {
        ok: true,
        value: {
          orgId: orgId.value,
          enabled: enabled.value,
          thresholdUsd: thresholdUsd.value,
          vetoWindowHours: vetoWindowHours.value,
        },
      };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.setAutoApprove(
        actor,
        data.orgId,
        data.enabled,
        data.thresholdUsd,
        data.vetoWindowHours
      );
      return { genlayerTxHash: tx };
    },
  });
}
