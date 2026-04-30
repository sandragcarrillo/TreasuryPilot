import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type {
  Organization,
  Proposal,
  Report,
  ProgramBudgetStatus,
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
}

export default TreasuryPilot;
