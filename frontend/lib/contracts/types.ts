export interface Organization {
  id: number;
  name: string;
  constitution: string;
  owner: string;
  proposal_count: number;
  auto_approve_enabled: boolean;
  auto_approve_threshold_usd: string;
  veto_window_hours: number;
  use_historical_baseline: boolean;
  modification_window_hours: number;
  appeals_enabled: boolean;
  appeal_window_hours: number;
}

export type HumanVerdict = "" | "approved" | "rejected" | "modify";
export type HumanReportAction =
  | ""
  | "continue_funding"
  | "pause_pending_clarification"
  | "claw_back"
  | "terminate";

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
  risk_level: "low" | "medium" | "high" | "";
  roi_assessment: "positive" | "neutral" | "negative" | "";
  recommendation: "approve" | "reject" | "modify" | "pending";
  reasoning: string;
  evaluated: boolean;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "needs_modification"
    | "auto_approved"
    | "vetoed";
  modification_deadline: string;
  appealed: boolean;
  appeal_text: string;
  appeal_filed_at: string;
  appeal_deadline: string;
  human_verdict: HumanVerdict;
  human_reason: string;
  human_decided_at: string;
  human_decided_by: string;
}

export type RecommendedAction =
  | "continue_funding"
  | "pause_pending_clarification"
  | "claw_back"
  | "terminate"
  | "";

export interface Report {
  proposal_id: number;
  report_number: number;
  milestones_completed: string;
  funds_spent_usd: string;
  deliverables: string;
  evidence_urls: string;
  progress_score: number;
  roi_status: "on_track" | "at_risk" | "exceeding" | "pivoted" | "failed" | "";
  ai_summary: string;
  evaluated: boolean;
  recommended_action: RecommendedAction;
  human_action: HumanReportAction;
  human_reason: string;
  human_decided_at: string;
  human_decided_by: string;
}

export interface Program {
  name: string;
  budget: string;
  focus: string;
  colorIndex: number;
}

export interface ProgramBudgetStatus {
  [programName: string]: string; // program name → total USD spent
}

export interface TransactionReceipt {
  hash?: string;
  status: number | string;
  statusName?: string;
  data?: any;
  [key: string]: any;
}
