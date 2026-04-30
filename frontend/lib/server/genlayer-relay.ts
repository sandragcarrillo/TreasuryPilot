import "server-only";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { privateKeyToAccount } from "viem/accounts";

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
  const account = privateKeyToAccount(normalizeKey(PRIVATE_KEY));
  cachedAddress = account.address;
  cachedClient = createClient({
    chain: studionet,
    endpoint: RPC_URL,
    account: account.address,
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
