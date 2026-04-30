import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import { isAddress } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  orgId: number;
  adminAddress: `0x${string}`;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "remove-admin",
    paid: false,
    validate: (data) => {
      if (typeof data !== "object" || data === null) return { ok: false, message: "data required" };
      const d = data as Record<string, unknown>;
      if (typeof d.orgId !== "number") return { ok: false, message: "orgId (number) required" };
      if (typeof d.adminAddress !== "string" || !isAddress(d.adminAddress))
        return { ok: false, message: "adminAddress must be a valid EVM address" };
      return { ok: true, value: { orgId: d.orgId, adminAddress: d.adminAddress as `0x${string}` } };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.removeAdmin(actor, data.orgId, data.adminAddress);
      return { genlayerTxHash: tx };
    },
  });
}
