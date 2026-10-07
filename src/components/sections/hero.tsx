import { cvPdfPath } from "@/lib/cv";
import { HeroPortrait } from "@/components/three/hero-portrait";
import { HeroHeadline } from "@/components/motion/hero-headline";
import { RollCounter, RollCycle, RollLabel } from "@/components/motion/slot";
import { MagneticLink } from "@/components/ui/magnetic-link";
import { ArrowIcon } from "@/components/ui/primitives";
import { Reveal } from "@/components/motion/reveal";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { Profile } from "@/lib/content/schema";

/** Splits the headline so the last phrase gets the animated Ghost → Ice gradient (H2). */
function splitHeadline(headline: string) {
  const i = headline.lastIndexOf("&");
  return i > 0 ? [headline.slice(0, i), headline.slice(i)] : [headline, ""];
}

export function Hero({
  profile,
  dict,
  locale,
  stats,
}: {
  profile: Profile;
  dict: Dictionary;
  locale: Locale;
  stats: { years: number; products: number; oss: number };
}) {
  const [lead, accent] = splitHeadline(profile.positioning.headline[locale]);
  const primaryHref = profile.calLink ? `https://cal.com/${profile.calLink}` : "#contact";

  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden pt-28 pb-10">
      {/* Ambient light behind the portrait */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(55%_55%_at_78%_55%,rgb(36_87_255/0.14),transparent_70%),radial-gradient(40%_35%_at_15%_85%,color-mix(in_srgb,var(--color-ghost)_6%,transparent),transparent_70%)]"
      />

      <div className="container-site grid flex-1 items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-fg">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-ghost opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-ghost" />
              </span>
              {profile.availability.label[locale]}
            </span>
          </div>

          <p className="text-label text-fg-muted">
            {profile.name} · <RollCycle items={profile.positioning.roles.map((r) => r[locale])} className="text-fg" />
          </p>

          {/* LCP element: painted on the first frame; motion only plays over visible text. */}
          <HeroHeadline
            lead={lead}
            accent={accent}
            className="text-balance text-[clamp(2.6rem,5.6vw,5.25rem)] leading-[0.95] font-semibold tracking-[-0.045em]"
          />

          <Reveal delay={0.12}>
            <p className="max-w-2xl text-lg text-pretty text-fg-muted md:text-xl">
              {profile.positioning.subhead[locale]}
            </p>
          </Reveal>

          <Reveal delay={0.2} className="flex flex-wrap items-center gap-3">
            <MagneticLink
              href={primaryHref}
              data-sound="tap"
              data-umami-event="cta-start-project"
              data-umami-event-from="hero"
              className="inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3.5 font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover"
            >
              <RollLabel text={dict.hero.ctaPrimary} />
              <ArrowIcon className="transition-transform duration-300 ease-out group-hover:translate-x-1" />
            </MagneticLink>
            <a
              href="#work"
              data-sound="tap"
              data-umami-event="cta-explore-work"
              className="inline-flex items-center gap-3 rounded-full border border-line-strong px-6 py-3.5 font-medium text-fg transition-colors duration-200 hover:border-ghost/50 hover:bg-fg/[0.04]"
            >
              <RollLabel text={dict.hero.ctaSecondary} />
            </a>
            <a
              href={cvPdfPath(profile.handle, locale)}
              download
              data-sound="tap"
              data-umami-event="cv-download"
              data-umami-event-lang={locale}
              data-umami-event-from="hero"
              className="group inline-flex items-center gap-2.5 rounded-full px-4 py-3.5 font-medium text-fg-muted transition-colors duration-200 hover:text-ghost"
            >
              <svg
                viewBox="0 0 16 16"
                className="size-4 transition-transform duration-300 group-hover:translate-y-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" />
              </svg>
              <RollLabel text={dict.hero.cv} />
            </a>
          </Reveal>
        </div>

        <div className="mx-auto w-full max-w-[420px] lg:max-w-[540px]">
          <HeroPortrait src="/images/samet-portrait.webp" alt={dict.about.portraitAlt} />
        </div>
      </div>

      <div className="container-site mt-12 flex items-end justify-between gap-6 font-mono text-xs text-fg-subtle">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-line pt-5">
          {[
            { value: `${stats.years}+`, label: dict.about.stats.years },
            { value: `${stats.products}+`, label: dict.about.stats.products },
            { value: `${stats.oss}+`, label: dict.about.stats.oss },
          ].map((s) => (
            <span key={s.label} className="flex items-baseline gap-2">
              <RollCounter
                value={s.value}
                startOn="boot"
                className="font-sans text-2xl font-semibold tracking-tight text-fg md:text-3xl"
              />
              <span className="text-fg-muted">{s.label.toLowerCase()}</span>
            </span>
          ))}
        </div>
        <span className="hidden items-center gap-3 sm:flex" aria-hidden>
          {dict.hero.scroll}
          <span className="relative h-10 w-px overflow-hidden bg-line">
            <span className="absolute inset-x-0 top-0 h-3 animate-scroll-dot bg-ghost" />
          </span>
        </span>
      </div>
    </section>
  );
}
