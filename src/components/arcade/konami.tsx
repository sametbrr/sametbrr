"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { playSound } from "@/lib/sound";

const CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"];

/** Easter egg: ↑ ↑ ↓ ↓ ← → ← → B A anywhere on the site opens the platformer (runner). */
export function KonamiCode({ target }: { target: string }) {
  const router = useRouter();
  useEffect(() => {
    let at = 0;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target;
      if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (location.pathname.includes("/arcade/")) return;
      at = e.code === CODE[at] ? at + 1 : e.code === CODE[0] ? 1 : 0;
      if (at < CODE.length) return;
      at = 0;
      playSound("success");
      track("arcade-open", { from: "konami" });
      router.push(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, target]);
  return null;
}
