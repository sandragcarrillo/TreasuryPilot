import { handleRelay } from "@/lib/server/relay-handler";
import { genlayerRelay } from "@/lib/server/genlayer-relay";
import {
  requireInt,
  requireObject,
  requireString,
  requireUsdAmount,
} from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Data {
  orgId: number;
  title: string;
  description: string;
  requestedAmountUsd: string;
  recipient: string;
  targetProgram: string;
  rationale: string;
}

export async function POST(req: Request) {
  return handleRelay<Data, { genlayerTxHash: string }>({
    request: req,
    action: "submit-proposal",
    paid: { routeId: "submit-proposal" },
    validate: (data) => {
      const obj = requireObject(data);
      if (!obj.ok) return obj;
      const orgId = requireInt(obj.value.orgId, "orgId", { min: 0, max: 4294967295 });
      if (!orgId.ok) return orgId;
      const title = requireString(obj.value.title, "title", { max: 200 });
      if (!title.ok) return title;
      const description = requireString(obj.value.description, "description", { max: 8192 });
      if (!description.ok) return description;
      const requestedAmountUsd = requireUsdAmount(obj.value.requestedAmountUsd, "requestedAmountUsd");
      if (!requestedAmountUsd.ok) return requestedAmountUsd;
      const recipient = requireString(obj.value.recipient, "recipient", { max: 200 });
      if (!recipient.ok) return recipient;
      const targetProgram = requireString(obj.value.targetProgram, "targetProgram", { max: 200 });
      if (!targetProgram.ok) return targetProgram;
      const rationale = requireString(obj.value.rationale, "rationale", { max: 8192 });
      if (!rationale.ok) return rationale;
      return {
        ok: true,
        value: {
          orgId: orgId.value,
          title: title.value,
          description: description.value,
          requestedAmountUsd: requestedAmountUsd.value,
          recipient: recipient.value,
          targetProgram: targetProgram.value,
          rationale: rationale.value,
        },
      };
    },
    execute: async ({ actor, data }) => {
      const tx = await genlayerRelay.submitProposal(actor, data);
      return { genlayerTxHash: tx };
    },
  });
}
