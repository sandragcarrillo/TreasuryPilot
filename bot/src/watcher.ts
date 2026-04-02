import { ContractReader, type Proposal, type Report } from "./contract.js";

export interface WatcherEvent {
  type:
    | "new_proposal"
    | "proposal_evaluated"
    | "proposal_auto_approved"
    | "proposal_vetoed"
    | "new_report"
    | "report_evaluated";
  orgId: number;
  proposal?: Proposal;
  report?: Report;
}

export type EventHandler = (event: WatcherEvent) => void | Promise<void>;

/**
 * Polls the contract for state changes and emits events.
 * Tracks known proposal count, evaluation status, report counts, etc.
 */
export class ContractWatcher {
  private reader: ContractReader;
  private intervalMs: number;
  private handler: EventHandler;
  private timer: ReturnType<typeof setInterval> | null = null;

  // State tracking
  private knownProposalCount = 0;
  private proposalStatuses = new Map<number, string>();    // proposal_id → last known status
  private proposalEvaluated = new Map<number, boolean>();  // proposal_id → was evaluated
  private reportCounts = new Map<number, number>();        // proposal_id → known report count
  private reportEvaluated = new Map<string, boolean>();    // "pid:rnum" → was evaluated

  constructor(reader: ContractReader, intervalMs: number, handler: EventHandler) {
    this.reader = reader;
    this.intervalMs = intervalMs;
    this.handler = handler;
  }

  async start() {
    // Seed initial state so we don't fire events for existing data
    await this.seedState();
    console.log(`[Watcher] Seeded: ${this.knownProposalCount} proposals known`);
    this.timer = setInterval(() => this.poll(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async seedState() {
    try {
      const count = await this.reader.getProposalCount();
      this.knownProposalCount = count;

      for (let i = 0; i < count; i++) {
        try {
          const p = await this.reader.getProposal(i);
          this.proposalStatuses.set(i, p.status);
          this.proposalEvaluated.set(i, p.evaluated);

          // Seed report counts for approved proposals
          if (p.status === "approved" || p.status === "auto_approved") {
            const rc = await this.reader.getReportCount(i);
            this.reportCounts.set(i, rc);
            for (let r = 0; r < rc; r++) {
              try {
                const report = await this.reader.getReport(i, r);
                this.reportEvaluated.set(`${i}:${r}`, report.evaluated);
              } catch {}
            }
          }
        } catch {}
      }
    } catch (err) {
      console.error("[Watcher] Seed error:", err);
    }
  }

  private async poll() {
    try {
      const totalProposals = await this.reader.getProposalCount();

      // Check for new proposals
      if (totalProposals > this.knownProposalCount) {
        for (let i = this.knownProposalCount; i < totalProposals; i++) {
          try {
            const p = await this.reader.getProposal(i);
            this.proposalStatuses.set(i, p.status);
            this.proposalEvaluated.set(i, p.evaluated);
            this.reportCounts.set(i, 0);
            await this.handler({ type: "new_proposal", orgId: p.org_id, proposal: p });
          } catch {}
        }
        this.knownProposalCount = totalProposals;
      }

      // Check existing proposals for status changes
      for (let i = 0; i < totalProposals; i++) {
        try {
          const p = await this.reader.getProposal(i);
          const prevStatus = this.proposalStatuses.get(i);
          const wasEvaluated = this.proposalEvaluated.get(i);

          // Evaluation completed
          if (p.evaluated && !wasEvaluated) {
            this.proposalEvaluated.set(i, true);
            if (p.status === "auto_approved") {
              await this.handler({ type: "proposal_auto_approved", orgId: p.org_id, proposal: p });
            } else {
              await this.handler({ type: "proposal_evaluated", orgId: p.org_id, proposal: p });
            }
          }

          // Vetoed
          if (p.status === "vetoed" && prevStatus !== "vetoed") {
            await this.handler({ type: "proposal_vetoed", orgId: p.org_id, proposal: p });
          }

          this.proposalStatuses.set(i, p.status);

          // Check for new reports on approved proposals
          if (p.status === "approved" || p.status === "auto_approved") {
            const rc = await this.reader.getReportCount(i);
            const knownRc = this.reportCounts.get(i) || 0;

            if (rc > knownRc) {
              for (let r = knownRc; r < rc; r++) {
                try {
                  const report = await this.reader.getReport(i, r);
                  this.reportEvaluated.set(`${i}:${r}`, report.evaluated);
                  await this.handler({ type: "new_report", orgId: p.org_id, proposal: p, report });
                } catch {}
              }
              this.reportCounts.set(i, rc);
            }

            // Check for newly evaluated reports
            for (let r = 0; r < rc; r++) {
              const key = `${i}:${r}`;
              if (this.reportEvaluated.get(key)) continue;
              try {
                const report = await this.reader.getReport(i, r);
                if (report.evaluated) {
                  this.reportEvaluated.set(key, true);
                  await this.handler({ type: "report_evaluated", orgId: p.org_id, proposal: p, report });
                }
              } catch {}
            }
          }
        } catch {}
      }
    } catch (err) {
      console.error("[Watcher] Poll error:", err);
    }
  }
}
