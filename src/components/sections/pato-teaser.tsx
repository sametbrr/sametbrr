import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/ui/primitives";
import { href, type Locale } from "@/i18n/config";

export function PatoTeaser({ locale, source = "home-card", className = "py-10 md:py-16" }: { locale: Locale; source?: "home-card" | "arcade-card"; className?: string }) {
  const tr = locale === "tr";
  return (
    <section id="pato" aria-labelledby="pato-card-title" className={className}>
      <div className="container-site">
        <article className="grid items-center gap-8 overflow-hidden rounded-xl border border-line bg-surface-1 p-6 md:grid-cols-[minmax(0,1fr)_240px] md:gap-12 md:p-10">
          <div className="flex flex-col items-start gap-5">
            <h2 id="pato-card-title" className="text-h3 max-w-xl font-semibold tracking-tight text-balance">
              {tr ? "Pato ile odaklan. Molayı unutma." : "Focus with Pato. Make room for a break."}
            </h2>
            <p className="max-w-xl leading-relaxed text-fg-muted">
              {tr
                ? "Pomodoro, çalışmayı kısa odak sürelerine ve düzenli molalara böler. 25 dakika tek bir işe odaklan, 5 dakika ara ver. Pato bu ritmi takip ederek dikkatini tek işe vermene ve mola alışkanlığı oluşturmana yardımcı olur."
                : "Pomodoro divides work into focused intervals and regular breaks. Focus on one task for 25 minutes, then take a 5-minute break. Pato keeps that rhythm so you can give one task your attention and build a habit of taking breaks."}
            </p>
            <p className="flex flex-wrap items-center gap-3 text-sm font-medium text-fg">
              <span>{tr ? "25 dk odak" : "25 min focus"}</span>
              <ArrowIcon className="text-fg-muted" />
              <span>{tr ? "5 dk mola" : "5 min break"}</span>
            </p>
            <Link
              href={href(locale, "/pato")}
              data-umami-event="pato-open"
              data-umami-event-from={source}
              className="group inline-flex items-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
            >
              {tr ? "Pato ile başla" : "Start with Pato"}
              <ArrowIcon className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
            </Link>
          </div>
          <div aria-hidden className="mx-auto w-48 rounded-lg bg-[#eef2e8] md:w-60">
            <div className="relative aspect-[3/2] overflow-hidden">
              <Image
                src="/patates-cuvali/character.png"
                alt=""
                width={1536}
                height={1024}
                sizes="(min-width: 768px) 480px, 384px"
                className="absolute top-0 left-0 h-auto w-[200%] max-w-none"
              />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
