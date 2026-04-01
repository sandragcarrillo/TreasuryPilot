# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
import json


# ─── Storage Types ────────────────────────────────────────────────────────────

@allow_storage
@dataclass
class Organization:
    id: u32
    name: str
    constitution: str                     # org mission, rules, program structure & budgets
    owner: Address                        # ultimate authority — can transfer ownership
    proposal_count: u32
    # Auto-approval configuration (owner-controlled)
    auto_approve_enabled: bool
    auto_approve_threshold_usd: str       # max USD for auto-approval, e.g. "1500"
    veto_window_hours: u32                # hours after auto-approval during which owner/admin can veto


@allow_storage
@dataclass
class Proposal:
    id: u32
    org_id: u32
    title: str
    description: str
    requested_amount_usd: str             # USD amount as string, e.g. "1500"
    recipient: str
    target_program: str                   # which grant program this targets
    rationale: str
    submitter: Address
    # AI evaluation results (populated after evaluate_proposal)
    alignment_score: i32                  # 0-10
    risk_level: str                       # "low", "medium", "high"
    roi_assessment: str                   # "positive", "neutral", "negative"
    recommendation: str                   # "approve", "reject", "modify"
    reasoning: str
    evaluated: bool
    # Workflow status
    status: str                           # "pending" | "approved" | "rejected" | "needs_modification" | "auto_approved" | "vetoed"


@allow_storage
@dataclass
class Report:
    proposal_id: u32
    report_number: u32
    milestones_completed: str             # e.g. "3 of 5 milestones"
    funds_spent_usd: str                  # e.g. "8000 of 12000"
    deliverables: str                     # what was actually delivered
    evidence_urls: str                    # links to GitHub repos, docs, metrics, etc.
    # AI evaluation of report (populated after evaluate_report)
    progress_score: i32                   # 0-10
    roi_status: str                       # "on_track" | "at_risk" | "exceeding" | "failed"
    ai_summary: str                       # AI analysis vs original KPIs
    evaluated: bool


# ─── Contract ─────────────────────────────────────────────────────────────────

