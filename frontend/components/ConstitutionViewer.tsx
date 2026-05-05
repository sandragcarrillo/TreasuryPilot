"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Scroll } from "lucide-react";

interface ConstitutionViewerProps {
  constitution: string;
  daoName?: string;
}

type Block =
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; headers: string[]; rows: string[][] };

function isTableRow(line: string): boolean {
  // A table row starts and ends with "|" and has at least 2 cells.
  if (!/^\s*\|.*\|\s*$/.test(line)) return false;
  return line.split("|").length >= 3;
}

function isSeparatorRow(line: string): boolean {
  // Markdown separator: "| --- | :---: | ---: |"
  return /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(line);
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/**
 * Render a string with markdown-style **bold** as <strong> elements. Works
 * for paragraphs and list-item bodies (constitutions are commonly pasted
 * from Markdown editors like Notion).
 */
function renderInlineBold(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*\n]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <strong key={key++} className="text-text font-medium">
        {m[1]}
      </strong>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}

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
  // Split inline middle-dot / bullet separators onto their own lines so a
  // run like "· Item 1 · Item 2 · Item 3" is parsed as a list instead of
  // one paragraph. We only split when the marker has whitespace on both
  // sides so we don't touch dots that appear inside words or numbers.
  const preprocessed = raw.replace(/\s+([·•])\s+/g, "\n$1 ");
  const lines = preprocessed.split("\n").map((l) => l.trimEnd());

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Blank line = block break
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    // Markdown table:
    //   | A | B |
    //   |---|---|
    //   | 1 | 2 |
    // Or a header-less table where 2+ consecutive rows just have `|...|`.
    if (isTableRow(line)) {
      const next = (lines[i + 1] ?? "").trim();
      const hasSeparator = isSeparatorRow(next);
      const headerlessButLooksLikeTable = !hasSeparator && isTableRow(next);
      if (hasSeparator || headerlessButLooksLikeTable) {
        flushParagraph();
        flushList();
        const headers = splitTableRow(line);
        // Skip the separator row if present.
        let cursor = hasSeparator ? i + 2 : i + 1;
        const rows: string[][] = [];
        while (cursor < lines.length) {
          const candidate = lines[cursor].trim();
          if (!candidate || !isTableRow(candidate)) break;
          rows.push(splitTableRow(candidate));
          cursor++;
        }
        blocks.push({ kind: "table", headers, rows });
        i = cursor - 1;
        continue;
      }
    }

    // Markdown ATX heading: "# Title", "## Section", "### Subsection".
    // We collapse all levels onto our two design-system tiers:
    //   `####`+ → subheading (deep nested), everything else → heading.
    // Most users mix levels casually so treating ###-and-above as heading
    // matches expectations better than strict h1/h2/h3 mapping.
    const atxMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (atxMatch) {
      flushParagraph();
      flushList();
      const level = atxMatch[1].length;
      const text = atxMatch[2].replace(/\*\*/g, "").trim();
      blocks.push({ kind: level >= 4 ? "subheading" : "heading", text });
      continue;
    }

    // Bold-wrapped line on its own: "**Section Title**" → heading
    // (or subheading if it looks like a sub-numbered "1.1" item).
    const boldHeadingMatch = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (boldHeadingMatch) {
      flushParagraph();
      flushList();
      const inner = boldHeadingMatch[1].trim();
      const isSubheading = /^\d+\.\d+/.test(inner);
      blocks.push({ kind: isSubheading ? "subheading" : "heading", text: inner });
      continue;
    }

    // Bold inline label with body: "**Focus:** lorem ipsum…"
    const boldInlineMatch = line.match(/^\*\*([^*\n]+?):\*\*\s+(.+)$/);
    if (boldInlineMatch) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "subheading", text: boldInlineMatch[1].trim() });
      buf.push(boldInlineMatch[2]);
      continue;
    }

    // List item (bullets or numbered)
    const bulletMatch = line.match(/^(?:[-•·]|\d+\.)\s+(.+)$/);
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
                  <span className="leading-relaxed">{renderInlineBold(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === "table") {
          return (
            <div key={i} className="overflow-x-auto -mx-2 md:mx-0">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border-soft">
                    {block.headers.map((h, j) => (
                      <th
                        key={j}
                        className="text-left px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-text-faint uppercase"
                      >
                        {renderInlineBold(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, ri) => (
                    <tr
                      key={ri}
                      className="border-b border-border-soft/40 last:border-b-0"
                    >
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className="px-3 py-2 align-top text-text-dim leading-relaxed"
                        >
                          {renderInlineBold(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={i} className="text-sm text-text-dim leading-relaxed">
            {renderInlineBold(block.text)}
          </p>
        );
      })}
    </div>
  );
}
