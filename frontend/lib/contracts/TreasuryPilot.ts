import { createClient } from "genlayer-js";
import { testnetAsimov } from "genlayer-js/chains";
import type { DAO, Proposal, TransactionReceipt } from "./types";

const BRADBURY_RPC = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://rpc-bradbury.genlayer.com";

// genlayer-js skips fetching the consensus main contract when chain.id === testnetAsimov.id.
// This fetches the real Bradbury consensus contract and injects it into the client.
async function patchConsensusContract(client: ReturnType<typeof createClient>): Promise<void> {
  try {
    const res = await fetch(BRADBURY_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "sim_getConsensusContract",
        params: ["ConsensusMain"],
      }),
    });
    const data = await res.json();
    if (data.result) {
      (client.chain as any).consensusMainContract = data.result;
      console.log("[TreasuryPilot] Bradbury consensus contract patched:", data.result?.address ?? data.result);
    } else {
      console.warn("[TreasuryPilot] sim_getConsensusContract returned no result:", data);
    }
  } catch (e) {
    console.warn("[TreasuryPilot] Could not fetch Bradbury consensus contract:", e);
  }
}

class TreasuryPilot {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient> | null = null;
  private initialized = false;

  constructor(contractAddress: string, address?: string | null, _rpcUrl?: string) {
    this.contractAddress = contractAddress as `0x${string}`;

    // genlayer-js automatically uses window.ethereum for eth_* calls when account
    // is a string address. endpoint overrides the RPC URL for gen_call reads.
    const config: any = {
      chain: testnetAsimov,
      endpoint: BRADBURY_RPC,
    };
    if (address) config.account = address as `0x${string}`;

    this.client = createClient(config);
    // Kick off async patch (reads work without it; writes need it)
    this.ensureInitialized();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized || !this.client) return;
    await patchConsensusContract(this.client);
    this.initialized = true;
  }

  updateAccount(address: string): void {
    const config: any = {
      chain: testnetAsimov,
      endpoint: BRADBURY_RPC,
      account: address as `0x${string}`,
    };
    this.client = createClient(config);
    this.initialized = false;
    this.ensureInitialized();
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
      const count = await this.client!.readContract({
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
      const count = await this.client!.readContract({
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
    const raw: any = await this.client!.readContract({
      address: this.contractAddress,
      functionName: "get_dao",
      args: [daoId],
    });
    return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
  }

  async getProposal(proposalId: number): Promise<Proposal> {
    const raw: any = await this.client!.readContract({
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
    await this.ensureInitialized();
    const initialCount = await this.getDaoCount();

    const txHash = await this.client!.writeContract({
      address: this.contractAddress,
      functionName: "create_dao",
      args: [name, constitution],
      value: BigInt(0),
    });

    console.log("[TreasuryPilot] create_dao tx submitted:", txHash, "— waiting for consensus...");

    // Consensus can take 5-15 min; poll for up to 18 min (216 × 5s)
    await this.pollUntil(
      async () => (await this.getDaoCount()) > initialCount,
      216,
      5000
    );

    console.log("[TreasuryPilot] create_dao confirmed — DAO count increased");
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
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
    await this.ensureInitialized();
    const initialCount = await this.getProposalCount();

    const txHash = await this.client!.writeContract({
      address: this.contractAddress,
      functionName: "submit_proposal",
      args: [daoId, title, description, requestedAmount, recipient, targetCouncil, rationale],
      value: BigInt(0),
    });

    console.log("[TreasuryPilot] submit_proposal tx submitted:", txHash, "— waiting for consensus...");

    // Consensus can take 5-15 min; poll for up to 18 min (216 × 5s)
    await this.pollUntil(
      async () => (await this.getProposalCount()) > initialCount,
      216,
      5000
    );

    console.log("[TreasuryPilot] submit_proposal confirmed — proposal count increased");
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }

  async evaluateProposal(proposalId: number): Promise<TransactionReceipt> {
    await this.ensureInitialized();

    const txHash = await this.client!.writeContract({
      address: this.contractAddress,
      functionName: "evaluate_proposal",
      args: [proposalId],
      value: BigInt(0),
    });

    // Consensus takes ~5-15 minutes
    await this.pollUntil(
      async () => {
        try {
          const p = await this.getProposal(proposalId);
          return p.evaluated === true;
        } catch {
          return false;
        }
      },
      200,
      5000
    );

    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }

  async updateConstitution(daoId: number, newConstitution: string): Promise<TransactionReceipt> {
    await this.ensureInitialized();
    const txHash = await this.client!.writeContract({
      address: this.contractAddress,
      functionName: "update_constitution",
      args: [daoId, newConstitution],
      value: BigInt(0),
    });
    return { hash: txHash as string, status: "ACCEPTED" } as TransactionReceipt;
  }
}

export default TreasuryPilot;
