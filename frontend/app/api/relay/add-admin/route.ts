import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import { requireAddress, requireInt, requireObject } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  orgId: number;
  adminAddress: `0x${string}`;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "add-admin",
    paid: false,
    validate: (data) => {
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const orgId = requireInt(obj.value.orgId, "orgId", { min: 0, max: 4294967295 });
      if (!orgId.ok) return orgId;
      const adminAddress = requireAddress(obj.value.adminAddress, "adminAddress");
      if (!adminAddress.ok) return adminAddress;
      return { ok: true, value: { orgId: orgId.value, adminAddress: adminAddress.value } };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.addAdmin(actor, data.orgId, data.adminAddress);
      return { genlayerTxHash: tx };
    },
  });
}
