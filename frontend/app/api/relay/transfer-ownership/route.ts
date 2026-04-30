import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import { isAddress } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  orgId: number;
  newOwner: `0x${string}`;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "transfer-ownership",
    paid: false,
    validate: (data) => {
      if (typeof data !== "object" || data === null) return { ok: false, message: "data required" };
      const d = data as Record<string, unknown>;
      if (typeof d.orgId !== "number") return { ok: false, message: "orgId (number) required" };
      if (typeof d.newOwner !== "string" || !isAddress(d.newOwner))
        return { ok: false, message: "newOwner must be a valid EVM address" };
      return { ok: true, value: { orgId: d.orgId, newOwner: d.newOwner as `0x${string}` } };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.transferOwnership(actor, data.orgId, data.newOwner);
      return { genlayerTxHash: tx };
    },
  });
}
