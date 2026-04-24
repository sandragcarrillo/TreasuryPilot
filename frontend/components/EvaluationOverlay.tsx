"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Analyzing proposal...",
  "Checking program budget compliance...",
  "Evaluating mission alignment...",
  "Assessing risk factors...",
  "Calculating ROI projection...",
  "Validators deliberating...",
  "Reaching consensus...",
];

interface EvaluationOverlayProps {
  visible: boolean;
}

export function EvaluationOverlay({ visible }: EvaluationOverlayProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setMsgIndex(0);
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-8 max-w-sm text-center px-6">
        {/* Pulsing orb — deliberation in progress */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full deliberation-pulse"
            style={{
              background: "radial-gradient(circle, rgba(6,182,212,0.3) 0%, rgba(6,182,212,0.05) 70%)",
              border: "1px solid rgba(6,182,212,0.4)",
            }}
          />
          <div
            className="absolute inset-3 rounded-full deliberation-pulse"
            style={{
              animationDelay: "0.5s",
              background: "radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="space-y-3">
          <div className="text-xs text-text-faint font-mono tracking-[0.2em]">
            AI Validators Reaching Consensus
          </div>
          <div
            className="text-text font-body text-sm transition-all duration-500"
            key={msgIndex}
            style={{ animation: "fadeInSlow 0.5s ease-out forwards" }}
          >
            {MESSAGES[msgIndex]}
          </div>
        </div>

        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-accent deliberation-pulse"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>

        <p className="text-xs text-text-faint font-mono">
          This may take several minutes while validators deliberate.
        </p>
      </div>
    </div>
  );
}
