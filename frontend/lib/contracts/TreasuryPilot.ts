import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type {
  Organization,
  Proposal,
  Report,
  ProgramBudgetStatus,
  TransactionReceipt,
} from "./types";

const RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ||
  "https://studio.genlayer.com/api";

class TreasuryPilot {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(contractAddress: string, address?: string | null) {
    this.contractAddress = contractAddress as `0x${string}`;

    const config: any = {
      chain: studionet,
      endpoint: RPC_URL,
    };
    if (address) config.account = address as `0x${string}`;

    this.client = createClient(config);
  }

  updateAccount(address: string): void {
    const config: any = {
      chain: studionet,
      endpoint: RPC_URL,
      account: address as `0x${string}`,
    };
    this.client = createClient(config);
  }

  private async pollUntil(
    condition: () => Promise<boolean>,
    retries: number,
    interval: number
  ): Promise<void> {
    for (let i = 0; i < retries; i++) {
      if (await condition()) return;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error("Contract state not updated after timeout");
  }

  // ─── Read: Organization ──────────────────────────────────────────────────

  async getOrgCount(): Promise<number> {
    try {
      const count = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_org_count",
        args: [],
      });
      return Number(count) || 0;
    } catch {
      return 0;
    }
  }

  async getOrg(orgId: number): Promise<Organization> {
    const raw: any = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_org",
      args: [orgId],
    });
    return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
  }

  async getAllOrgs(): Promise<Organization[]> {
    const count = await this.getOrgCount();
    if (count === 0) return [];
    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) => this.getOrg(i))
    );
    return results
      .filter(
        (r): r is PromiseFulfilledResult<Organization> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);
  }

  async getOrgAdmins(orgId: number): Promise<string[]> {
    try {
      const raw: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_org_admins",
        args: [orgId],
      });
      return JSON.parse(typeof raw === "string" ? raw : "[]");
    } catch {
      return [];
    }
  }

  // ─── Read: Proposals ─────────────────────────────────────────────────────

  async getProposalCount(): Promise<number> {
    try {
      const count = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_proposal_count",
        args: [],
      });
      return Number(count) || 0;
    } catch {
      return 0;
    }
  }

  async getProposal(proposalId: number): Promise<Proposal> {
    const raw: any = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_proposal",
      args: [proposalId],
    });
    return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
  }

  async getOrgProposals(orgId: number): Promise<Proposal[]> {
    const count = await this.getProposalCount();
    if (count === 0) return [];
    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) => this.getProposal(i))
    );
    return results
      .filter(
        (r): r is PromiseFulfilledResult<Proposal> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value)
      .filter((p) => p.org_id === orgId);
  }

  async getAllProposals(): Promise<Proposal[]> {
    const count = await this.getProposalCount();
    if (count === 0) return [];
    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) => this.getProposal(i))
    );
    return results
      .filter(
        (r): r is PromiseFulfilledResult<Proposal> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);
  }

  // ─── Read: Reports ───────────────────────────────────────────────────────

  async getReportCount(proposalId: number): Promise<number> {
    try {
      const count = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_report_count",
        args: [proposalId],
      });
      return Number(count) || 0;
    } catch {
      return 0;
    }
  }

  async getReport(proposalId: number, reportNumber: number): Promise<Report> {
    const raw: any = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_report",
      args: [proposalId, reportNumber],
    });
    return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
  }

  async getProposalReports(proposalId: number): Promise<Report[]> {
    const count = await this.getReportCount(proposalId);
    if (count === 0) return [];
    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) =>
        this.getReport(proposalId, i)
      )
    );
    return results
      .filter(
        (r): r is PromiseFulfilledResult<Report> => r.status === "fulfilled"
      )
      .map((r) => r.value);
  }

  // ─── Read: Budget ────────────────────────────────────────────────────────

  async getProgramBudgetStatus(
    orgId: number
  ): Promise<ProgramBudgetStatus> {
    try {
      const raw: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_program_budget_status",
        args: [orgId],
      });
      return JSON.parse(typeof raw === "string" ? raw : "{}");
    } catch {
      return {};
    }
  }

  // ─── Write: Organization ─────────────────────────────────────────────────

  async createOrg(
    name: string,
    constitution: string,
    onSubmitted?: (txHash: string) => void
  ): Promise<TransactionReceipt> {
    const initialCount = await this.getOrgCount();

    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "create_org",
      args: [name, constitution],
      value: BigInt(0),
    });

    console.log("[TreasuryPilot] create_org tx:", txHash);
    onSubmitted?.(txHash as string);

    await this.pollUntil(
      async () => (await this.getOrgCount()) > initialCount,
      216,
      5000
    );

    console.log("[TreasuryPilot] create_org confirmed");
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }

  async updateConstitution(
    orgId: number,
    newConstitution: string
  ): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "update_constitution",
      args: [orgId, newConstitution],
      value: BigInt(0),
    });
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }

  async setAutoApprove(
    orgId: number,
    enabled: boolean,
    thresholdUsd: string,
    vetoWindowHours: number
  ): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "set_auto_approve",
      args: [orgId, enabled, thresholdUsd, vetoWindowHours],
      value: BigInt(0),
    });
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }

  async addAdmin(
    orgId: number,
    adminAddress: string
  ): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "add_admin",
      args: [orgId, adminAddress],
      value: BigInt(0),
    });
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }

  async removeAdmin(
    orgId: number,
    adminAddress: string
  ): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "remove_admin",
      args: [orgId, adminAddress],
      value: BigInt(0),
    });
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }

  async transferOwnership(
    orgId: number,
    newOwner: string
  ): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "transfer_ownership",
      args: [orgId, newOwner],
      value: BigInt(0),
    });
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }

  // ─── Write: Proposals ────────────────────────────────────────────────────

  async submitProposal(
    orgId: number,
    title: string,
    description: string,
    requestedAmountUsd: string,
    recipient: string,
    targetProgram: string,
    rationale: string,
    onSubmitted?: (txHash: string) => void
  ): Promise<TransactionReceipt> {
    const initialCount = await this.getProposalCount();

    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "submit_proposal",
      args: [
        orgId,
        title,
        description,
        requestedAmountUsd,
        recipient,
        targetProgram,
        rationale,
      ],
      value: BigInt(0),
    });

    console.log("[TreasuryPilot] submit_proposal tx:", txHash);
    onSubmitted?.(txHash as string);

    await this.pollUntil(
      async () => (await this.getProposalCount()) > initialCount,
      216,
      5000
    );

    console.log("[TreasuryPilot] submit_proposal confirmed");
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }

  async evaluateProposal(proposalId: number): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "evaluate_proposal",
      args: [proposalId],
      value: BigInt(0),
    });

    console.log("[TreasuryPilot] evaluate_proposal tx:", txHash);

    await this.pollUntil(
      async () => {
        try {
          const p = await this.getProposal(proposalId);
          return p.evaluated === true;
        } catch {
          return false;
        }
      },
      216,
      5000
    );

    console.log("[TreasuryPilot] evaluate_proposal confirmed");
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }

  async vetoProposal(proposalId: number): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "veto_proposal",
      args: [proposalId],
      value: BigInt(0),
    });
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }

  // ─── Write: Reports ──────────────────────────────────────────────────────

  async submitReport(
    proposalId: number,
    milestonesCompleted: string,
    fundsSpentUsd: string,
    deliverables: string,
    evidenceUrls: string,
    onSubmitted?: (txHash: string) => void
  ): Promise<TransactionReceipt> {
    const initialCount = await this.getReportCount(proposalId);

    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "submit_report",
      args: [
        proposalId,
        milestonesCompleted,
        fundsSpentUsd,
        deliverables,
        evidenceUrls,
      ],
      value: BigInt(0),
    });

    console.log("[TreasuryPilot] submit_report tx:", txHash);
    onSubmitted?.(txHash as string);

    await this.pollUntil(
      async () => (await this.getReportCount(proposalId)) > initialCount,
      216,
      5000
    );

    console.log("[TreasuryPilot] submit_report confirmed");
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }

  async evaluateReport(
    proposalId: number,
    reportNumber: number
  ): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "evaluate_report",
      args: [proposalId, reportNumber],
      value: BigInt(0),
    });

    console.log("[TreasuryPilot] evaluate_report tx:", txHash);

    await this.pollUntil(
      async () => {
        try {
          const r = await this.getReport(proposalId, reportNumber);
          return r.evaluated === true;
        } catch {
          return false;
        }
      },
      216,
      5000
    );

    console.log("[TreasuryPilot] evaluate_report confirmed");
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }
}

export default TreasuryPilot;
