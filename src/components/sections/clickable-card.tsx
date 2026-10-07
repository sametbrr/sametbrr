"use client";

import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";

/**
 * Makes a whole card open its target on click, while the real link inside stays the keyboard
 * and screen-reader path. Clicks on inner links/buttons (the flip toggle) and text selections pass through.
 * A stretched ::after link would cover the card and swallow the logo/diagram hover flip, hence JS.
 */
export function ClickableCard({
  href,
  external,
  slug,
  className,
  children,
}: {
  href: string;
  external: boolean;
  slug: string;
  className: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function open(event: React.MouseEvent<HTMLElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest("a, button")) return;
    if (window.getSelection()?.toString()) return;
    track(external ? "project-site" : "project-open", { project: slug, from: "card" });
    if (external || event.metaKey || event.ctrlKey) window.open(href, "_blank", "noopener,noreferrer");
    else router.push(href);
  }

  return (
    <article onClick={open} className={`${className} cursor-pointer`}>
      {children}
    </article>
  );
}
