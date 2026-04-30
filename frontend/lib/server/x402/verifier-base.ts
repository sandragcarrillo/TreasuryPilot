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

export async function verifyBasePayment(
  payload: PaymentPayload,
  requirement: BasePaymentRequirement
): Promise<VerifyResult> {
  const reqX402 = toX402Requirements(requirement);

  const verifyRes = await verify(payload, reqX402);
  if (!verifyRes.isValid) {
    return {
      ok: false,
      code: verifyRes.invalidReason || "verify_failed",
      message: verifyRes.invalidReason || "Payment verification failed",
    };
  }

  const settleRes = await settle(payload, reqX402);
  if (!settleRes.success) {
    return {
      ok: false,
      code: settleRes.errorReason || "settle_failed",
      message: settleRes.errorReason || "Payment settlement failed",
    };
  }

  return { ok: true, txHash: settleRes.transaction || "" };
}
