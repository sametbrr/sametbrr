"use client";

import { AnimatePresence, m, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SoundToggle } from "@/components/ui/sound";
import { ThemeToggle } from "@/components/ui/theme";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { RollLabel } from "@/components/motion/slot";

type NavItem = { id: string; label: string };

/**
 * Glass pill nav (G3): appears after 80px, hides while scrolling down,
 * returns on scroll up; the active-section pill slides between links.
 */
export function Nav({
  items,
  switchHref,
  switchTo,
  switchLabel,
  ctaLabel,
  name,
  sectionBase,
  themeLabels,
  soundLabels,
  menuLabels,
}: {
  items: NavItem[];
  switchHref: string;
  switchTo: string;
  switchLabel: string;
  ctaLabel: string;
  name: string;
  /** "" on the home page (pure #anchors); the home URL on sub-pages. */
  sectionBase: string;
  themeLabels: { light: string; dark: string };
  soundLabels: { on: string; off: string };
  menuLabels: { open: string; close: string };
}) {
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<{ x: number; width: number; opacity: number } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** Hamburger menu below lg, where the section tabs don't fit. */
  const [menuOpen, setMenuOpen] = useState(false);
  /** Until this time the nav stays hidden: a section jump lands right at the top, under where the pill sits. */
  const jumpUntil = useRef(0);
  const jump = () => {
    jumpUntil.current = performance.now() + 1800;
    setHidden(true);
  };

  // Slide the active pill under the current link (layout measured, transform-only animation).
  useEffect(() => {
    const li = listRef.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    setIndicator(li ? { x: li.offsetLeft, width: li.offsetWidth, opacity: 1 } : null);
  }, [active]);

  // The menu closes on Escape and when the viewport grows into the tab layout.
  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const close = () => setMenuOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    mq.addEventListener("change", close);
    window.addEventListener("keydown", onKey);
    return () => {
      mq.removeEventListener("change", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 80);
    setHidden(performance.now() < jumpUntil.current || (y > 400 && y > prev));
  });

  useEffect(() => {
    if (sectionBase) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const { id } of items) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items, sectionBase]);

  return (
    <m.header
      initial={false}
      animate={{ y: !reduce && hidden && !menuOpen ? -96 : 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3"
    >
      <nav
        aria-label="Primary"
        className={`mx-auto flex max-w-[1280px] items-center justify-between gap-4 rounded-full px-3 py-2 transition-[background-color,border-color,backdrop-filter] duration-300 md:px-4 ${
          scrolled || menuOpen ? "glass" : "border border-transparent"
        }`}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? menuLabels.close : menuLabels.open}
            data-sound="tap"
            className="relative grid size-9 place-items-center rounded-full text-fg transition-colors duration-200 hover:bg-fg/[0.07] lg:hidden"
          >
            <span aria-hidden className="relative block h-3 w-4">
              <span
                className={`absolute left-0 h-px w-4 bg-current transition-transform duration-300 ease-[var(--ease-out)] ${
                  menuOpen ? "top-1.5 rotate-45" : "top-0.5"
                }`}
              />
              <span
                className={`absolute left-0 h-px w-4 bg-current transition-transform duration-300 ease-[var(--ease-out)] ${
                  menuOpen ? "top-1.5 -rotate-45" : "top-2.5"
                }`}
              />
            </span>
          </button>
          <a
            href={`${sectionBase}#top`}
            data-sound="tap"
            className="shrink-0 rounded-full px-2 py-1 font-mono text-sm whitespace-nowrap transition-colors duration-200 hover:text-ghost"
          >
            {name}
          </a>
        </div>

        <ul ref={listRef} className="relative hidden items-center gap-1 lg:flex">
          <m.li
            aria-hidden
            initial={false}
            animate={indicator ?? { opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="absolute inset-y-0 left-0 rounded-full bg-fg/[0.07]"
          />
          {items.map((item) => (
            <li key={item.id} data-id={item.id}>
              <a
                href={`${sectionBase}#${item.id}`}
                onClick={sectionBase ? undefined : jump}
                aria-current={active === item.id ? "true" : undefined}
                data-sound="tap"
                className={`relative z-10 block rounded-full px-2 py-1.5 text-sm whitespace-nowrap xl:px-3 transition-colors duration-200 ${
                  active === item.id ? "text-fg" : "text-fg-muted hover:text-fg"
                }`}
              >
                <RollLabel text={item.label} />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1 sm:gap-2">
          <SoundToggle labels={soundLabels} />
          <ThemeToggle labels={themeLabels} />
          <Link
            href={switchHref}
            aria-label={switchLabel}
            hrefLang={switchTo.toLowerCase()}
            data-umami-event="language-switch"
            data-umami-event-to={switchTo.toLowerCase()}
            className="rounded-full px-3 py-1.5 font-mono text-xs text-fg-muted transition-colors hover:text-fg"
          >
            {switchTo}
          </Link>
          <a
            href={`${sectionBase}#contact`}
            onClick={sectionBase ? undefined : jump}
            data-sound="tap"
            data-umami-event="cta-start-project"
            data-umami-event-from="nav"
            className="hidden rounded-full bg-primary px-4 py-2 text-sm font-medium whitespace-nowrap text-on-primary transition-colors duration-200 hover:bg-primary-hover sm:block"
          >
            <RollLabel text={ctaLabel} />
          </a>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <m.div
            id="site-menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-2 max-w-[1280px] origin-top rounded-3xl border border-line-strong bg-void/95 p-2 shadow-2xl backdrop-blur-xl lg:hidden"
          >
            <ul className="grid">
              {items.map((item, i) => (
                <m.li
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.03 * i, ease: [0.16, 1, 0.3, 1] }}
                >
                  <a
                    href={`${sectionBase}#${item.id}`}
                    onClick={() => {
                      setMenuOpen(false);
                      if (!sectionBase) jump();
                    }}
                    aria-current={active === item.id ? "true" : undefined}
                    data-sound="tap"
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-lg transition-colors duration-200 hover:bg-fg/[0.06] ${
                      active === item.id ? "bg-fg/[0.07] text-fg" : "text-fg-muted hover:text-fg"
                    }`}
                  >
                    <RollLabel text={item.label} />
                    <span aria-hidden className="font-mono text-xs text-fg-subtle">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </a>
                </m.li>
              ))}
            </ul>
            <a
              href={`${sectionBase}#contact`}
              onClick={() => {
                setMenuOpen(false);
                if (!sectionBase) jump();
              }}
              data-sound="tap"
              data-umami-event="cta-start-project"
              data-umami-event-from="menu"
              className="m-2 mt-1 flex justify-center rounded-full bg-primary px-4 py-3 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover sm:hidden"
            >
              {ctaLabel}
            </a>
          </m.div>
        )}
      </AnimatePresence>
    </m.header>
  );
}
