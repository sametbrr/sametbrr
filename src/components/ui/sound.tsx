"use client";

import { useInView } from "motion/react";
import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { armSound, isSoundOn, playSound, playRevealSound, setSoundOn, subscribeSound, type SoundName } from "@/lib/sound";

const useSoundOn = () => useSyncExternalStore(subscribeSound, isSoundOn, () => true);

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/**
 * Global wiring: arms audio, adds quiet pointer tones and click confirmations to
 * interactive elements, and toggles sound with the M key.
 */
export function SoundEffects() {
  useEffect(() => {
    const disarm = armSound();
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-sound]");
      if (el) playSound(el.dataset.sound as SoundName);
      else if ((e.target as Element | null)?.closest("a,button") && !(e.target as Element).closest(".boot-screen,[data-umami-event='sound-toggle']")) playSound("tap");
    };
    const onHover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element | null)?.closest<HTMLElement>("a,button,[data-sound]");
      if (!el || el.closest(".boot-screen") || el.matches(":disabled,[aria-disabled=true]")) return;
      if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) playSound("hover");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "m" || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      setSoundOn(!isSoundOn());
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onHover, true);
    window.addEventListener("keydown", onKey);
    return () => {
      disarm();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onHover, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}

/**
 * Plays on the first visible heading, independently of motion preference; never replays.
 */
export function useRevealSound(ref: RefObject<Element | null>, name: SoundName, amount = 0.8) {
  const inView = useInView(ref, { once: true, amount });
  const consumed = useRef(false);
  useEffect(() => {
    if (!inView || consumed.current) return;
    consumed.current = true;
    playRevealSound(name);
  }, [inView, name]);
}

/** Speaker toggle with live EQ bars while sound is on. */
export function SoundToggle({ labels }: { labels: { on: string; off: string } }) {
  const on = useSoundOn();
  const label = on ? labels.off : labels.on;
  return (
    <button
      type="button"
      onClick={() => setSoundOn(!on)}
      data-umami-event="sound-toggle"
      data-umami-event-to={on ? "off" : "on"}
      aria-label={label}
      aria-pressed={on}
      title={`${label} (M)`}
      className="grid size-9 place-items-center rounded-full text-fg-muted transition-colors duration-200 hover:bg-fg/[0.07] hover:text-fg"
    >
      <span aria-hidden className="flex h-3.5 items-end gap-[2px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-[2px] rounded-full bg-current ${on ? "animate-eq motion-reduce:animate-none" : ""}`}
            style={{
              height: on ? ["55%", "100%", "70%", "40%"][i] : "2px",
              animationDelay: `${i * -0.23}s`,
            }}
          />
        ))}
      </span>
    </button>
  );
}
