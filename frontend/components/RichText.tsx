"use client";

import React, { useMemo } from "react";

type Block =
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

const URL_RE =
  /\bhttps?:\/\/[^\s<>"')]+|\b(?:www\.)?[a-z][a-z0-9\-]*(?:\.[a-z][a-z0-9\-]*)+\.[a-z]{2,}(?:[/:][^\s<>"')]*)?|\b[a-z][a-z0-9\-]+\.[a-z]{2,}\/[^\s<>"')]+/gi;

/**
 * Decide whether `head` looks like a heading even though it may contain
 * lowercase characters (e.g. parentheticals). Requires ≥50% of letters to be
 * uppercase, capped length, and starts with ≥2 consecutive uppercase letters.
 */
function isLenientCapsHead(head: string): boolean {
  if (head.length < 3 || head.length > 100) return false;
  const letters = head.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 3) return false;
  const upper = head.replace(/[^A-Z]/g, "").length;
  return upper / letters.length >= 0.5;
}

function trimTrailingPunct(s: string): { url: string; trail: string } {
  let trail = "";
  while (/[),.;:!?]$/.test(s)) {
    trail = s.slice(-1) + trail;
    s = s.slice(0, -1);
  }
  return { url: s, trail };
}

/**
 * Render a string with embedded URLs as a mix of text and clickable <a> tags.
 */
function linkify(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  const re = new RegExp(URL_RE.source, URL_RE.flags);
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const { url, trail } = trimTrailingPunct(m[0]);
    if (url) {
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      out.push(
        <a
          key={key++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent/80 underline underline-offset-2 break-all"
        >
          {url}
        </a>
      );
    }
    if (trail) out.push(trail);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length > 0 ? out : [text];
}

/**
 * Parse free-form proposal/constitution text into structured blocks.
 *
 * Heuristics:
 *  - ALL CAPS lines (with optional ":") become headings
 *  - "INLINE HEADING: body" → subheading + paragraph
 *  - Lines starting with -, •, ·, *, or 1./2. → list items
 *  - Blank lines separate blocks
 */
export function parseRichText(raw: string): Block[] {
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

  for (const r of lines) {
    const line = r.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const bulletMatch = line.match(/^(?:[-•·*]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      listBuf.push(bulletMatch[1].trim());
      continue;
    }
    flushList();

    if (/^[A-Z0-9 &/()\-]+:?$/.test(line) && line.length > 2) {
      flushParagraph();
      blocks.push({ kind: "heading", text: line.replace(/:$/, "") });
      continue;
    }

    // Strict inline heading: "ALL_CAPS_PHRASE: body" on the same line.
    const inlineMatch = line.match(/^([A-Z][A-Z0-9 &/()\-]{2,}):\s+(.+)$/);
    if (inlineMatch) {
      flushParagraph();
      blocks.push({ kind: "subheading", text: inlineMatch[1] });
      buf.push(inlineMatch[2]);
      continue;
    }

    // Lenient inline heading: line that starts with ≥2 consecutive uppercase
    // letters, may contain mixed-case parentheticals, ends with ":" then body.
    // Catches things like
    //   "INTER-ANNOTATOR AGREEMENT (Cohen's kappa) on 5% sample: …"
    const lenientInline = line.match(
      /^([A-Z]{2,}[A-Za-z0-9 \-()'/&%]*):\s+(.+)$/
    );
    if (lenientInline && isLenientCapsHead(lenientInline[1])) {
      flushParagraph();
      blocks.push({ kind: "subheading", text: lenientInline[1] });
      buf.push(lenientInline[2]);
      continue;
    }

    // "Soft" heading on its own line — same rule but without body.
    const lenientHeading = line.match(/^([A-Z]{2,}[A-Za-z0-9 \-()'/&%]*):$/);
    if (lenientHeading && isLenientCapsHead(lenientHeading[1])) {
      flushParagraph();
      blocks.push({ kind: "subheading", text: lenientHeading[1] });
      continue;
    }

    buf.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

/**
 * Normalizes AI-generated reasoning where SECTION: headers and `-` bullets
 * arrive inline on a single line. Inserts paragraph breaks before each
 * ALL-CAPS heading and puts each bullet on its own line so RichText can
 * parse it into structured blocks.
 */
export function normalizeReasoning(raw: string): string {
  // Collapse any pre-existing whitespace (including stray newlines mid-heading
  // like "RED\nFLAGS:") so the section/bullet detection below works on a
  // single normalized line.
  let s = raw.trim().replace(/\s+/g, " ");
  // Put each SECTION: header on its own line and push the content to the
  // following line. The standalone CAPS line then renders as the h3 heading
  // style (matching the constitution), instead of an inline subheading.
  s = s.replace(/\s*([A-Z][A-Z &/()\-]{2,}):\s+/g, "\n\n$1:\n");
  s = s.replace(/\s+-\s+(?=\S)/g, "\n- ");
  return s.trim();
}

/**
 * Pulls the trailing `CONFIDENCE: <value>` out of the reasoning so it can be
 * rendered as a styled pill instead of a lowercase paragraph. Returns the
 * text without the confidence section and the parsed value.
 */
export function splitConfidence(raw: string): {
  body: string;
  confidence: "high" | "medium" | "low" | null;
} {
  const match = raw.match(/\bCONFIDENCE\s*:\s*(high|medium|low)\b/i);
  if (!match) return { body: raw, confidence: null };
  const value = match[1].toLowerCase() as "high" | "medium" | "low";
  const body = raw
    .replace(/\s*\bCONFIDENCE\s*:\s*(high|medium|low)\b\s*$/i, "")
    .trim();
  return { body, confidence: value };
}

interface RichTextProps {
  text: string;
  /** Tighter spacing variant — for inline use inside cards. Default: false */
  compact?: boolean;
}

/**
 * Renders parsed proposal/constitution text with proper structure: headings,
 * subheadings, lists, paragraphs.
 */
export function RichText({ text, compact = false }: RichTextProps) {
  const blocks = useMemo(() => parseRichText(text), [text]);

  if (blocks.length === 0) {
    return null;
  }

  // Single-paragraph fallback: render as plain prose so we don't add visual
  // weight when there's nothing to structure.
  if (blocks.length === 1 && blocks[0].kind === "paragraph") {
    return (
      <p className="text-sm text-text-dim leading-relaxed">
        {linkify(blocks[0].text)}
      </p>
    );
  }

  const wrapClass = compact ? "space-y-3" : "space-y-5";
  const headingClass = compact
    ? "text-[10px] font-mono tracking-[0.25em] text-accent mt-3 first:mt-0 whitespace-nowrap"
    : "text-[11px] font-mono tracking-[0.25em] text-accent mt-6 pt-3 first:mt-0 first:pt-0 border-t border-border-soft first:border-t-0 whitespace-nowrap";

  return (
    <div className={`${wrapClass} text-text-dim leading-relaxed`}>
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          return (
            <h3 key={i} className={headingClass}>
              {block.text}
            </h3>
          );
        }
        if (block.kind === "subheading") {
          return (
            <h4
              key={i}
              className="text-sm font-medium tracking-wider text-text mt-4 mb-0 first:mt-0 whitespace-nowrap"
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
                  <span className="leading-relaxed">{linkify(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm text-text-dim leading-relaxed">
            {linkify(block.text)}
          </p>
        );
      })}
    </div>
  );
}
