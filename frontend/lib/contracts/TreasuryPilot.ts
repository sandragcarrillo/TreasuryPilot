import { createClient } from "genlayer-js";
import { testnetAsimov } from "genlayer-js/chains";
import type { DAO, Proposal, TransactionReceipt } from "./types";

class TreasuryPilot {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(contractAddress: string, address?: string | null, rpcUrl?: string) {
    this.contractAddress = contractAddress as `0x${string}`;

    const config: any = { chain: testnetAsimov };
    if (address) config.account = address as `0x${string}`;
    if (rpcUrl) config.endpoint = rpcUrl;

    this.client = createClient(config);
  }

  updateAccount(address: string): void {
    const rpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL;
    const config: any = { chain: testnetAsimov, account: address as `0x${string}` };
    if (rpcUrl) config.endpoint = rpcUrl;
    this.client = createClient(config);
  }

  async getDaoCount(): Promise<number> {
    try {
      const count = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_dao_count",
        args: [],
      });
      return Number(count) || 0;
    } catch {
      return 0;
    }
  }

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

  async getDao(daoId: number): Promise<DAO> {
    const raw: any = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_dao",
      args: [daoId],
    });
    return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
  }

  async getProposal(proposalId: number): Promise<Proposal> {
    const raw: any = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_proposal",
      args: [proposalId],
    });
    return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
  }

  async getAllDaos(): Promise<DAO[]> {
    const count = await this.getDaoCount();
    if (count === 0) return [];
    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) => this.getDao(i))
    );
    return results
      .filter((r): r is PromiseFulfilledResult<DAO> => r.status === "fulfilled")
      .map((r) => r.value);
  }

  async getDaoProposals(daoId: number): Promise<Proposal[]> {
    const count = await this.getProposalCount();
    if (count === 0) return [];
    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) => this.getProposal(i))
    );
    return results
      .filter((r): r is PromiseFulfilledResult<Proposal> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((p) => p.dao_id === daoId);
  }

  async createDao(name: string, constitution: string): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "create_dao",
      args: [name, constitution],
      value: BigInt(0),
    });
    return await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 30,
      interval: 5000,
    }) as TransactionReceipt;
  }

  async submitProposal(
    daoId: number,
    title: string,
    description: string,
    requestedAmount: string,
    recipient: string,
    targetCouncil: string,
    rationale: string
  ): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "submit_proposal",
      args: [daoId, title, description, requestedAmount, recipient, targetCouncil, rationale],
      value: BigInt(0),
    });
    return await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 30,
      interval: 5000,
    }) as TransactionReceipt;
  }

  async evaluateProposal(proposalId: number): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "evaluate_proposal",
      args: [proposalId],
      value: BigInt(0),
    });
    // Consensus takes longer — allow up to ~16 minutes
    return await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 200,
      interval: 5000,
    }) as TransactionReceipt;
  }

  async updateConstitution(daoId: number, newConstitution: string): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "update_constitution",
      args: [daoId, newConstitution],
      value: BigInt(0),
    });
    return await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 30,
      interval: 5000,
    }) as TransactionReceipt;
  }
}

export default TreasuryPilot;
