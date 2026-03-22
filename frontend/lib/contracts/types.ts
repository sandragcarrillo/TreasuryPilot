export interface DAO {
  id: number;
  name: string;
  constitution: string;
  admin: string;
  proposal_count: number;
}

export interface Proposal {
  id: number;
  dao_id: number;
  title: string;
  description: string;
  requested_amount: string;
  recipient: string;
  target_council: string;
  rationale: string;
  alignment_score: number;
  risk_level: "low" | "medium" | "high" | "";
  roi_assessment: "positive" | "neutral" | "negative" | "";
  recommendation: "approve" | "reject" | "modify" | "pending";
  reasoning: string;
  evaluated: boolean;
}

export interface Council {
  name: string;
  budget: string;
  focus: string;
  colorIndex: number;
}

export interface TransactionReceipt {
  hash?: string;
  status: number | string;
  statusName?: string;
  data?: any;
  [key: string]: any;
}
