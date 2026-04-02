import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export interface Organization {
  id: number;
  name: string;
  constitution: string;
  owner: string;
  proposal_count: number;
  auto_approve_enabled: boolean;
  auto_approve_threshold_usd: string;
  veto_window_hours: number;
}

export interface Proposal {
  id: number;
  org_id: number;
  title: string;
  description: string;
  requested_amount_usd: string;
  recipient: string;
  target_program: string;
  rationale: string;
  submitter: string;
  alignment_score: number;
  risk_level: string;
  roi_assessment: string;
  recommendation: string;
  reasoning: string;
  evaluated: boolean;
  status: string;
}

export interface Report {
  proposal_id: number;
  report_number: number;
  milestones_completed: string;
  funds_spent_usd: string;
  deliverables: string;
  evidence_urls: string;
  progress_score: number;
  roi_status: string;
  ai_summary: string;
  evaluated: boolean;
}

export class ContractReader {
  private client: ReturnType<typeof createClient>;
  private address: `0x${string}`;

  constructor(contractAddress: string, rpcUrl: string) {
    this.address = contractAddress as `0x${string}`;
    this.client = createClient({
      chain: studionet,
      endpoint: rpcUrl,
    });
  }

  private parse<T>(raw: any): T {
    return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
  }

  async getOrgCount(): Promise<number> {
    try {
      const count = await this.client.readContract({
        address: this.address,
        functionName: "get_org_count",
        args: [],
      });
      return Number(count) || 0;
    } catch {
      return 0;
    }
  }

  async getOrg(orgId: number): Promise<Organization> {
    const raw = await this.client.readContract({
      address: this.address,
      functionName: "get_org",
      args: [orgId],
    });
    return this.parse<Organization>(raw);
  }

  async getProposalCount(): Promise<number> {
    try {
      const count = await this.client.readContract({
        address: this.address,
        functionName: "get_proposal_count",
        args: [],
      });
      return Number(count) || 0;
    } catch {
      return 0;
    }
  }

  async getProposal(proposalId: number): Promise<Proposal> {
    const raw = await this.client.readContract({
      address: this.address,
      functionName: "get_proposal",
      args: [proposalId],
    });
    return this.parse<Proposal>(raw);
  }

  async getOrgAdmins(orgId: number): Promise<string[]> {
    try {
      const raw = await this.client.readContract({
        address: this.address,
        functionName: "get_org_admins",
        args: [orgId],
      });
      return JSON.parse(typeof raw === "string" ? raw : "[]");
    } catch {
      return [];
    }
  }

  async getReportCount(proposalId: number): Promise<number> {
    try {
      const count = await this.client.readContract({
        address: this.address,
        functionName: "get_report_count",
        args: [proposalId],
      });
      return Number(count) || 0;
    } catch {
      return 0;
    }
  }

  async getReport(proposalId: number, reportNumber: number): Promise<Report> {
    const raw = await this.client.readContract({
      address: this.address,
      functionName: "get_report",
      args: [proposalId, reportNumber],
    });
    return this.parse<Report>(raw);
  }

  async getProgramBudgetStatus(orgId: number): Promise<Record<string, string>> {
    try {
      const raw = await this.client.readContract({
        address: this.address,
        functionName: "get_program_budget_status",
        args: [orgId],
      });
      return JSON.parse(typeof raw === "string" ? raw : "{}");
    } catch {
      return {};
    }
  }

  // ─── Aggregate helpers ───────────────────────────────────────────────────

  async getOrgProposals(orgId: number): Promise<Proposal[]> {
    const count = await this.getProposalCount();
    if (count === 0) return [];
    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) => this.getProposal(i))
    );
    return results
      .filter((r): r is PromiseFulfilledResult<Proposal> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((p) => p.org_id === orgId);
  }

  async getProposalReports(proposalId: number): Promise<Report[]> {
    const count = await this.getReportCount(proposalId);
    if (count === 0) return [];
    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) => this.getReport(proposalId, i))
    );
    return results
      .filter((r): r is PromiseFulfilledResult<Report> => r.status === "fulfilled")
      .map((r) => r.value);
  }
}
