"use client";

import { useState } from "react";
import Link from "next/link";
import * as Accordion from "@radix-ui/react-accordion";
import {
  Plus,
  Building2,
  Sparkles,
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CreateDAOModal } from "@/components/CreateDAOModal";
import { OrgCard } from "@/components/OrgCard";
import { useOrgs } from "@/lib/hooks/useTreasuryPilot";

export default function HomePage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: orgs = [], isLoading, refetch } = useOrgs();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="grow pt-18 pb-0 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Hero />

          {/* Registry kept at current position */}
          <section className="mt-12 space-y-6 animate-slide-up" style={{ animationDelay: "150ms" }}>
            <div className="flex items-end justify-between border-b border-border-soft pb-4">
              <h2 className="text-[11px] font-mono tracking-[0.25em] text-text-faint">
                Organization Registry
              </h2>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 h-9 px-4 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/70 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Register Organization
              </button>
            </div>

            {isLoading ? (
              <div className="gov-card p-16 flex items-center justify-center">
                <span className="font-mono text-sm text-text-faint tracking-widest">Loading…</span>
              </div>
            ) : orgs.length === 0 ? (
              <EmptyRegistry onCreate={() => setShowCreate(true)} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {orgs.slice(0, 6).map((org, i) => (
                  <OrgCard key={org.id} org={org} animationDelay={i * 60} />
                ))}
              </div>
            )}

            {orgs.length > 6 && (
              <div className="flex justify-center pt-2">
                <Link
                  href="/organizations"
                  className="text-[11px] font-mono tracking-[0.2em] text-accent hover:text-accent/80 transition-colors"
                >
                  View all {orgs.length} organizations →
                </Link>
              </div>
            )}
          </section>

          <Problem />
          <HowItWorks />
          <HowItWorksForUsers />
          <TrustMoment />
          <Pricing />
          <FAQ />
          <FinalCTA />
        </div>
      </main>

      <footer className="border-t border-border-soft py-6 px-6 mt-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[11px] font-mono text-text-faint tracking-wider">
          <span>Treasury Pilot</span>
          <a
            href="https://github.com/sandragcarrillo/TreasuryPilot"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-dim transition-colors"
          >
            GitHub ↗
          </a>
        </div>
      </footer>

      {showCreate && (
        <CreateDAOModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="py-24 md:py-32 animate-fade-in">
      <div className="max-w-4xl">
        <div className="text-[11px] font-mono text-accent tracking-[0.3em] mb-8">
          Governance infrastructure for DAOs
        </div>
        <h1 className="text-5xl md:text-7xl text-text font-semibold leading-[0.95] tracking-tight mb-6">
          AI evaluation for DAO grants.
        </h1>
        <p className="text-2xl md:text-3xl font-medium text-text-dim leading-tight mb-8 tracking-tight">
          On-chain reasoning your delegates can defend.
        </p>
        <p className="text-base md:text-lg text-text-dim leading-relaxed max-w-2xl mb-10">
          Treasury Pilot evaluates every grant proposal against your DAO&apos;s on-chain
          constitution using consensus from multiple AI validators. Every decision
          comes with public reasoning your community can audit.
        </p>

        <div className="text-[11px] font-mono text-text-faint tracking-[0.2em] mb-4">
          Live pilot with Rootstock Collective
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-medium bg-accent text-bg hover:bg-accent/90 transition-colors"
          >
            Try the Playground
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-medium text-text-dim border border-border-soft hover:border-border hover:text-text transition-all"
          >
            Read how it works
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Problem ─────────────────────────────────────────────────────────────────

function Problem() {
  const lines = [
    { emphasis: "days", text: "Reviews take", tail: "because every delegate reads from scratch." },
    { emphasis: "inconsistent", text: "Decisions are", tail: "because no two delegates apply the same rubric." },
    { emphasis: "disappear", text: "Approved grants", tail: "into a black hole until someone asks for a report." },
    { emphasis: "no memory", text: "There's", tail: "between proposals — every decision starts blank." },
  ];

  return (
    <section className="py-32 border-t border-border-soft mt-20">
      <div className="max-w-4xl">
        <div className="text-[11px] font-mono text-accent tracking-[0.3em] mb-6">
          The problem
        </div>
        <h2 className="text-4xl md:text-5xl text-text font-semibold leading-tight tracking-tight mb-12">
          Grant review is broken in every DAO.
        </h2>

        <div className="divide-y divide-border-soft">
          {lines.map((line, i) => (
            <p key={i} className="py-5 text-xl md:text-2xl text-text-dim leading-snug">
              {line.text}{" "}
              <span className="text-text font-medium">{line.emphasis}</span>{" "}
              {line.tail}
            </p>
          ))}
        </div>

        <p className="mt-10 text-[11px] font-mono text-text-faint tracking-[0.2em]">
          Treasury Pilot fixes all four.
        </p>
      </div>
    </section>
  );
}

// ─── How it works ────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-32 border-t border-border-soft scroll-mt-20"
    >
      <div className="max-w-5xl">
        <div className="text-[11px] font-mono text-accent tracking-[0.3em] mb-6">
          How it works
        </div>
        <h2 className="text-4xl md:text-5xl text-text font-semibold leading-tight tracking-tight mb-16">
          Three steps. Public reasoning at every step.
        </h2>

        <div className="flex flex-col gap-6">
          <HowStep
            n="01"
            title="Define your constitution on-chain"
            body="Your DAO's mission, grant programs, evaluation criteria, and red flags become a structured document published on-chain. One source of truth. Versioned. Auditable. Every evaluation references this document."
            visual={<ConstitutionVisual />}
          />
          <HowStep
            n="02"
            title="Multiple AI validators reach consensus"
            body="Not one model deciding alone. Multiple validators evaluate independently, then agree on alignment, risk, and recommendation. If they disagree, that disagreement surfaces — you see exactly where the uncertainty is."
            visual={<ConsensusVisual />}
          />
          <HowStep
            n="03"
            title="Your delegates decide. Always."
            body="Treasury Pilot is advisory infrastructure, never the decision-maker. Your delegates see the AI's recommendation with full reasoning, similar past proposals, and risk assessment — then they vote. Auto-approval is opt-in, with veto windows for safety."
            visual={<DelegateVisual />}
          />
        </div>
      </div>
    </section>
  );
}

