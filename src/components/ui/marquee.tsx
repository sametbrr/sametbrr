/** Infinite CSS marquee (M1). Content is duplicated once; the copy is hidden from AT. */
export function Marquee({
  items,
  reverse = false,
  duration = 40,
  className = "",
}: {
  items: string[];
  reverse?: boolean;
  duration?: number;
  className?: string;
}) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className={`marquee-row flex shrink-0 items-center ${hidden ? "marquee-copy" : ""}`}>
      {items.map((item, i) => (
        <li key={i} className="flex items-center">
          <span className="px-6 md:px-10">{item}</span>
          <span aria-hidden className="text-ghost/40">✦</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`marquee-wrap group mask-fade-x flex overflow-hidden ${className}`}>
      <div
        style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
        className={`marquee-track flex w-max ${reverse ? "animate-marquee-reverse" : "animate-marquee"} group-hover:[animation-play-state:paused]`}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
