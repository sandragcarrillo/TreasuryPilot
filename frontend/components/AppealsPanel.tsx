"use client";

import { useState } from "react";
import { Gavel } from "lucide-react";
import { useSetAppeals } from "@/lib/hooks/useTreasuryPilot";

interface AppealsPanelProps {
  orgId: number;
  org: {
    appeals_enabled: boolean;
    appeal_window_hours: number;
  };
}

export function AppealsPanel({ orgId, org }: AppealsPanelProps) {
  const [enabled, setEnabled] = useState(!!org.appeals_enabled);
  const [hours, setHours] = useState(String(org.appeal_window_hours || 168));
  const { mutateAsync, isPending } = useSetAppeals();

  const parsed = parseInt(hours, 10);
  const validHours = Number.isFinite(parsed) && parsed >= 1 && parsed <= 8760;
  const dirty =
    enabled !== !!org.appeals_enabled ||
    (validHours && parsed !== Number(org.appeal_window_hours));

  const handleSave = async () => {
    if (!validHours) return;
    try {
      await mutateAsync({ orgId, enabled, windowHours: parsed });
    } catch {}
  };

  const days = validHours ? Math.round((parsed / 24) * 10) / 10 : null;

  return (
    <div className="gov-card p-8 space-y-6">
      <div className="flex items-center gap-2.5 border-b border-border-soft pb-4">
        <Gavel className="w-4 h-4 text-accent" />
        <h3 className="text-[11px] font-mono tracking-[0.25em] text-text-dim">
          Appeals
        </h3>
      </div>

      <div className="space-y-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-accent"
          />
          <span className="text-sm text-text font-body">
            Allow submitters to appeal rejected proposals
            <span className="block mt-1 text-[11px] text-text-faint leading-relaxed font-normal">
              When enabled, submitters of rejected proposals can revise their
              proposal and file an appeal for human review. The AI does not
              re-evaluate — you (or an admin) review the appeal directly via
              the Human Decision panel.
            </span>
          </span>
        </label>

        {enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pl-7">
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-[0.2em] text-text-faint block">
                Appeal Window (hours)
              </label>
              <input
                className="gov-input w-full px-3 py-2.5 text-sm font-mono"
                placeholder="168"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                inputMode="numeric"
              />
              <p className="text-[11px] text-text-faint leading-relaxed">
                Allowed range: 1 – 8760 hours (1 year). Default 168 (7 days).
                {days !== null && (
                  <>
                    {" "}
                    <span className="text-text-dim">≈ {days} days</span>.
                  </>
                )}
                {" "}Window is advisory — late appeals are still accepted.
              </p>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={isPending || !dirty || !validHours}
            className="px-5 py-2.5 rounded-xl text-[11px] font-mono tracking-[0.2em] bg-accent text-bg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
