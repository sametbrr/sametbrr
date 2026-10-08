"use client";

import { useReducedMotion } from "@/lib/use-reduced-motion";

import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

const QUESTION = { tr: "\"Dün en çok satan 5 ürün?\"", en: "\"Top 5 products yesterday?\"" };

const lines = (locale: "tr" | "en") => [
  { prompt: true, text: "claude mcp add reports" },
  { prompt: false, text: "✓ read-only tools · tenant-scoped" },
  { prompt: true, text: QUESTION[locale] },
  { prompt: false, text: "→ reports.top_products(day=-1, limit=5)" },
  { prompt: false, text: "✓ streamed via SSE" },
];
const LINES_BY_LOCALE = { tr: lines("tr"), en: lines("en") };

/** AI service card: an MCP session typed line by line, looping while visible (S3). */
export function Terminal({ locale }: { locale: "tr" | "en" }) {
  const LINES = LINES_BY_LOCALE[locale];
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const reduce = useReducedMotion();
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const current = LINES[line];
    const done = chars >= current.text.length;
    const delay = done ? (line === LINES.length - 1 ? 2600 : 380) : current.prompt ? 40 : 12;
    const id = setTimeout(() => {
      if (!done) return setChars((c) => c + 1);
      setChars(0);
      setLine((l) => (l + 1) % LINES.length);
    }, delay);
    return () => clearTimeout(id);
  }, [inView, reduce, line, chars, LINES]);

  const shown = reduce ? LINES.length : line;

  return (
    <div ref={ref} aria-hidden className="h-[176px] overflow-hidden rounded-md border border-line bg-void/80 p-4 font-mono text-[0.75rem] leading-6">
      <div className="mb-3 flex gap-1.5">
        <span className="size-2.5 rounded-full bg-fg/10" />
        <span className="size-2.5 rounded-full bg-fg/10" />
        <span className="size-2.5 rounded-full bg-fg/10" />
      </div>
      {LINES.slice(0, shown).map((l, i) => (
        <Row key={i} prompt={l.prompt} text={l.text} />
      ))}
      {!reduce && (
        <Row prompt={LINES[line].prompt} text={LINES[line].text.slice(0, chars)} caret />
      )}
    </div>
  );
}

function Row({ prompt, text, caret }: { prompt: boolean; text: string; caret?: boolean }) {
  return (
    <p className={`truncate ${prompt ? "text-fg" : "text-ghost/80"}`}>
      {prompt && <span className="mr-2 text-ghost">❯</span>}
      {text}
      {caret && <span className="animate-caret ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-ghost" />}
    </p>
  );
}
