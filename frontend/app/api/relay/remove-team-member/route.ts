import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import { requireAddress, requireInt, requireObject } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  proposalId: number;
  memberAddress: `0x${string}`;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "remove-team-member",
    paid: false,
    validate: (data) => {
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const proposalId = requireInt(obj.value.proposalId, "proposalId", { min: 0, max: 4294967295 });
      if (!proposalId.ok) return proposalId;
      const memberAddress = requireAddress(obj.value.memberAddress, "memberAddress");
      if (!memberAddress.ok) return memberAddress;
      return { ok: true, value: { proposalId: proposalId.value, memberAddress: memberAddress.value } };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.removeTeamMember(actor, data.proposalId, data.memberAddress);
      return { genlayerTxHash: tx };
    },
  });
}
