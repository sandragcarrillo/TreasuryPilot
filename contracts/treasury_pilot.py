# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
import json


@allow_storage
@dataclass
class DAO:
    id: u32
    name: str
    constitution: str
    admin: Address
    proposal_count: u32


@allow_storage
@dataclass
class Proposal:
    id: u32
    dao_id: u32
    title: str
    description: str
    requested_amount: str
    recipient: str
    target_council: str
    rationale: str
    submitter: Address
    # Evaluation results (empty until evaluated)
    alignment_score: i32     # 0-10
    risk_level: str          # "low", "medium", "high"
    roi_assessment: str      # "positive", "neutral", "negative"
    recommendation: str      # "approve", "reject", "modify"
    reasoning: str
    evaluated: bool


class Contract(gl.Contract):
    daos: TreeMap[u32, DAO]
    dao_count: u32
    proposals: TreeMap[u32, Proposal]
    proposal_count: u32

    def __init__(self):
        self.dao_count = u32(0)
        self.proposal_count = u32(0)

    @gl.public.write
    def create_dao(self, name: str, constitution: str):
        did = self.dao_count
        self.daos[did] = DAO(
            id=did,
            name=name,
            constitution=constitution,
            admin=gl.message.sender_address,
            proposal_count=u32(0),
        )
        self.dao_count = u32(did + 1)

    @gl.public.write
    def submit_proposal(
        self,
        dao_id: u32,
        title: str,
        description: str,
        requested_amount: str,
        recipient: str,
        target_council: str,
        rationale: str
    ):
        dao = self.daos[dao_id]
        pid = self.proposal_count
        self.proposals[pid] = Proposal(
            id=pid,
            dao_id=dao_id,
            title=title,
            description=description,
            requested_amount=requested_amount,
            recipient=recipient,
            target_council=target_council,
            rationale=rationale,
            submitter=gl.message.sender_address,
            alignment_score=i32(0),
            risk_level="",
            roi_assessment="",
            recommendation="pending",
            reasoning="",
            evaluated=False,
        )
        self.proposal_count = u32(pid + 1)
        self.daos[dao_id].proposal_count = u32(dao.proposal_count + 1)

    @gl.public.write
    def evaluate_proposal(self, proposal_id: u32):
        proposal = self.proposals[proposal_id]
        if proposal.evaluated:
            raise gl.vm.UserError("Already evaluated")

        dao = self.daos[proposal.dao_id]
        constitution = dao.constitution
        proposal_text = json.dumps({
            "title": str(proposal.title),
            "description": str(proposal.description),
            "requested_amount": str(proposal.requested_amount),
            "recipient": str(proposal.recipient),
            "target_council": str(proposal.target_council),
            "rationale": str(proposal.rationale),
        })

        def leader_fn():
            prompt = f"""You are an impartial DAO treasury evaluator.

Given the DAO constitution (which includes organizational structure, councils,
budgets, and rules) and a treasury proposal, evaluate the proposal.

DAO CONSTITUTION:
{constitution}

PROPOSAL:
{proposal_text}

Evaluate on these criteria:
1. alignment_score (0-10): How well does this align with the DAO mission
   AND the specific target council's mandate and budget?
2. risk_level ("low", "medium", "high"): Financial and operational risk.
   Consider whether the amount fits within the target council's budget.
3. roi_assessment ("positive", "neutral", "negative"): Expected return
   on investment for the DAO and its community.
4. recommendation ("approve", "reject", "modify"): Final recommendation.
5. reasoning: Brief explanation covering mission alignment, council fit,
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

        self.proposals[proposal_id].alignment_score = i32(result["alignment_score"])
        self.proposals[proposal_id].risk_level = result["risk_level"]
        self.proposals[proposal_id].roi_assessment = result["roi_assessment"]
        self.proposals[proposal_id].recommendation = result["recommendation"]
        self.proposals[proposal_id].reasoning = result["reasoning"]
        self.proposals[proposal_id].evaluated = True

    @gl.public.write
    def update_constitution(self, dao_id: u32, new_constitution: str):
        if gl.message.sender_address != self.daos[dao_id].admin:
            raise gl.vm.UserError("Only DAO admin can update constitution")
        self.daos[dao_id].constitution = new_constitution

    @gl.public.view
    def get_dao(self, dao_id: u32) -> str:
        d = self.daos[dao_id]
        return json.dumps({
            "id": int(d.id),
            "name": str(d.name),
            "constitution": str(d.constitution),
            "admin": str(d.admin),
            "proposal_count": int(d.proposal_count),
        })

    @gl.public.view
    def get_proposal(self, proposal_id: u32) -> str:
        p = self.proposals[proposal_id]
        return json.dumps({
            "id": int(p.id),
            "dao_id": int(p.dao_id),
            "title": str(p.title),
            "description": str(p.description),
            "requested_amount": str(p.requested_amount),
            "recipient": str(p.recipient),
            "target_council": str(p.target_council),
            "rationale": str(p.rationale),
            "alignment_score": int(p.alignment_score),
            "risk_level": str(p.risk_level),
            "roi_assessment": str(p.roi_assessment),
            "recommendation": str(p.recommendation),
            "reasoning": str(p.reasoning),
            "evaluated": bool(p.evaluated),
        })

    @gl.public.view
    def get_dao_count(self) -> u32:
        return self.dao_count

    @gl.public.view
    def get_proposal_count(self) -> u32:
        return self.proposal_count
