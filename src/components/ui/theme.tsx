"use client";

import { useEffect, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "@/lib/init-scripts";

export type Theme = "dark" | "light";

const readTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Current theme, kept in sync with <html data-theme>; null during SSR (for canvas scenes that can't use CSS vars). */
export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribe, readTheme, () => null);
}

/** Reads a design token from CSS so canvas colours follow the active theme. */
export const cssToken = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Sun/moon toggle. Follows the OS until the user picks a theme explicitly. */
export function ThemeToggle({ labels }: { labels: { light: string; dark: string } }) {
  const theme = useTheme();

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: light)");
    const follow = () => {
      if (!localStorage.getItem(STORAGE_KEY)) document.documentElement.dataset.theme = mq.matches ? "light" : "dark";
    };
    mq.addEventListener("change", follow);
    return () => mq.removeEventListener("change", follow);
  }, []);

  function toggle() {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(STORAGE_KEY, next);
  }

  const label = theme === "light" ? labels.dark : labels.light;

  return (
    <button
      type="button"
      onClick={toggle}
      data-sound="toggle"
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-full text-fg-muted transition-colors duration-200 hover:bg-fg/[0.07] hover:text-fg"
    >
      <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        {theme === "light" ? (
          <path d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z" strokeLinejoin="round" />
        ) : (
          <>
            <circle cx="10" cy="10" r="3.5" />
            <path
              d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M16 4l-1.4 1.4M5.4 14.6 4 16M16 16l-1.4-1.4M5.4 5.4 4 4"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </button>
  );
}
