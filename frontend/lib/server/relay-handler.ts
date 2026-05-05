import "server-only";
import { NextResponse } from "next/server";
import { verifyAuth, markAuthConsumed, type AuthClaim } from "./auth";
import { verifyOrChallenge } from "./x402/verifier";
import type { RouteId } from "./x402/config";

// 64 KB is more than enough for any auth + data payload we accept.
// User-content limits (constitution, description, rationale) are enforced
// per-route in validate(), but this is the outer envelope cap to stop a
// hostile client from making us parse a 100 MB JSON.
const MAX_BODY_BYTES = 64 * 1024;

interface AuthEnvelope {
  claim: AuthClaim;
  signature: `0x${string}`;
}

export interface RelayRequest<TData> {
  auth: AuthEnvelope;
  data: TData;
}

type PaidOption = false | { routeId: RouteId };
type PaidResolverResult =
  | PaidOption
  | { reject: { status: number; error: string } };
type PaidResolver<TData> = (data: TData) => Promise<PaidResolverResult>;

interface HandleArgs<TData, TResult> {
  request: Request;
  action: string;
  // Either a static decision (free / paid by routeId) OR a resolver that
  // computes it from the validated data — used by evaluate-proposal /
  // evaluate-report to grant free retries on UNDETERMINED transactions.
  paid: PaidOption | PaidResolver<TData>;
  validate: (data: unknown) => { ok: true; value: TData } | { ok: false; message: string };
  execute: (ctx: {
    actor: `0x${string}`;
    data: TData;
    paymentTxHash?: string;
    chargedUsd?: number;
  }) => Promise<TResult>;
}

export async function handleRelay<TData, TResult>(
  args: HandleArgs<TData, TResult>
): Promise<Response> {
  const { request, action, paid, validate, execute } = args;

  // Reject oversize bodies before paying to parse them.
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: `Body too large (>${MAX_BODY_BYTES} bytes)` },
      { status: 413 }
    );
  }

  let body: { auth?: AuthEnvelope; data?: unknown };
  try {
    // Defense in depth: even if content-length lies, cap the actual read.
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: `Body too large (>${MAX_BODY_BYTES} bytes)` },
        { status: 413 }
      );
    }
    body = JSON.parse(text) as { auth?: AuthEnvelope; data?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.auth || !body.auth.claim || !body.auth.signature) {
    return NextResponse.json(
      { error: "Missing auth envelope (auth.claim + auth.signature)" },
      { status: 400 }
    );
  }

  const valid = validate(body.data);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.message }, { status: 400 });
  }

  const authResult = await verifyAuth({
    expectedAction: action,
    claim: body.auth.claim,
    signature: body.auth.signature,
  });
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.message, code: authResult.code },
      { status: 401 }
    );
  }

  let paymentTxHash: string | undefined;
  let chargedUsd: number | undefined;

  // Resolve the paid decision after validation so routes can grant
  // conditional free retries based on the validated payload.
  let paidResolved: PaidResolverResult;
  if (typeof paid === "function") {
    paidResolved = await paid(valid.value);
  } else {
    paidResolved = paid;
  }
  if (paidResolved && typeof paidResolved === "object" && "reject" in paidResolved) {
    return NextResponse.json(
      { error: paidResolved.reject.error },
      { status: paidResolved.reject.status }
    );
  }

  if (paidResolved) {
    const payment = await verifyOrChallenge({ routeId: paidResolved.routeId, request });
    if (payment.status !== "paid") {
      return NextResponse.json(payment.body, { status: payment.statusCode });
    }
    paymentTxHash = payment.txHash;
    chargedUsd = payment.chargedUsd;
  }

  let result: TResult;
  try {
    result = await execute({
      actor: authResult.data.actorAddress,
      data: valid.value,
      paymentTxHash,
      chargedUsd,
    });
  } catch (err) {
    console.error(`[relay:${action}] execute failed`, err);
    return NextResponse.json(
      {
        error: "Relay execution failed",
        action,
        ...(paymentTxHash ? { paymentTxHash, chargedUsd } : {}),
      },
      { status: 502 }
    );
  }

  // Mark nonce consumed only on full success — so the client can retry the same
  // auth signature after a 402 challenge with a payment header.
  await markAuthConsumed(
    authResult.data.nonce,
    authResult.data.actorAddress,
    authResult.data.action
  );

  return NextResponse.json({
    ok: true,
    action,
    actor: authResult.data.actorAddress,
    ...(paymentTxHash ? { paymentTxHash, chargedUsd } : {}),
    ...result,
  });
}
