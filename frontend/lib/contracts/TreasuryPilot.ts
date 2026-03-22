import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import type { DAO, Proposal, TransactionReceipt } from "./types";

const BRADBURY_RPC = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://rpc-bradbury.genlayer.com";

class TreasuryPilot {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(contractAddress: string, address?: string | null) {
    this.contractAddress = contractAddress as `0x${string}`;

    const config: any = {
      chain: testnetBradbury,
      endpoint: BRADBURY_RPC,
    };
    if (address) config.account = address as `0x${string}`;

    this.client = createClient(config);
  }

  updateAccount(address: string): void {
    const config: any = {
      chain: testnetBradbury,
      endpoint: BRADBURY_RPC,
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

  async createDao(
    name: string,
    constitution: string,
    onSubmitted?: (txHash: string) => void
  ): Promise<TransactionReceipt> {
    const initialCount = await this.getDaoCount();

    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "create_dao",
      args: [name, constitution],
      value: BigInt(0),
    });

    console.log("[TreasuryPilot] create_dao tx:", txHash, "— polling for consensus...");
    onSubmitted?.(txHash as string);

    // Consensus takes 5-15 min; poll up to 18 min (216 × 5s)
    await this.pollUntil(
      async () => (await this.getDaoCount()) > initialCount,
      216,
      5000
    );

    console.log("[TreasuryPilot] create_dao confirmed");
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }

  async submitProposal(
    daoId: number,
    title: string,
    description: string,
    requestedAmount: string,
    recipient: string,
    targetCouncil: string,
    rationale: string,
    onSubmitted?: (txHash: string) => void
  ): Promise<TransactionReceipt> {
    const initialCount = await this.getProposalCount();

    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "submit_proposal",
      args: [daoId, title, description, requestedAmount, recipient, targetCouncil, rationale],
      value: BigInt(0),
    });

    console.log("[TreasuryPilot] submit_proposal tx:", txHash, "— polling for consensus...");
    onSubmitted?.(txHash as string);

    // Consensus takes 5-15 min; poll up to 18 min (216 × 5s)
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

    console.log("[TreasuryPilot] evaluate_proposal tx:", txHash, "— polling for consensus...");

    // LLM evaluation + consensus: can take longer; poll up to 18 min
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

  async updateConstitution(daoId: number, newConstitution: string): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "update_constitution",
      args: [daoId, newConstitution],
      value: BigInt(0),
    });
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }
}

export default TreasuryPilot;