class TreasuryPilot(gl.Contract):
    orgs: TreeMap[u32, Organization]
    org_count: u32
    proposals: TreeMap[u32, Proposal]
    proposal_count: u32
    reports: TreeMap[str, Report]          # key: "{proposal_id}:{report_number}"
    report_counts: TreeMap[u32, u32]       # proposal_id → number of reports submitted
    program_spent: TreeMap[str, str]       # key: "{org_id}:{program_name}" → total USD approved
    program_names: TreeMap[u32, str]       # org_id → JSON list of known program names
    # Multi-admin: org_id:address → 1 (admin) or absent
    org_admins: TreeMap[str, u32]
    # Track admin list for enumeration
    admin_list: TreeMap[u32, str]          # org_id → JSON list of admin addresses

    def __init__(self):
        self.org_count = u32(0)
        self.proposal_count = u32(0)

    # ─── Internal Helpers ─────────────────────────────────────────────────────

    def _is_owner(self, org_id: u32) -> bool:
        return gl.message.sender_address == self.orgs[org_id].owner

    def _is_admin_or_owner(self, org_id: u32) -> bool:
        sender = gl.message.sender_address
        if sender == self.orgs[org_id].owner:
            return True
        admin_key = f"{int(org_id)}:{str(sender)}"
        return self.org_admins.get(admin_key, u32(0)) == u32(1)

    def _require_owner(self, org_id: u32):
        if not self._is_owner(org_id):
            raise gl.vm.UserError("Only the organization owner can do this")

    def _require_admin_or_owner(self, org_id: u32):
        if not self._is_admin_or_owner(org_id):
            raise gl.vm.UserError("Only an admin or the organization owner can do this")

    # ─── Organization Management ──────────────────────────────────────────────

    @gl.public.write
    def create_org(self, name: str, constitution: str):
        """Register a new grants organization. Caller becomes owner."""
        oid = self.org_count
        self.orgs[oid] = Organization(
            id=oid,
            name=name,
            constitution=constitution,
            owner=gl.message.sender_address,
            proposal_count=u32(0),
            auto_approve_enabled=False,
            auto_approve_threshold_usd="0",
            veto_window_hours=u32(24),
        )
        self.org_count = u32(oid + 1)

    @gl.public.write
    def update_constitution(self, org_id: u32, new_constitution: str):
        """Update the organization's constitution. Admin or owner."""
        self._require_admin_or_owner(org_id)
        self.orgs[org_id].constitution = new_constitution

    @gl.public.write
    def set_auto_approve(self, org_id: u32, enabled: bool, threshold_usd: str, veto_window_hours: u32):
        """
        Configure auto-approval for small grants. Owner only.

        When enabled, proposals scoring alignment >= 8, risk = low,
        recommendation = approve, AND amount <= threshold_usd are
        automatically marked as approved. Owner/admins can veto within
        the veto_window_hours after auto-approval.

        Pass enabled=False to turn off auto-approval entirely.
        """
        self._require_owner(org_id)
        self.orgs[org_id].auto_approve_enabled = enabled
        self.orgs[org_id].auto_approve_threshold_usd = threshold_usd
        self.orgs[org_id].veto_window_hours = veto_window_hours

    # ─── Admin Management ─────────────────────────────────────────────────────

    @gl.public.write
    def add_admin(self, org_id: u32, admin_address: Address):
        """Add an admin to the organization. Owner only."""
        self._require_owner(org_id)
        admin_key = f"{int(org_id)}:{str(admin_address)}"
        self.org_admins[admin_key] = u32(1)
        # Update admin list for enumeration
        list_json = self.admin_list.get(org_id, "[]")
        admins = json.loads(list_json)
        addr_str = str(admin_address)
        if addr_str not in admins:
            admins.append(addr_str)
            self.admin_list[org_id] = json.dumps(admins)

    @gl.public.write
    def remove_admin(self, org_id: u32, admin_address: Address):
        """Remove an admin from the organization. Owner only."""
        self._require_owner(org_id)
        admin_key = f"{int(org_id)}:{str(admin_address)}"
        self.org_admins[admin_key] = u32(0)
        # Update admin list
        list_json = self.admin_list.get(org_id, "[]")
        admins = json.loads(list_json)
        addr_str = str(admin_address)
        if addr_str in admins:
            admins.remove(addr_str)
            self.admin_list[org_id] = json.dumps(admins)

    @gl.public.write
    def transfer_ownership(self, org_id: u32, new_owner: Address):
        """Transfer organization ownership to a new address. Current owner only."""
        self._require_owner(org_id)
        self.orgs[org_id].owner = new_owner

    # ─── Grant Proposals ──────────────────────────────────────────────────────

    @gl.public.write
    def submit_proposal(
        self,
        org_id: u32,
        title: str,
        description: str,
        requested_amount_usd: str,
        recipient: str,
        target_program: str,
        rationale: str,
    ):
        """Submit a grant proposal to an organization."""
        org = self.orgs[org_id]
        pid = self.proposal_count

        self.proposals[pid] = Proposal(
            id=pid,
            org_id=org_id,
            title=title,
            description=description,
            requested_amount_usd=requested_amount_usd,
            recipient=recipient,
            target_program=target_program,
            rationale=rationale,
            submitter=gl.message.sender_address,
            alignment_score=i32(0),
            risk_level="",
            roi_assessment="",
            recommendation="pending",
            reasoning="",
            evaluated=False,
            status="pending",
        )
        self.proposal_count = u32(pid + 1)
        self.orgs[org_id].proposal_count = u32(org.proposal_count + 1)

        # Register program name for budget tracking
        known_json = self.program_names.get(org_id, "[]")
        known = json.loads(known_json)
        if target_program not in known:
            known.append(target_program)
            self.program_names[org_id] = json.dumps(known)

    @gl.public.write
    def evaluate_proposal(self, proposal_id: u32):
        """
        Trigger AI validator consensus to evaluate a grant proposal.
        Sets status based on recommendation and auto-approve rules.
        Approved proposals update the program's cumulative spend.
        """
        proposal = self.proposals[proposal_id]
        if proposal.evaluated:
            raise gl.vm.UserError("Already evaluated")

        org = self.orgs[proposal.org_id]
        constitution = org.constitution
        program_key = f"{int(proposal.org_id)}:{str(proposal.target_program)}"
        program_already_spent = self.program_spent.get(program_key, "0")

        proposal_text = json.dumps({
            "title": str(proposal.title),
            "description": str(proposal.description),
            "requested_amount_usd": str(proposal.requested_amount_usd),
            "recipient": str(proposal.recipient),
            "target_program": str(proposal.target_program),
            "rationale": str(proposal.rationale),
            "program_already_spent_usd": program_already_spent,
        })

        def leader_fn():
            prompt = f"""You are an impartial grants evaluator for an organization.

Given the organization's constitution (which defines its mission, grant programs,
budgets, and allocation rules) and a grant proposal, evaluate the proposal.
All monetary amounts are in USD.

ORGANIZATION CONSTITUTION:
{constitution}

GRANT PROPOSAL:
{proposal_text}

The "program_already_spent_usd" field shows total USD already approved for the
target program. Use it to assess remaining budget.

Evaluate on these criteria:
1. alignment_score (0-10): How well does this align with the organization's mission
   AND the target program's mandate and remaining budget?
2. risk_level ("low", "medium", "high"): Financial and operational risk.
   Consider whether the USD amount fits within the target program's remaining budget.
3. roi_assessment ("positive", "neutral", "negative"): Expected return
   on investment for the organization and its community.
4. recommendation ("approve", "reject", "modify"): Final recommendation.
5. reasoning: Brief explanation covering mission alignment, program fit,
   budget compliance, and risk factors. Max 200 words.

Return ONLY valid JSON, no markdown fences:
{{"alignment_score": N, "risk_level": "...", "roi_assessment": "...", "recommendation": "...", "reasoning": "..."}}"""

            result = gl.nondet.exec_prompt(prompt)
            cleaned = result.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                cleaned = cleaned.rsplit("```", 1)[0]
            return json.loads(cleaned.strip())

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            leader_data = leader_result.calldata

            required = ["alignment_score", "risk_level", "roi_assessment",
                        "recommendation", "reasoning"]
            if not all(k in leader_data for k in required):
                return False
            if leader_data["alignment_score"] not in range(0, 11):
                return False
            if leader_data["risk_level"] not in ["low", "medium", "high"]:
                return False
            if leader_data["roi_assessment"] not in ["positive", "neutral", "negative"]:
                return False
            if leader_data["recommendation"] not in ["approve", "reject", "modify"]:
                return False

            validator_data = leader_fn()

            if leader_data["recommendation"] != validator_data["recommendation"]:
                return False
            if leader_data["risk_level"] != validator_data["risk_level"]:
                return False
            if leader_data["roi_assessment"] != validator_data["roi_assessment"]:
                return False
            if abs(leader_data["alignment_score"] - validator_data["alignment_score"]) > 1:
                return False

            return True

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        rec = result["recommendation"]
        score = result["alignment_score"]

        # Determine final status — check auto-approve first
        auto_approved = False
        if org.auto_approve_enabled:
            try:
                amount = float(str(proposal.requested_amount_usd))
                threshold = float(str(org.auto_approve_threshold_usd))
                if (amount <= threshold
                        and rec == "approve"
                        and score >= 8
                        and result["risk_level"] == "low"):
                    auto_approved = True
            except Exception:
                pass

        if auto_approved:
            status = "auto_approved"
        elif rec == "approve":
            status = "approved"
        elif rec == "reject":
            status = "rejected"
        elif rec == "modify":
            status = "needs_modification"
        else:
            status = "approved" if rec == "approve" else "rejected"

        # Track program spending for approved/auto-approved proposals
        if status in ("approved", "auto_approved"):
            try:
                current = float(self.program_spent.get(program_key, "0"))
                amount = float(str(proposal.requested_amount_usd))
                self.program_spent[program_key] = str(current + amount)
            except Exception:
                pass

        self.proposals[proposal_id].alignment_score = i32(result["alignment_score"])
        self.proposals[proposal_id].risk_level = result["risk_level"]
        self.proposals[proposal_id].roi_assessment = result["roi_assessment"]
        self.proposals[proposal_id].recommendation = result["recommendation"]
        self.proposals[proposal_id].reasoning = result["reasoning"]
        self.proposals[proposal_id].evaluated = True
        self.proposals[proposal_id].status = status

    @gl.public.write
    def veto_proposal(self, proposal_id: u32):
        """
        Veto an auto-approved proposal. Admin or owner only.
        The veto window (in hours) is defined per-org by the owner.
        On-chain: always allows veto on auto_approved proposals.
        Off-chain (frontend/bot): enforces the time window display.
        """
        proposal = self.proposals[proposal_id]
        self._require_admin_or_owner(proposal.org_id)
        if proposal.status != "auto_approved":
            raise gl.vm.UserError("Can only veto auto-approved proposals")

        self.proposals[proposal_id].status = "vetoed"

        # Reverse program spend
        program_key = f"{int(proposal.org_id)}:{str(proposal.target_program)}"
        try:
            current = float(self.program_spent.get(program_key, "0"))
            amount = float(str(proposal.requested_amount_usd))
            self.program_spent[program_key] = str(max(0.0, current - amount))
        except Exception:
            pass

    # ─── Progress Reports ─────────────────────────────────────────────────────

    @gl.public.write
    def submit_report(
        self,
        proposal_id: u32,
        milestones_completed: str,
        funds_spent_usd: str,
        deliverables: str,
        evidence_urls: str,
    ):
        """Submit a progress report for an approved grant."""
        proposal = self.proposals[proposal_id]
        if proposal.status not in ("approved", "auto_approved"):
            raise gl.vm.UserError("Can only submit reports for approved proposals")

        report_num = self.report_counts.get(proposal_id, u32(0))
        report_key = f"{int(proposal_id)}:{int(report_num)}"

        self.reports[report_key] = Report(
            proposal_id=proposal_id,
            report_number=report_num,
            milestones_completed=milestones_completed,
            funds_spent_usd=funds_spent_usd,
            deliverables=deliverables,
            evidence_urls=evidence_urls,
            progress_score=i32(0),
            roi_status="",
            ai_summary="",
            evaluated=False,
        )
        self.report_counts[proposal_id] = u32(int(report_num) + 1)

    @gl.public.write
    def evaluate_report(self, proposal_id: u32, report_number: u32):
        """
        AI validators evaluate a progress report against the original proposal KPIs.
        Sets progress_score, roi_status, and ai_summary.
        """
        report_key = f"{int(proposal_id)}:{int(report_number)}"
        report = self.reports[report_key]
        if report.evaluated:
            raise gl.vm.UserError("Report already evaluated")

        proposal = self.proposals[proposal_id]
        proposal_text = json.dumps({
            "title": str(proposal.title),
            "description": str(proposal.description),
            "requested_amount_usd": str(proposal.requested_amount_usd),
            "target_program": str(proposal.target_program),
            "rationale": str(proposal.rationale),
        })
        report_text = json.dumps({
            "report_number": int(report.report_number),
            "milestones_completed": str(report.milestones_completed),
            "funds_spent_usd": str(report.funds_spent_usd),
            "deliverables": str(report.deliverables),
            "evidence_urls": str(report.evidence_urls),
        })

        def leader_fn():
            prompt = f"""You are an impartial grants auditor evaluating the progress of a funded grant.
All monetary amounts are in USD.

ORIGINAL GRANT PROPOSAL:
{proposal_text}

PROGRESS REPORT #{int(report_number)}:
{report_text}

Evaluate the grantee's execution on these criteria:
1. progress_score (0-10): How well has the grantee delivered against the original proposal?
   Consider milestones completed, fund accountability, and deliverable quality.
2. roi_status: One of:
   - "on_track": Progress matches expectations, spending is proportional to milestones
   - "at_risk": Behind on milestones or spending without proportional progress
   - "exceeding": Ahead of milestones or delivering meaningfully beyond original scope
   - "failed": Critical failure — no meaningful progress, funds misused, or deliverables absent
3. ai_summary: 2-3 sentences comparing actual deliverables against promised KPIs,
   highlighting concerns or positive signals. Max 150 words.

Return ONLY valid JSON, no markdown fences:
{{"progress_score": N, "roi_status": "...", "ai_summary": "..."}}"""

            result = gl.nondet.exec_prompt(prompt)
            cleaned = result.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                cleaned = cleaned.rsplit("```", 1)[0]
            return json.loads(cleaned.strip())

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            leader_data = leader_result.calldata

            required = ["progress_score", "roi_status", "ai_summary"]
            if not all(k in leader_data for k in required):
                return False
            if leader_data["progress_score"] not in range(0, 11):
                return False
            if leader_data["roi_status"] not in ["on_track", "at_risk", "exceeding", "failed"]:
                return False

            validator_data = leader_fn()

            if leader_data["roi_status"] != validator_data["roi_status"]:
                return False
            if abs(leader_data["progress_score"] - validator_data["progress_score"]) > 1:
                return False

            return True

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        self.reports[report_key].progress_score = i32(result["progress_score"])
        self.reports[report_key].roi_status = result["roi_status"]
        self.reports[report_key].ai_summary = result["ai_summary"]
        self.reports[report_key].evaluated = True

    # ─── View Methods ─────────────────────────────────────────────────────────

    @gl.public.view
    def get_org(self, org_id: u32) -> str:
        o = self.orgs[org_id]
        return json.dumps({
            "id": int(o.id),
            "name": str(o.name),
            "constitution": str(o.constitution),
            "owner": str(o.owner),
            "proposal_count": int(o.proposal_count),
            "auto_approve_enabled": bool(o.auto_approve_enabled),
            "auto_approve_threshold_usd": str(o.auto_approve_threshold_usd),
            "veto_window_hours": int(o.veto_window_hours),
        })

    @gl.public.view
    def get_org_count(self) -> u32:
        return self.org_count

    @gl.public.view
    def get_org_admins(self, org_id: u32) -> str:
        """Returns JSON list of admin addresses for this org (excludes owner)."""
        return self.admin_list.get(org_id, "[]")

    @gl.public.view
    def get_proposal(self, proposal_id: u32) -> str:
        p = self.proposals[proposal_id]
        return json.dumps({
            "id": int(p.id),
            "org_id": int(p.org_id),
            "title": str(p.title),
            "description": str(p.description),
            "requested_amount_usd": str(p.requested_amount_usd),
            "recipient": str(p.recipient),
            "target_program": str(p.target_program),
            "rationale": str(p.rationale),
            "submitter": str(p.submitter),
            "alignment_score": int(p.alignment_score),
            "risk_level": str(p.risk_level),
            "roi_assessment": str(p.roi_assessment),
            "recommendation": str(p.recommendation),
            "reasoning": str(p.reasoning),
            "evaluated": bool(p.evaluated),
            "status": str(p.status),
        })

    @gl.public.view
    def get_proposal_count(self) -> u32:
        return self.proposal_count

    @gl.public.view
    def get_report(self, proposal_id: u32, report_number: u32) -> str:
        report_key = f"{int(proposal_id)}:{int(report_number)}"
        r = self.reports[report_key]
        return json.dumps({
            "proposal_id": int(r.proposal_id),
            "report_number": int(r.report_number),
            "milestones_completed": str(r.milestones_completed),
            "funds_spent_usd": str(r.funds_spent_usd),
            "deliverables": str(r.deliverables),
            "evidence_urls": str(r.evidence_urls),
            "progress_score": int(r.progress_score),
            "roi_status": str(r.roi_status),
            "ai_summary": str(r.ai_summary),
            "evaluated": bool(r.evaluated),
        })

    @gl.public.view
    def get_report_count(self, proposal_id: u32) -> u32:
        return self.report_counts.get(proposal_id, u32(0))

    @gl.public.view
    def get_program_budget_status(self, org_id: u32) -> str:
        """Returns total USD approved per grant program for this org."""
        known_json = self.program_names.get(org_id, "[]")
        known = json.loads(known_json)
        status = {}
        for program in known:
            key = f"{int(org_id)}:{program}"
            status[program] = self.program_spent.get(key, "0")
        return json.dumps(status)
