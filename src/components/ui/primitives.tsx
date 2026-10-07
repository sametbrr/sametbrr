import type { ReactNode } from "react";
import { EffectText, type TextEffect } from "@/components/motion/text-effects";

/** Mono uppercase label, e.g. "01 / HİZMETLER". */
export function Label({ index, children, className = "" }: { index?: string; children: ReactNode; className?: string }) {
  return (
    <p className={`text-label flex items-center gap-3 text-fg-muted ${className}`}>
      {index && <span className="text-ghost">{index}</span>}
      {index && <span aria-hidden className="text-fg-subtle">/</span>}
      <span>{children}</span>
    </p>
  );
}

/** Numbered section with the standard vertical rhythm and heading block. */
export function Section({
  id,
  index,
  label,
  title,
  children,
  className = "",
  aside,
  titleEffect = "decode",
}: {
  id: string;
  index: string;
  label: string;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
  /** Each section reveals its title differently (DESIGN.md §6 T-rows). */
  titleEffect?: TextEffect;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`section-y scroll-mt-section ${className}`}>
      <div className="container-site">
        <div className="mb-12 flex flex-col gap-6 border-t border-line pt-6 md:mb-16 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-6">
            <Label index={index}>{label}</Label>
            {title && (
              <h2 id={`${id}-title`} className="text-h2 max-w-3xl text-balance">
                {typeof title === "string" ? <EffectText text={title} effect={titleEffect} /> : title}
              </h2>
            )}
          </div>
          {aside}
        </div>
        {children}
      </div>
    </section>
  );
}

export function Tag({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "ghost" }) {
  const tones = {
    default: "border-line text-fg-muted",
    ghost: "border-forest/60 bg-forest-deep text-ghost",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[0.6875rem] leading-none ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={`size-4 ${className}`}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowUpRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={`size-4 ${className}`}>
      <path d="M5 11 11 5M6 5h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