function HowStep({
  n,
  title,
  body,
  visual,
}: {
  n: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-bg-elev border border-border p-8 md:p-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-center">
      <div>
        <div className="font-mono text-accent text-5xl md:text-6xl mb-6 tracking-tight">
          {n}
        </div>
        <h3 className="text-2xl md:text-3xl font-semibold text-text tracking-tight leading-snug mb-4">
          {title}
        </h3>
        <p className="text-base md:text-lg text-text-dim leading-relaxed max-w-2xl">
          {body}
        </p>
      </div>
      <div className="md:w-80">{visual}</div>
    </div>
  );
}

function ConstitutionVisual() {
  return (
    <div className="space-y-2">
      {["Mission", "Programs", "Criteria", "Red flags"].map((label, i) => (
        <div
          key={label}
          className="rounded-lg bg-bg-elev-2 border border-border-soft px-4 py-3 text-sm text-text-dim"
          style={{ marginLeft: `${i * 8}px` }}
        >
          <span className="font-mono text-[10px] text-text-faint mr-2">
            {String(i + 1).padStart(2, "0")}
          </span>
          {label}
        </div>
      ))}
      <div className="font-mono text-[10px] text-text-faint pt-2 truncate">
        0xa477…f3 · Studio
      </div>
    </div>
  );
}

function ConsensusVisual() {
  return (
    <div className="space-y-2">
      {[
        { name: "Validator 1", score: "8.1" },
        { name: "Validator 2", score: "8.3" },
        { name: "Validator 3", score: "8.2" },
      ].map((v) => (
        <div
          key={v.name}
          className="rounded-lg bg-bg-elev-2 border border-border-soft px-4 py-2.5 flex items-center justify-between text-sm"
        >
          <span className="text-text-dim font-mono text-xs">{v.name}</span>
          <span className="text-text font-mono">{v.score}</span>
        </div>
      ))}
      <div className="pt-1 flex justify-center">
        <ChevronDown className="w-4 h-4 text-text-faint" />
      </div>
      <div className="rounded-lg bg-accent/10 border border-accent/40 px-4 py-2.5 flex items-center justify-between text-sm">
        <span className="text-accent font-mono text-xs">Consensus</span>
        <span className="text-accent font-mono font-medium">8.2 · 98%</span>
      </div>
    </div>
  );
}

