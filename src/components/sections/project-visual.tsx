"use client";

import { useState } from "react";
import type { CaseStudy } from "@/lib/content/schema";
import { ProjectLogo } from "@/components/ui/project-logo";
import { ArchDiagram } from "./arch-diagram";

export function ProjectVisual({ study, locale }: { study: CaseStudy; locale: "tr" | "en" }) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const back = pinned || hovered;
  return (
    <div className="rounded-lg border border-line bg-void p-4">
      <div
        className="project-flip relative h-[15rem] [perspective:1200px]"
        data-back={back}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
      >
        <div className="project-flip-inner absolute inset-0">
          <div className="project-flip-face grid place-items-center" aria-hidden={back}>
            <ProjectLogo slug={study.slug} name={study.title} className="h-60 w-[min(320px,100%)]" sizes="320px" />
          </div>
          <div className="project-flip-face project-flip-back grid items-center" aria-hidden={!back} data-drawn="true">
            {study.architecture ? <ArchDiagram architecture={study.architecture} className="max-h-[15rem]" /> : <p className="text-center font-mono text-sm text-fg-muted">{study.url ? new URL(study.url).host : study.title}</p>}
          </div>
        </div>
      </div>
      <button type="button" aria-pressed={pinned} onClick={() => { setPinned(!back); setHovered(false); }} className="mx-auto mt-3 flex items-center gap-2 rounded-full border border-line-strong px-3 py-1.5 font-mono text-xs text-fg-muted transition-colors hover:border-ghost hover:text-ghost focus-visible:outline-2 focus-visible:outline-ghost">
        <span aria-hidden>↻</span>
        {locale === "tr" ? (back ? "Logoyu göster" : "Mimariyi göster") : (back ? "Show logo" : "Show architecture")}
      </button>
    </div>
  );
}
