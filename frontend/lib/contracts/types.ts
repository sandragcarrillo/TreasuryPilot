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
}

export interface Report {
  proposal_id: number;
  report_number: number;
  milestones_completed: string;
  funds_spent_usd: string;
  deliverables: string;
  evidence_urls: string;
  progress_score: number;
  roi_status: "on_track" | "at_risk" | "exceeding" | "failed" | "";
  ai_summary: string;
  evaluated: boolean;
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
