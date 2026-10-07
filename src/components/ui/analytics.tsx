"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * Fallback click tracking for links that have no named event of their own.
 * Elements with `data-umami-event` are skipped — Umami's own tracker already sends those.
 *
 * - download        files                     { file }
 * - outbound-link   any other site            { host, url }
 *
 * Page and section changes need nothing here: Umami already records them as page views.
 */
export function AnalyticsClicks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!a || a.closest("[data-umami-event]")) return;
      const url = new URL(a.href, location.href);
      if (a.hasAttribute("download") || /\.(pdf|zip)$/i.test(url.pathname)) {
        track("download", { file: url.pathname.split("/").pop() ?? url.pathname });
      } else if (url.host !== location.host) {
        track("outbound-link", { host: url.host.replace(/^www\./, ""), url: `${url.host}${url.pathname}` });
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
