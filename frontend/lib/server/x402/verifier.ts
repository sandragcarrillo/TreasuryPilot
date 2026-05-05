import "server-only";
import type { PaymentPayload } from "x402/types";
import { buildChallenge, type PaymentChallenge, type PaymentRequirement } from "./challenge";
import { verifyBasePayment } from "./verifier-base";
import { verifyRskPayment, type RskPaymentPayload } from "./verifier-rsk";
import { ROUTE_PRICE_USD, type RouteId } from "./config";

export type PaymentResult =
  | { status: "challenge"; statusCode: 402; body: PaymentChallenge }
  | { status: "invalid"; statusCode: 400; body: { error: string; code: string } }
  | { status: "paid"; txHash: string; chargedUsd: number };

interface ParsedPayment {
  scheme: string;
  network: string;
  raw: unknown;
}

function decodePaymentHeader(header: string | null): ParsedPayment | null {
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    if (typeof parsed !== "object" || parsed === null) return null;
    const scheme = (parsed.scheme || parsed?.payload?.scheme) as string | undefined;
    const network = (parsed.network || parsed?.payload?.network) as string | undefined;
    if (!scheme || !network) return null;
    return { scheme, network, raw: parsed };
  } catch {
    return null;
  }
}

export async function verifyOrChallenge(args: {
  routeId: RouteId;
  request: Request;
}): Promise<PaymentResult> {
  const { routeId, request } = args;
  const url = new URL(request.url);
  const resource = `${url.origin}${url.pathname}`;
  const priceUsd = ROUTE_PRICE_USD[routeId];

  const headerB64 = request.headers.get("x-payment");
  const parsed = decodePaymentHeader(headerB64);

  if (!parsed) {
    const challenge = await buildChallenge({ routeId, resource });
    return { status: "challenge", statusCode: 402, body: challenge };
  }

  const challenge = await buildChallenge({ routeId, resource });
  const matching = challenge.accepts.find(
    (a: PaymentRequirement) => a.scheme === parsed.scheme && a.network === parsed.network
  );

  if (!matching) {
    return {
      status: "invalid",
      statusCode: 400,
      body: { code: "unsupported_scheme", error: `Unsupported ${parsed.scheme}/${parsed.network}` },
    };
  }

  if (parsed.scheme === "exact" && matching.scheme === "exact") {
    const result = await verifyBasePayment(parsed.raw as PaymentPayload, matching);
    if (!result.ok) {
      return { status: "invalid", statusCode: 400, body: { error: result.message, code: result.code } };
    }
    return { status: "paid", txHash: result.txHash, chargedUsd: priceUsd };
  }

  if (parsed.scheme === "sovereign-rsk" && matching.scheme === "sovereign-rsk") {
    const rskPayload = parsed.raw as RskPaymentPayload;
    const result = await verifyRskPayment(rskPayload, matching, routeId);
    if (!result.ok) {
      return { status: "invalid", statusCode: 400, body: { error: result.message, code: result.code } };
    }
    return { status: "paid", txHash: result.txHash, chargedUsd: priceUsd };
  }

  return {
    status: "invalid",
    statusCode: 400,
    body: { code: "scheme_mismatch", error: "Scheme/network combination not handled" },
  };
}
