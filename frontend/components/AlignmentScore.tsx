"use client";

import { useEffect, useState } from "react";

interface AlignmentScoreProps {
  score: number;
  evaluated: boolean;
}

export function AlignmentScore({ score, evaluated }: AlignmentScoreProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!evaluated || score === 0) return;
    let current = 0;
    const step = score / 20;
    const interval = setInterval(() => {
      current = Math.min(current + step, score);
      setDisplayed(Math.round(current));
      if (current >= score) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [score, evaluated]);

  const color =
    score >= 8 ? "#10b981" :
    score >= 5 ? "#f59e0b" :
    "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="font-mono font-black tabular-nums leading-none score-reveal"
        style={{ fontSize: "5rem", color, letterSpacing: "-0.04em" }}
      >
        {evaluated ? displayed : "—"}
      </div>
      <div className="text-xs text-slate-500 font-mono uppercase tracking-widest">
        / 10 alignment
      </div>
      {evaluated && (
        <div className="w-full h-1 bg-slate-800 mt-1" style={{ maxWidth: "120px" }}>
          <div
            className="h-full transition-all duration-1000 ease-out"
            style={{ width: `${(score / 10) * 100}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  );
}
