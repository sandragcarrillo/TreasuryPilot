import "server-only";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const PRIVATE_KEY = process.env.PROJECT_GENLAYER_PRIVATE_KEY as string | undefined;
const RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";

if (!CONTRACT_ADDRESS) {
  throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS env var is required");
}

function normalizeKey(key: string | undefined): `0x${string}` {
  if (!key) {
    throw new Error("PROJECT_GENLAYER_PRIVATE_KEY env var is required");
  }
  return (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
}

let cachedClient: ReturnType<typeof createClient> | null = null;
let cachedAddress: `0x${string}` | null = null;

function getClient() {
  if (cachedClient) return { client: cachedClient, address: cachedAddress! };
  // Use genlayer-js's createAccount so the SDK signs locally with the private key
  // instead of delegating to the RPC via eth_sendTransaction (which Studio's RPC
  // doesn't expose).
  const account = createAccount(normalizeKey(PRIVATE_KEY));
  cachedAddress = account.address as `0x${string}`;
  cachedClient = createClient({
    chain: studionet,
    endpoint: RPC_URL,
    account,
  } as any);
  return { client: cachedClient, address: cachedAddress };
}

async function write(functionName: string, args: unknown[]): Promise<string> {
  const { client } = getClient();
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: BigInt(0),
  } as any);
  return txHash as string;
}

export interface UndeterminedCheck {
  ok: boolean;
  reason?: string;
  // The decoded function args of the original tx (so we can compare
  // proposalId / reportNumber / etc).
  args?: unknown[];
  functionName?: string;
}

/**
 * Verify that `txHash` is an UNDETERMINED contract call to one of the
 * specified function names on this contract. Used to validate free-retry
 * requests server-side.
 */
export async function verifyUndeterminedTx(
  txHash: string,
  expectedFunctionNames: string[]
): Promise<UndeterminedCheck> {
  const { client } = getClient();
  let tx: any;
  try {
    tx = await (client as any).getTransaction({ hash: txHash });
  } catch (err) {
    return { ok: false, reason: "Could not fetch original transaction" };
  }
  if (!tx) return { ok: false, reason: "Transaction not found" };
  const status = String(tx.statusName || tx.status || "").toUpperCase();
  if (status !== "UNDETERMINED") {
    return { ok: false, reason: `Transaction is not UNDETERMINED (status: ${status})` };
  }
  const decoded = tx.txDataDecoded as any;
  const fn = decoded?.functionName ?? decoded?.method ?? decoded?.name;
  if (typeof fn !== "string" || !expectedFunctionNames.includes(fn)) {
    return { ok: false, reason: `Original tx is not one of: ${expectedFunctionNames.join(", ")}` };
  }
  const argsRaw = decoded?.args ?? decoded?.params ?? [];
  return { ok: true, args: Array.isArray(argsRaw) ? argsRaw : [], functionName: fn };
}

export const genlayerRelay = {
  // ─── Organization ──────────────────────────────────────────────────────────

  createOrg: (actor: `0x${string}`, name: string, constitution: string) =>
    write("create_org", [actor, name, constitution]),

  updateConstitution: (actor: `0x${string}`, orgId: number, newConstitution: string) =>
    write("update_constitution", [actor, orgId, newConstitution]),

  setAutoApprove: (
    actor: `0x${string}`,
    orgId: number,
    enabled: boolean,
    thresholdUsd: string,
    vetoWindowHours: number
  ) =>
    write("set_auto_approve", [actor, orgId, enabled, thresholdUsd, vetoWindowHours]),

  setHistoricalBaseline: (actor: `0x${string}`, orgId: number, enabled: boolean) =>
    write("set_historical_baseline", [actor, orgId, enabled]),

  setModificationWindow: (actor: `0x${string}`, orgId: number, hours: number) =>
    write("set_modification_window", [actor, orgId, hours]),

  // ─── Admin ────────────────────────────────────────────────────────────────

  addAdmin: (actor: `0x${string}`, orgId: number, adminAddress: `0x${string}`) =>
    write("add_admin", [actor, orgId, adminAddress]),

  removeAdmin: (actor: `0x${string}`, orgId: number, adminAddress: `0x${string}`) =>
    write("remove_admin", [actor, orgId, adminAddress]),

  transferOwnership: (actor: `0x${string}`, orgId: number, newOwner: `0x${string}`) =>
    write("transfer_ownership", [actor, orgId, newOwner]),

  // ─── Proposals ────────────────────────────────────────────────────────────

  submitProposal: (
    actor: `0x${string}`,
    args: {
      orgId: number;
      title: string;
      description: string;
      requestedAmountUsd: string;
      recipient: string;
      targetProgram: string;
      rationale: string;
    }
  ) =>
    write("submit_proposal", [
      actor,
      args.orgId,
      args.title,
      args.description,
      args.requestedAmountUsd,
      args.recipient,
      args.targetProgram,
      args.rationale,
    ]),

  evaluateProposal: (proposalId: number) =>
    write("evaluate_proposal", [proposalId]),

  vetoProposal: (actor: `0x${string}`, proposalId: number) =>
    write("veto_proposal", [actor, proposalId]),

  updateProposal: (
    actor: `0x${string}`,
    args: {
      proposalId: number;
      title: string;
      description: string;
      requestedAmountUsd: string;
      recipient: string;
      targetProgram: string;
      rationale: string;
    }
  ) =>
    write("update_proposal", [
      actor,
      args.proposalId,
      args.title,
      args.description,
      args.requestedAmountUsd,
      args.recipient,
      args.targetProgram,
      args.rationale,
    ]),

  addTeamMember: (actor: `0x${string}`, proposalId: number, memberAddress: `0x${string}`) =>
    write("add_team_member", [actor, proposalId, memberAddress]),

  removeTeamMember: (actor: `0x${string}`, proposalId: number, memberAddress: `0x${string}`) =>
    write("remove_team_member", [actor, proposalId, memberAddress]),

  // ─── Reports ──────────────────────────────────────────────────────────────

  submitReport: (
    actor: `0x${string}`,
    args: {
      proposalId: number;
      milestonesCompleted: string;
      fundsSpentUsd: string;
      deliverables: string;
      evidenceUrls: string;
    }
  ) =>
    write("submit_report", [
      actor,
      args.proposalId,
      args.milestonesCompleted,
      args.fundsSpentUsd,
      args.deliverables,
      args.evidenceUrls,
    ]),

  evaluateReport: (proposalId: number, reportNumber: number) =>
    write("evaluate_report", [proposalId, reportNumber]),
};
