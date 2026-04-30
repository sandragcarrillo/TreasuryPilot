import "server-only";
import { createFacilitatorConfig } from "@coinbase/x402";
import { useFacilitator } from "x402/verify";
import type { PaymentPayload, PaymentRequirements } from "x402/types";
import type { BasePaymentRequirement } from "./challenge";
import type { VerifyResult } from "./verifier-rsk";

const cdpFacilitator = createFacilitatorConfig(
  process.env.CDP_API_KEY_ID,
  process.env.CDP_API_KEY_SECRET
);

const { verify, settle } = useFacilitator(cdpFacilitator as any);

function toX402Requirements(req: BasePaymentRequirement): PaymentRequirements {
  return {
    scheme: req.scheme,
    network: req.network as PaymentRequirements["network"],
    asset: req.asset,
    maxAmountRequired: req.maxAmountRequired,
    payTo: req.payTo,
    resource: req.resource,
    description: req.description,
    mimeType: req.mimeType,
    maxTimeoutSeconds: req.maxTimeoutSeconds,
    ...(req.extra ? { extra: req.extra } : {}),
  } as PaymentRequirements;
}

function describeError(err: unknown): { code: string; message: string } {
  if (err && typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    const reason = (anyErr.invalidReason || anyErr.errorReason) as string | undefined;
    const message = (anyErr.message as string | undefined) || "Unknown verifier error";
    if (reason) return { code: reason, message: `${reason}: ${message}` };
    return { code: "verifier_error", message };
  }
  return { code: "verifier_error", message: String(err) };
}

export async function verifyBasePayment(
  payload: PaymentPayload,
  requirement: BasePaymentRequirement
): Promise<VerifyResult> {
  const reqX402 = toX402Requirements(requirement);

  try {
    const verifyRes = await verify(payload, reqX402);
    if (!verifyRes.isValid) {
      const reason = verifyRes.invalidReason || "verify_failed";
      console.warn("[verifier-base] verify isValid=false", {
        reason,
        network: requirement.network,
        payload: JSON.stringify(payload),
      });
      return { ok: false, code: reason, message: reason };
    }
  } catch (err) {
    const desc = describeError(err);
    console.error("[verifier-base] verify threw", {
      ...desc,
      network: requirement.network,
      payload: JSON.stringify(payload),
    });
    return { ok: false, code: desc.code, message: desc.message };
  }

  try {
    const settleRes = await settle(payload, reqX402);
    if (!settleRes.success) {
      const reason = settleRes.errorReason || "settle_failed";
      console.warn("[verifier-base] settle success=false", {
        reason,
        network: requirement.network,
      });
      return { ok: false, code: reason, message: reason };
    }
    return { ok: true, txHash: settleRes.transaction || "" };
  } catch (err) {
    const desc = describeError(err);
    console.error("[verifier-base] settle threw", {
      ...desc,
      network: requirement.network,
    });
    return { ok: false, code: desc.code, message: desc.message };
  }
}
