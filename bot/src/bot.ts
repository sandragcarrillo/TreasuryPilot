import { Bot, Context, InlineKeyboard } from "grammy";
import { ContractReader } from "./contract.js";
import { walletLinks, chatOrgs, persist } from "./store.js";

const STATUS_EMOJI: Record<string, string> = {
  pending:            "⏳",
  approved:           "✅",
  rejected:           "❌",
  needs_modification: "⚠️",
  auto_approved:      "⚡",
  vetoed:             "🚫",
};

const ROI_EMOJI: Record<string, string> = {
  on_track:  "✅",
  at_risk:   "⚠️",
  exceeding: "🚀",
  failed:    "❌",
};

export function createBot(token: string, reader: ContractReader) {
  const bot = new Bot(token);
  const explorerBase = "https://explorer-studio.genlayer.com";

  // ─── /start ──────────────────────────────────────────────────────────────

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "🏛️ *TreasuryPilot Bot*\n\n" +
      "I keep you informed about your grants program — new proposals, AI evaluations, auto-approvals, progress reports, and more.\n\n" +
      "*Get started:*\n" +
      "/link `0xYourAddress` — Link your wallet to receive notifications\n" +
      "/myorgs — View your organizations\n" +
      "/proposals `<org_id>` — List proposals for an org\n" +
      "/proposal `<id>` — View a specific proposal\n" +
      "/budget `<org_id>` — Program budget status\n" +
      "/reports `<proposal_id>` — View progress reports\n" +
      "/help — Show all commands",
      { parse_mode: "Markdown" }
    );
  });

  // ─── /help ───────────────────────────────────────────────────────────────

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "*Commands:*\n\n" +
      "🔗 /link `0xAddress` — Link your wallet\n" +
      "🔓 /unlink — Remove wallet link\n" +
      "🏛️ /myorgs — Your organizations\n" +
      "📋 /proposals `<org_id>` — Org proposals\n" +
      "📄 /proposal `<id>` — Proposal details\n" +
      "💰 /budget `<org_id>` — Budget by program\n" +
      "📝 /reports `<proposal_id>` — Progress reports\n" +
      "📊 /stats — Overall stats",
      { parse_mode: "Markdown" }
    );
  });

  // ─── /link ───────────────────────────────────────────────────────────────

  bot.command("link", async (ctx) => {
    const args = ctx.message?.text?.split(" ").slice(1) || [];
    const address = args[0];

    if (!address || !address.startsWith("0x")) {
      await ctx.reply("Usage: /link `0xYourWalletAddress`", { parse_mode: "Markdown" });
      return;
    }

    const lower = address.toLowerCase();
    walletLinks.set(lower, ctx.chat.id);
    persist();

    // Find their orgs
    await ctx.reply("🔗 Linking wallet... scanning for your organizations...");

    try {
      const orgCount = await reader.getOrgCount();
      const ownedOrgs: number[] = [];

      for (let i = 0; i < orgCount; i++) {
        try {
          const org = await reader.getOrg(i);
          if (org.owner.toLowerCase() === lower) {
            ownedOrgs.push(i);
          }
          // Also check if they're an admin
          const admins = await reader.getOrgAdmins(i);
          if (admins.some((a) => a.toLowerCase() === lower) && !ownedOrgs.includes(i)) {
            ownedOrgs.push(i);
          }
        } catch {}
      }

      chatOrgs.set(ctx.chat.id, ownedOrgs);
      persist();

      if (ownedOrgs.length > 0) {
        const orgNames = await Promise.all(
          ownedOrgs.map(async (id) => {
            const org = await reader.getOrg(id);
            return `  • *${org.name}* (ID: ${id})`;
          })
        );
        await ctx.reply(
          `✅ Wallet linked! Found ${ownedOrgs.length} organization(s):\n\n${orgNames.join("\n")}\n\n` +
          "You'll receive notifications for new proposals, evaluations, and reports.",
          { parse_mode: "Markdown" }
        );
      } else {
        await ctx.reply(
          "✅ Wallet linked! No organizations found for this address.\n" +
          "You'll be notified if proposals you submit get evaluated."
        );
      }
    } catch (err) {
      await ctx.reply("✅ Wallet linked! Couldn't scan orgs right now, but notifications are active.");
    }
  });

  // ─── /unlink ─────────────────────────────────────────────────────────────

  bot.command("unlink", async (ctx) => {
    const toRemove: string[] = [];
    for (const [wallet, chatId] of walletLinks) {
      if (chatId === ctx.chat.id) toRemove.push(wallet);
    }
    toRemove.forEach((w) => walletLinks.delete(w));
    chatOrgs.delete(ctx.chat.id);
    persist();
    await ctx.reply("🔓 Wallet unlinked. You won't receive notifications anymore.");
  });

  // ─── /myorgs ─────────────────────────────────────────────────────────────

  bot.command("myorgs", async (ctx) => {
    const orgIds = chatOrgs.get(ctx.chat.id);
    if (!orgIds || orgIds.length === 0) {
      await ctx.reply("No organizations linked. Use /link `0xAddress` first.", { parse_mode: "Markdown" });
      return;
    }

    let msg = "🏛️ *Your Organizations:*\n\n";
    for (const id of orgIds) {
      try {
        const org = await reader.getOrg(id);
        msg += `*${org.name}* (ID: ${id})\n`;
        msg += `  Proposals: ${org.proposal_count}`;
        if (org.auto_approve_enabled) {
          msg += ` | Auto-approve: ≤$${org.auto_approve_threshold_usd}`;
        }
        msg += "\n\n";
      } catch {}
    }
    msg += "Use /proposals `<org_id>` to see proposals.";
    await ctx.reply(msg, { parse_mode: "Markdown" });
  });

  // ─── /proposals ──────────────────────────────────────────────────────────

  bot.command("proposals", async (ctx) => {
    const args = ctx.message?.text?.split(" ").slice(1) || [];
    const orgId = parseInt(args[0]);

    if (isNaN(orgId)) {
      await ctx.reply("Usage: /proposals `<org_id>`", { parse_mode: "Markdown" });
      return;
    }

    await ctx.reply("📋 Fetching proposals...");

    try {
      const proposals = await reader.getOrgProposals(orgId);
      if (proposals.length === 0) {
        await ctx.reply("No proposals found for this organization.");
        return;
      }

      let msg = `📋 *Proposals for Org #${orgId}:*\n\n`;
      for (const p of proposals.slice(-10)) { // Last 10
        const emoji = STATUS_EMOJI[p.status] || "⏳";
        msg += `${emoji} *#${p.id}* — ${p.title}\n`;
        msg += `  $${p.requested_amount_usd} | ${p.target_program} | ${p.status}\n`;
        if (p.evaluated) {
          msg += `  Score: ${p.alignment_score}/10 | ${p.risk_level} risk | ${p.recommendation}\n`;
        }
        msg += "\n";
      }
      msg += "Use /proposal `<id>` for full details.";
      await ctx.reply(msg, { parse_mode: "Markdown" });
    } catch (err) {
      await ctx.reply("Failed to fetch proposals. Try again.");
    }
  });

  // ─── /proposal ───────────────────────────────────────────────────────────

  bot.command("proposal", async (ctx) => {
    const args = ctx.message?.text?.split(" ").slice(1) || [];
    const proposalId = parseInt(args[0]);

    if (isNaN(proposalId)) {
      await ctx.reply("Usage: /proposal `<id>`", { parse_mode: "Markdown" });
      return;
    }

    try {
      const p = await reader.getProposal(proposalId);
      const emoji = STATUS_EMOJI[p.status] || "⏳";

      let msg = `${emoji} *Proposal #${p.id}: ${p.title}*\n\n`;
      msg += `*Status:* ${p.status}\n`;
      msg += `*Program:* ${p.target_program}\n`;
      msg += `*Amount:* $${p.requested_amount_usd} USD\n`;
      msg += `*Submitter:* \`${p.submitter}\`\n`;
      msg += `*Recipient:* \`${p.recipient}\`\n\n`;

      msg += `*Description:*\n${p.description}\n\n`;
      msg += `*Rationale:*\n${p.rationale}\n\n`;

      if (p.evaluated) {
        msg += `━━━━━━━━━━━━━━━━━━\n`;
        msg += `📊 *AI Evaluation:*\n`;
        msg += `  Alignment: *${p.alignment_score}/10*\n`;
        msg += `  Risk: *${p.risk_level}*\n`;
        msg += `  ROI: *${p.roi_assessment}*\n`;
        msg += `  Recommendation: *${p.recommendation.toUpperCase()}*\n\n`;
        msg += `*Reasoning:*\n${p.reasoning}`;
      } else {
        msg += "_Not yet evaluated._";
      }

      await ctx.reply(msg, { parse_mode: "Markdown" });
    } catch {
      await ctx.reply("Proposal not found.");
    }
  });

  // ─── /budget ─────────────────────────────────────────────────────────────

  bot.command("budget", async (ctx) => {
    const args = ctx.message?.text?.split(" ").slice(1) || [];
    const orgId = parseInt(args[0]);

    if (isNaN(orgId)) {
      await ctx.reply("Usage: /budget `<org_id>`", { parse_mode: "Markdown" });
      return;
    }

    try {
      const org = await reader.getOrg(orgId);
      const budget = await reader.getProgramBudgetStatus(orgId);

      let msg = `💰 *Budget Status — ${org.name}*\n\n`;
      const programs = Object.entries(budget);
      if (programs.length === 0) {
        msg += "No programs have received proposals yet.";
      } else {
        for (const [name, spent] of programs) {
          msg += `  • *${name}:* $${parseFloat(spent).toLocaleString()} USD approved\n`;
        }
      }
      await ctx.reply(msg, { parse_mode: "Markdown" });
    } catch {
      await ctx.reply("Couldn't fetch budget status.");
    }
  });

  // ─── /reports ────────────────────────────────────────────────────────────

  bot.command("reports", async (ctx) => {
    const args = ctx.message?.text?.split(" ").slice(1) || [];
    const proposalId = parseInt(args[0]);

    if (isNaN(proposalId)) {
      await ctx.reply("Usage: /reports `<proposal_id>`", { parse_mode: "Markdown" });
      return;
    }

    try {
      const reports = await reader.getProposalReports(proposalId);
      if (reports.length === 0) {
        await ctx.reply("No reports found for this proposal.");
        return;
      }

      let msg = `📝 *Progress Reports — Proposal #${proposalId}*\n\n`;
      for (const r of reports) {
        msg += `*Report #${r.report_number}*\n`;
        msg += `  Milestones: ${r.milestones_completed}\n`;
        msg += `  Funds spent: $${r.funds_spent_usd}\n`;
        msg += `  Deliverables: ${r.deliverables.slice(0, 100)}${r.deliverables.length > 100 ? "..." : ""}\n`;
        if (r.evaluated) {
          const emoji = ROI_EMOJI[r.roi_status] || "📊";
          msg += `  ${emoji} Progress: *${r.progress_score}/10* — ${r.roi_status.replace("_", " ")}\n`;
          msg += `  AI: ${r.ai_summary.slice(0, 150)}${r.ai_summary.length > 150 ? "..." : ""}\n`;
        } else {
          msg += `  _Awaiting evaluation_\n`;
        }
        msg += "\n";
      }
      await ctx.reply(msg, { parse_mode: "Markdown" });
    } catch {
      await ctx.reply("Couldn't fetch reports.");
    }
  });

  // ─── /stats ──────────────────────────────────────────────────────────────

  bot.command("stats", async (ctx) => {
    try {
      const orgCount = await reader.getOrgCount();
      const proposalCount = await reader.getProposalCount();
      await ctx.reply(
        `📊 *TreasuryPilot Stats*\n\n` +
        `Organizations: *${orgCount}*\n` +
        `Total proposals: *${proposalCount}*`,
        { parse_mode: "Markdown" }
      );
    } catch {
      await ctx.reply("Couldn't fetch stats.");
    }
  });

  return { bot };
}

// ─── Notification sender ─────────────────────────────────────────────────────

export function getNotificationChatIds(
  orgId: number,
  walletLinks: Map<string, number>,
  chatOrgs: Map<number, number[]>
): number[] {
  const chatIds = new Set<number>();
  for (const [chatId, orgIds] of chatOrgs) {
    if (orgIds.includes(orgId)) {
      chatIds.add(chatId);
    }
  }
  return Array.from(chatIds);
}
