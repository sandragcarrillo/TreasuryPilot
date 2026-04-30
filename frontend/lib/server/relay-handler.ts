import "server-only";
import { NextResponse } from "next/server";
import { verifyAuth, markAuthConsumed, type AuthClaim } from "./auth";
import { verifyOrChallenge } from "./x402/verifier";
import type { RouteId } from "./x402/config";

interface AuthEnvelope {
  claim: AuthClaim;
  signature: `0x${string}`;
}

export interface RelayRequest<TData> {
  auth: AuthEnvelope;
  data: TData;
}

interface HandleArgs<TData, TResult> {
  request: Request;
  action: string;
  paid: false | { routeId: RouteId };
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

  let body: { auth?: AuthEnvelope; data?: unknown };
  try {
    body = (await request.json()) as { auth?: AuthEnvelope; data?: unknown };
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

  if (paid) {
    const payment = await verifyOrChallenge({ routeId: paid.routeId, request });
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
