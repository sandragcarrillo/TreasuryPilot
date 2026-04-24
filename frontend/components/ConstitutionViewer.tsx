"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Scroll } from "lucide-react";

interface ConstitutionViewerProps {
  constitution: string;
  daoName?: string;
}

type Block =
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

/**
 * Parse the raw constitution text into structured blocks.
 *
 * Heuristics:
 *  - Lines that are ALL CAPS (with optional ending ":") become headings
 *    (e.g. "MISSION:", "GRANT PROGRAMS", "ALLOCATION RULES:")
 *  - "MISSION: Body text here" becomes subheading + paragraph
 *  - Lines starting with "-" or "•" or "1." / "2." etc become list items
 *  - Blank lines separate blocks
 */
function parseConstitution(raw: string): Block[] {
  const blocks: Block[] = [];
  const lines = raw.split("\n").map((l) => l.trimEnd());

  let buf: string[] = [];
  let listBuf: string[] = [];

  const flushParagraph = () => {
    if (buf.length === 0) return;
    const text = buf.join(" ").trim();
    if (text) blocks.push({ kind: "paragraph", text });
    buf = [];
  };

  const flushList = () => {
    if (listBuf.length === 0) return;
    blocks.push({ kind: "list", items: listBuf });
    listBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trim();

    // Blank line = block break
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    // List item (bullets or numbered)
    const bulletMatch = line.match(/^(?:[-•]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      listBuf.push(bulletMatch[1].trim());
      continue;
    } else {
      flushList();
    }

    // Heading: ALL CAPS with optional trailing colon and nothing after
    // (e.g. "ORGANIZATIONAL STRUCTURE", "ALLOCATION RULES:")
    if (/^[A-Z0-9 &/()\-]+:?$/.test(line) && line.length > 2) {
      flushParagraph();
      blocks.push({ kind: "heading", text: line.replace(/:$/, "") });
      continue;
    }

    // Inline heading with body: "MISSION: blah blah"
    const inlineMatch = line.match(/^([A-Z][A-Z0-9 &/()\-]{2,}):\s+(.+)$/);
    if (inlineMatch) {
      flushParagraph();
      blocks.push({ kind: "subheading", text: inlineMatch[1] });
      buf.push(inlineMatch[2]);
      continue;
    }

    buf.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

export function ConstitutionViewer({ constitution, daoName }: ConstitutionViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const blocks = useMemo(() => parseConstitution(constitution), [constitution]);

  return (
    <div className="gov-card">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-bg-elev-2/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Scroll className="w-4 h-4 text-accent shrink-0" />
          <span className="text-base font-medium text-text tracking-tight">
            {daoName ? `${daoName} — ` : ""}
            <span className="text-text-dim">Constitution</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-text-faint">
          <span className="text-[11px] font-mono tracking-[0.2em]">
            {expanded ? "collapse" : "read"}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border-soft">
          <article className="px-8 md:px-12 py-10 max-h-144 overflow-auto">
            <ConstitutionArticle blocks={blocks} />
          </article>
        </div>
      )}
    </div>
  );
}

function ConstitutionArticle({ blocks }: { blocks: Block[] }) {
  return (
    <div className="max-w-2xl mx-auto space-y-5 text-text-dim leading-relaxed">
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          return (
            <h3
              key={i}
              className="text-[11px] font-mono tracking-[0.25em] text-accent mt-8 pt-4 first:mt-0 first:pt-0 border-t border-border-soft first:border-t-0"
            >
              {block.text}
            </h3>
          );
        }
        if (block.kind === "subheading") {
          return (
            <h4
              key={i}
              className="text-sm font-medium tracking-wider text-text mt-5 mb-0"
            >
              {block.text}
            </h4>
          );
        }
        if (block.kind === "list") {
          const numbered = /^\d/.test(block.items[0] ?? "");
          return (
            <ul key={i} className="space-y-2 pl-0">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-3 text-sm text-text-dim">
                  <span className="font-mono text-accent/70 text-xs mt-1 shrink-0 w-5">
                    {numbered ? `${j + 1}.` : "·"}
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm text-text-dim leading-relaxed">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
