import "server-only";
import { createPublicClient, http, type Hash } from "viem";
import { rootstock, rootstockTestnet } from "viem/chains";
import { ROOTSTOCK_CONFIG, NETWORK_MODE } from "./config";
import { getReplayStore } from "./replay-store";
import type { RskPaymentRequirement } from "./challenge";

export interface RskPaymentPayload {
  scheme: "sovereign-rsk";
  network: string;
  txHash: Hash;
}

export type VerifyResult =
  | { ok: true; txHash: string }
  | { ok: false; code: string; message: string };

const rskClient = createPublicClient({
  chain: NETWORK_MODE === "mainnet" ? rootstock : rootstockTestnet,
  transport: http(ROOTSTOCK_CONFIG.rpcUrl),
});

export async function verifyRskPayment(
  payload: RskPaymentPayload,
  requirement: RskPaymentRequirement,
  routeId: string
): Promise<VerifyResult> {
  if (payload.scheme !== "sovereign-rsk") {
    return { ok: false, code: "invalid_scheme", message: "Expected sovereign-rsk scheme" };
  }
  if (payload.network !== requirement.network) {
    return { ok: false, code: "invalid_network", message: `Network mismatch: ${payload.network} vs ${requirement.network}` };
  }

  const txHash = payload.txHash;
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { ok: false, code: "invalid_tx_hash", message: "txHash missing or malformed" };
  }

  const store = getReplayStore();
  if (await store.isSpent(txHash)) {
    return { ok: false, code: "duplicate_settlement", message: "Transaction already used as payment" };
  }

  let tx: Awaited<ReturnType<typeof rskClient.getTransaction>>;
  try {
    tx = await rskClient.getTransaction({ hash: txHash });
  } catch (err) {
    console.error("[verifier-rsk] getTransaction failed", err);
    return { ok: false, code: "tx_not_found", message: "Transaction not found on chain" };
  }

  if (tx.input && tx.input !== "0x") {
    return { ok: false, code: "invalid_tx_type", message: "Expected plain rBTC transfer (no calldata)" };
  }
  if (!tx.to || tx.to.toLowerCase() !== requirement.payTo.toLowerCase()) {
    return { ok: false, code: "recipient_mismatch", message: `Tx recipient does not match payTo` };
  }

  const required = BigInt(requirement.maxAmountRequired);
  if (tx.value < required) {
    return { ok: false, code: "insufficient_amount", message: `Sent ${tx.value} wei, required ${required}` };
  }

  let receipt: Awaited<ReturnType<typeof rskClient.getTransactionReceipt>>;
  try {
    receipt = await rskClient.getTransactionReceipt({ hash: txHash });
  } catch {
    return { ok: false, code: "tx_unconfirmed", message: "Transaction not yet mined" };
  }
  if (receipt.status !== "success") {
    return { ok: false, code: "tx_reverted", message: "Transaction reverted" };
  }

  const head = await rskClient.getBlockNumber();
  const confirmations = head - receipt.blockNumber + 1n;
  if (confirmations < BigInt(ROOTSTOCK_CONFIG.confirmations)) {
    return {
      ok: false,
      code: "insufficient_confirmations",
      message: `Got ${confirmations} of ${ROOTSTOCK_CONFIG.confirmations} confirmations`,
    };
  }

  const block = await rskClient.getBlock({ blockNumber: receipt.blockNumber });
  if (Number(block.timestamp) > requirement.extra.quoteValidUntil) {
    return {
      ok: false,
      code: "quote_expired",
      message: "Tx mined after quote expiry — request a fresh challenge",
    };
  }

  await store.markSpent(txHash, {
    payTo: requirement.payTo,
    amount: tx.value.toString(),
    route: routeId,
    network: requirement.network,
  });

  return { ok: true, txHash };
}
