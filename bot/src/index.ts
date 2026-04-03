import "dotenv/config";
import { ContractReader } from "./contract.js";
import { ContractWatcher, type WatcherEvent } from "./watcher.js";
import { createBot, getNotificationChatIds } from "./bot.js";
import { walletLinks, chatOrgs } from "./store.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "30") * 1000;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required");
  process.exit(1);
}
if (!CONTRACT_ADDRESS) {
  console.error("CONTRACT_ADDRESS is required");
  process.exit(1);
}

const reader = new ContractReader(CONTRACT_ADDRESS, RPC_URL);
const { bot } = createBot(BOT_TOKEN, reader);

const STATUS_EMOJI: Record<string, string> = {
  approved: "✅",
  rejected: "❌",
  needs_modification: "⚠️",
  auto_approved: "⚡",
  vetoed: "🚫",
};

// ─── Handle watcher events → send Telegram notifications ─────────────────

async function handleEvent(event: WatcherEvent) {
  const chatIds = getNotificationChatIds(event.orgId, walletLinks, chatOrgs);
  if (chatIds.length === 0) return;

  let message = "";
  const p = event.proposal;

  switch (event.type) {
    case "new_proposal":
      message =
        `📋 *New grant proposal submitted*\n\n` +
        `*#${p!.id}: ${p!.title}*\n` +
        `Program: ${p!.target_program}\n` +
        `Amount: $${p!.requested_amount_usd} USD\n` +
        `Submitter: \`${p!.submitter}\`\n\n` +
        `Use /proposal ${p!.id} for details.`;
      break;

    case "proposal_evaluated": {
      const emoji = STATUS_EMOJI[p!.status] || "📊";
      message =
        `${emoji} *Proposal evaluated*\n\n` +
        `*#${p!.id}: ${p!.title}*\n` +
        `Recommendation: *${p!.recommendation.toUpperCase()}*\n` +
        `Alignment: *${p!.alignment_score}/10* | Risk: *${p!.risk_level}* | ROI: *${p!.roi_assessment}*\n` +
        `Status: *${p!.status}*\n\n` +
        `_${p!.reasoning?.slice(0, 200)}${(p!.reasoning?.length || 0) > 200 ? "..." : ""}_`;
      break;
    }

    case "proposal_auto_approved":
      message =
        `⚡ *Grant auto-approved*\n\n` +
        `*#${p!.id}: ${p!.title}*\n` +
        `Amount: $${p!.requested_amount_usd} USD\n` +
        `Alignment: *${p!.alignment_score}/10* | Risk: *${p!.risk_level}*\n\n` +
        `Please process payment to \`${p!.recipient}\`.\n` +
        `To veto, use the frontend within the veto window.`;
      break;

    case "proposal_vetoed":
      message =
        `🚫 *Proposal vetoed*\n\n` +
        `*#${p!.id}: ${p!.title}*\n` +
        `The auto-approved grant has been vetoed by an admin.`;
      break;

    case "new_report": {
      const r = event.report!;
      message =
        `📝 *Progress report submitted*\n\n` +
        `Proposal #${p!.id}: *${p!.title}*\n` +
        `Report #${r.report_number}\n` +
        `Milestones: ${r.milestones_completed}\n` +
        `Funds spent: $${r.funds_spent_usd}\n\n` +
        `Use /reports ${p!.id} for details.`;
      break;
    }

    case "report_evaluated": {
      const r = event.report!;
      const emoji = r.roi_status === "on_track" ? "✅" : r.roi_status === "exceeding" ? "🚀" : r.roi_status === "failed" ? "❌" : "⚠️";
      message =
        `${emoji} *Report evaluated*\n\n` +
        `Proposal #${p!.id}: *${p!.title}*\n` +
        `Report #${r.report_number}\n` +
        `Progress: *${r.progress_score}/10* — ${r.roi_status.replace("_", " ")}\n\n` +
        `_${r.ai_summary?.slice(0, 200)}${(r.ai_summary?.length || 0) > 200 ? "..." : ""}_`;
      break;
    }
  }

  if (!message) return;

  for (const chatId of chatIds) {
    try {
      await bot.api.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error(`[Bot] Failed to send to ${chatId}:`, err);
    }
  }
}

// ─── Start ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("[TreasuryPilot Bot] Starting...");
  console.log(`[TreasuryPilot Bot] Contract: ${CONTRACT_ADDRESS}`);
  console.log(`[TreasuryPilot Bot] RPC: ${RPC_URL}`);
  console.log(`[TreasuryPilot Bot] Poll interval: ${POLL_INTERVAL / 1000}s`);

  const watcher = new ContractWatcher(reader, POLL_INTERVAL, handleEvent);
  await watcher.start();

  bot.start({
    onStart: () => console.log("[TreasuryPilot Bot] Telegram bot running!"),
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("[TreasuryPilot Bot] Shutting down...");
    watcher.stop();
    bot.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(console.error);