function DelegateVisual() {
  return (
    <div className="rounded-lg bg-bg-elev-2 border border-border-soft p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="font-mono text-[10px] text-text-faint">AI recommendation</div>
          <div className="text-sm text-accent font-medium">Approve</div>
        </div>
        <span className="font-mono text-[10px] text-text-faint">8.2/10</span>
      </div>
      <div className="border-t border-border-soft pt-3 space-y-2">
        <div className="font-mono text-[10px] text-text-faint">Delegate vote</div>
        <div className="flex gap-2">
          <div className="flex-1 h-8 rounded-md bg-accent text-bg text-xs font-medium flex items-center justify-center">
            Approve
          </div>
          <div className="flex-1 h-8 rounded-md border border-border-soft text-text-faint text-xs flex items-center justify-center">
            Reject
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Built for both sides (kept) ─────────────────────────────────────────────

function HowItWorksForUsers() {
  const personas = [
    {
      icon: <Building2 className="w-5 h-5 text-accent" />,
      eyebrow: "For organizations",
      title: "Run your grants program with AI oversight",
      steps: [
        "Register your organization and publish your constitution on-chain.",
        "Configure auto-approval thresholds, veto windows, and invite admins.",
        "Watch proposals get AI-evaluated against your mission and programs.",
        "Track approved grants, review progress reports, and measure ROI.",
      ],
    },
    {
      icon: <Sparkles className="w-5 h-5 text-accent" />,
      eyebrow: "For proposers & grantees",
      title: "Get funded with transparent, fair evaluation",
      steps: [
        "Browse organizations and find programs that align with your work.",
        "Submit a grant proposal targeting a specific program and amount.",
        "AI validators evaluate your proposal and publish public reasoning.",
        "Once approved, deliver milestones and submit progress reports.",
      ],
    },
  ];

  return (
    <section className="py-32 border-t border-border-soft animate-fade-in">
      <div className="max-w-5xl">
        <div className="text-[11px] font-mono text-accent tracking-[0.3em] mb-6">
          For both sides
        </div>
        <h3 className="text-4xl md:text-5xl text-text leading-tight tracking-tight font-semibold mb-4">
          Built for both sides
        </h3>
        <p className="text-text-dim text-base md:text-lg leading-relaxed mb-12 max-w-2xl">
          Treasury Pilot works the same way whether you&apos;re running a grants
          program or applying for one.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {personas.map((p) => (
            <div key={p.eyebrow} className="gov-card p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  {p.icon}
                </div>
                <div>
                  <div className="text-[11px] font-mono text-text-faint tracking-[0.2em]">
                    {p.eyebrow}
                  </div>
                  <h4 className="text-lg md:text-xl font-medium text-text tracking-tight leading-snug mt-0.5">
                    {p.title}
                  </h4>
                </div>
              </div>
              <ol className="space-y-3 pt-2 border-t border-border-soft">
                {p.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-text-dim">
                    <span className="font-mono text-accent/80 text-xs shrink-0 w-5 pt-0.5">
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Trust moment ────────────────────────────────────────────────────────────

function TrustMoment() {
  return (
    <section className="py-32 border-t border-border-soft">
      <div className="max-w-5xl">
        <div className="text-[11px] font-mono text-accent tracking-[0.3em] mb-6">
          Transparency
        </div>
        <h2 className="text-4xl md:text-5xl text-text font-semibold leading-tight tracking-tight mb-4">
          Every evaluation looks like this.
        </h2>
        <p className="text-2xl md:text-2xl font-medium text-text-dim leading-tight tracking-tight mb-12">
          Public. Auditable. Defendable.
        </p>

        <div className="rounded-2xl bg-bg-elev border border-border p-8 md:p-10 max-w-4xl mx-auto space-y-8">
          {/* Top meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft pb-5">
            <div className="flex items-center gap-3 text-[11px] font-mono text-text-faint tracking-wider">
              <span>RSK-001</span>
              <span className="text-text-faint/40">·</span>
              <span>Rootstock Collective</span>
            </div>
            <span className="text-[11px] font-mono text-accent border border-accent/40 bg-accent/10 rounded-full px-3 py-1">
              Approved
            </span>
          </div>

          {/* Title */}
          <h3 className="text-2xl md:text-3xl font-semibold text-text tracking-tight leading-snug">
            Multi-asset lending protocol on Rootstock
          </h3>

          {/* Scores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-y border-border-soft py-6">
            {[
              { label: "Alignment", value: "8.2 / 10", color: "text-text" },
              { label: "Risk", value: "Low", color: "text-text" },
              { label: "ROI", value: "Positive", color: "text-text" },
              { label: "Recommendation", value: "Approve", color: "text-accent" },
            ].map((s) => (
              <div key={s.label} className="space-y-2">
                <div className="text-[10px] font-mono text-text-faint tracking-[0.2em]">
                  {s.label}
                </div>
                <div className={`text-xl md:text-2xl font-semibold tracking-tight ${s.color}`}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Reasoning */}
          <div className="space-y-4">
            <div className="text-[10px] font-mono text-text-faint tracking-[0.2em]">
              AI reasoning
            </div>
            <div className="space-y-4 text-sm md:text-base text-text-dim leading-relaxed">
              <p>
                The proposal builds a multi-asset lending protocol{" "}
                <ReasonHighlight>natively on Rootstock</ReasonHighlight>, leveraging
                rBTC as primary collateral. This directly advances the mission of
                strengthening Bitcoin&apos;s DeFi layer and satisfies ecosystem
                alignment.
              </p>
              <p>
                The team has prior contributions to the Rootstock ecosystem with{" "}
                <ReasonHighlight>verifiable history</ReasonHighlight>. Budget of $75k
                is <ReasonHighlight>proportional</ReasonHighlight> to a 6-month
                milestone-based delivery with smart contract audits included.
              </p>
              <p>
                Risk is <ReasonHighlight>low</ReasonHighlight> given the team&apos;s
                track record and conservative initial LTV parameters. Could benefit
                from more specific KPIs around TVL targets — consider requesting
                clarification before final vote.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border-soft pt-5 text-[11px] font-mono">
            <span className="text-text-faint">3 validators · 98% consensus</span>
            <a
              href="https://explorer-studio.genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1"
            >
              View on GenLayer Studio
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <p className="text-center text-sm text-text-dim mt-10">
          Audit any decision. Always.
        </p>
      </div>
    </section>
  );
}

function ReasonHighlight({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-text"
      style={{
        backgroundColor: "rgba(127, 229, 176, 0.08)",
        borderBottom: "1px solid rgba(127, 229, 176, 0.4)",
        padding: "0 2px",
      }}
    >
      {children}
    </span>
  );
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

function Pricing() {
  const tiers = [
    {
      name: "Starter",
      price: "$199",
      tagline: "For DAOs experimenting with AI grants review.",
      highlighted: false,
      features: [
        "Up to 10 proposals/month",
        "2 admin seats",
        "Telegram bot included",
        "Community support",
      ],
    },
    {
      name: "Growth · Popular",
      price: "$799",
      tagline: "For active DAOs running real grants programs.",
      highlighted: true,
      features: [
        "Up to 50 proposals/month",
        "10 admin seats",
        "Discourse + Snapshot integration",
        "ROI tracking + progress reports",
        "Priority support",
      ],
    },
    {
      name: "Scale",
      price: "$2,499",
      tagline: "For multi-program DAOs with sophisticated governance.",
      highlighted: false,
      features: [
        "Up to 200 proposals/month",
        "Unlimited admins",
        "Cross-chain mode (LayerZero)",
        "SLA 99.5%",
        "Dedicated support",
      ],
    },
  ];

  return (
    <section className="py-32 border-t border-border-soft">
      <div className="max-w-6xl">
        <div className="text-[11px] font-mono text-accent tracking-[0.3em] mb-6">
          Pricing
        </div>
        <h2 className="text-4xl md:text-5xl text-text font-semibold leading-tight tracking-tight mb-4">
          Pay for what fits your DAO.
        </h2>
        <p className="text-2xl md:text-2xl font-medium text-text-dim leading-tight tracking-tight mb-12">
          Start with a pilot. Scale when it works.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl bg-bg-elev p-8 flex flex-col gap-6 ${
                t.highlighted
                  ? "border border-accent/60"
                  : "border border-border-soft"
              }`}
            >
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-accent tracking-[0.25em]">
                  {t.name}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl md:text-5xl font-semibold text-text tracking-tight">
                    {t.price}
                  </span>
                  <span className="text-text-dim text-base">/month</span>
                </div>
                <p className="text-sm text-text-dim leading-relaxed pt-1">
                  {t.tagline}
                </p>
              </div>
              <ul className="space-y-3 pt-4 border-t border-border-soft">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm text-text-dim items-start">
                    <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-text-dim mt-10">
          Need something custom?{" "}
          <a
            href="mailto:hello@treasurypilot.xyz"
            className="text-accent hover:text-accent/80 transition-colors"
          >
            Talk to us →
          </a>
        </p>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

function FAQ() {
  const items = [
    {
      q: "What if the AI is wrong?",
      a: "That's why Treasury Pilot is advisory, not binding. Your delegates always make the final call. The AI's job is to surface analysis and flag issues — the decision and the responsibility stay human. We also publish every evaluation's reasoning publicly so disagreements can be debated with the actual logic on the table.",
    },
    {
      q: "Which AI model do you use?",
      a: "Treasury Pilot runs on GenLayer, which uses multiple LLM validators that must reach consensus on each evaluation. Rather than one model deciding alone, several models evaluate independently and either agree or surface disagreement. Currently this is powered by frontier models (Claude, GPT-4 class). The specific models can be audited per evaluation.",
    },
    {
      q: "Is the AI evaluation binding on the DAO?",
      a: "No. By default, AI evaluations are recommendations. DAOs can opt into auto-approval for small grants under a threshold (with a veto window for delegates to override), but this is a deliberate choice each DAO makes in their settings. You can run Treasury Pilot in shadow mode for as long as you want.",
    },
    {
      q: "What happens to data my DAO submits?",
      a: "Your constitution and evaluation results live on-chain and are public. Your DAO controls who has admin access. Treasury Pilot doesn't sell, share, or use your data for anything beyond running your evaluations.",
    },
    {
      q: "How does this compare to Snapshot or Tally?",
      a: "Snapshot and Tally handle voting infrastructure — they don't evaluate proposals. Treasury Pilot sits before voting: ingests proposals, runs AI evaluation, and surfaces the analysis your delegates use to vote on Snapshot/Tally. We integrate with both rather than replace them.",
    },
    {
      q: "Can I use Treasury Pilot without my DAO being on-chain?",
      a: "Yes. The constitution and evaluations can live on GenLayer regardless of where your governance happens today. You can run Treasury Pilot as an evaluation layer that posts results back to your forum (Discourse, Commonwealth, etc.) without changing your existing voting setup.",
    },
    {
      q: "How long does setup take?",
      a: "For a standard pilot: about a week. We model your constitution from your existing docs, calibrate the AI against past proposals, and integrate with your forum. Then you run in shadow mode for as long as you want before going live.",
    },
    {
      q: "What's GenLayer?",
      a: "GenLayer is the underlying infrastructure that runs the AI consensus. Your delegates and proposers don't need to know it exists or hold any GenLayer tokens. We handle that. Think of it like Stripe for payments — infrastructure, invisible to your users.",
    },
  ];

  return (
    <section className="py-32 border-t border-border-soft">
      <div className="max-w-3xl">
        <div className="text-[11px] font-mono text-accent tracking-[0.3em] mb-6">
          FAQ
        </div>
        <h2 className="text-4xl md:text-5xl text-text font-semibold leading-tight tracking-tight mb-12">
          Things people ask.
        </h2>

        <Accordion.Root
          type="single"
          collapsible
          className="divide-y divide-border-soft border-y border-border-soft"
        >
          {items.map((item, i) => (
            <Accordion.Item key={i} value={`item-${i}`}>
              <Accordion.Header>
                <Accordion.Trigger className="group w-full flex items-center justify-between gap-4 py-6 text-left text-lg md:text-xl text-text font-medium tracking-tight hover:text-accent transition-colors">
                  {item.q}
                  <ChevronDown className="w-5 h-5 text-text-faint shrink-0 transition-transform group-data-[state=open]:rotate-180 group-hover:text-accent" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <p className="pb-6 pr-9 text-base text-text-dim leading-relaxed">
                  {item.a}
                </p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="py-40 border-t border-border-soft">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl text-text font-semibold leading-tight tracking-tight mb-5">
          Ready to evaluate your DAO&apos;s grants better?
        </h2>
        <p className="text-2xl md:text-2xl font-medium text-text-dim leading-tight tracking-tight mb-10">
          Start with a pilot. We&apos;ll walk you through it.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="mailto:hello@treasurypilot.xyz"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-xl text-base font-medium bg-accent text-bg hover:bg-accent/90 transition-colors"
          >
            Book a call
            <ArrowRight className="w-4 h-4" />
          </a>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-xl text-base font-medium text-text-dim border border-border-soft hover:border-border hover:text-text transition-all"
          >
            Try the Playground
          </Link>
        </div>

        <p className="text-[11px] font-mono text-text-faint tracking-[0.2em] mt-8">
          Live pilot with Rootstock Collective · More DAOs onboarding
        </p>
      </div>
    </section>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyRegistry({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="gov-card p-20 flex flex-col items-center gap-6 text-center">
      <div className="font-mono text-6xl text-accent/50 leading-none tracking-tight">∅</div>
      <div className="space-y-2 max-w-md">
        <p className="text-2xl text-text font-medium tracking-tight">Start something.</p>
        <p className="text-sm text-text-dim leading-relaxed">
          No organizations yet. Create the first one and define how AI
          evaluates proposals against your mission.
        </p>
      </div>
      <button
        onClick={onCreate}
        className="px-6 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/70 transition-all"
      >
        Register First Organization
      </button>
    </div>
  );
}
