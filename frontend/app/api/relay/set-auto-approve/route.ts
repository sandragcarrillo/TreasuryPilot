import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";

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
      if (typeof data !== "object" || data === null) return { ok: false, message: "data required" };
      const d = data as Record<string, unknown>;
      if (typeof d.orgId !== "number") return { ok: false, message: "orgId (number) required" };
      if (typeof d.enabled !== "boolean") return { ok: false, message: "enabled (boolean) required" };
      if (typeof d.thresholdUsd !== "string") return { ok: false, message: "thresholdUsd (string) required" };
      if (typeof d.vetoWindowHours !== "number")
        return { ok: false, message: "vetoWindowHours (number) required" };
      return {
        ok: true,
        value: {
          orgId: d.orgId,
          enabled: d.enabled,
          thresholdUsd: d.thresholdUsd,
          vetoWindowHours: d.vetoWindowHours,
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
