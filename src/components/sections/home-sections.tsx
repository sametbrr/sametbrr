import Link from "next/link";
import { RollCounter } from "@/components/motion/slot";
import { EffectText } from "@/components/motion/text-effects";
import { Reveal } from "@/components/motion/reveal";
import { WordReveal } from "@/components/motion/word-reveal";
import { ClickableCard } from "@/components/sections/clickable-card";
import { ProjectVisual } from "@/components/sections/project-visual";
import { ContactForm } from "@/components/sections/contact-form";
import { HorizontalWork } from "@/components/sections/horizontal-work";
import { ProcessLine } from "@/components/sections/process-line";
import { Terminal } from "@/components/sections/terminal";
import { TimelineRail } from "@/components/sections/timeline";
import { CoreCanvas } from "@/components/three/core-canvas";
import { CorePoster } from "@/components/three/core-poster";
import { CopyButton } from "@/components/ui/client-bits";
import { GlowCard } from "@/components/ui/glow-card";
import { Marquee } from "@/components/ui/marquee";
import { ArrowIcon, ArrowUpRight, Section, Tag } from "@/components/ui/primitives";
import { href, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import {
  hasDetail,
  startYear,
  type CaseStudy,
  type Education,
  type Experience,
  type OssProject,
  type Profile,
  type Service,
  type SkillGroup,
} from "@/lib/content/schema";

const pad = (n: number) => String(n).padStart(2, "0");

/* M1 ─ two opposite marquees: live products, then stack */
export function MarqueeBand({ products, skills }: { products: string[]; skills: SkillGroup[] }) {
  return (
    <div className="border-y border-line py-6 md:py-8">
      {/* Brand names keep their own casing (NarPOS, MinimalBlock); upper-casing breaks them in one locale or the other. */}
      <Marquee items={products} className="text-h3 font-semibold tracking-tight text-fg" duration={45} />
      <Marquee
        items={skills.flatMap((g) => g.items)}
        reverse
        duration={60}
        className="mt-4 font-mono text-sm text-fg-subtle"
      />
    </div>
  );
}

/* 01 ─ About: manifesto + counters */
export function About({
  profile,
  dict,
  locale,
  stats,
}: {
  profile: Profile;
  dict: Dictionary;
  locale: Locale;
  stats: { years: number; products: number; oss: number; packages: number };
}) {
  const items = [
    { value: `${stats.years}+`, label: dict.about.stats.years },
    { value: `${stats.products}+`, label: dict.about.stats.products },
    { value: `${stats.oss}+`, label: dict.about.stats.oss },
    { value: `${stats.packages}+`, label: dict.about.stats.packages },
  ];
  return (
    <Section id="about" index="01" label={dict.about.label}>
      <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16">
        <WordReveal text={profile.positioning.manifesto[locale]} className="text-h2 font-medium text-fg" />
        <div className="mx-auto w-full max-w-sm lg:max-w-none">
          <figure className="flex flex-col gap-3">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-[radial-gradient(60%_60%_at_50%_50%,rgb(36_87_255/0.12),transparent_70%)] bg-surface-1">
              <CoreCanvas>
                <CorePoster />
              </CoreCanvas>
            </div>
            <figcaption className="flex items-center justify-between font-mono text-xs text-fg-muted">
              <span>
                <span className="text-ghost">&gt;</span> {dict.about.coreCaption}
              </span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-quantum" /> {dict.about.request}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-ghost" /> {dict.about.response}
                </span>
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
      <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:mt-24 md:grid-cols-4">
        {items.map((s) => (
          <div key={s.label} className="flex flex-col gap-3 bg-void p-6 md:p-8">
            <dt className="order-2 text-sm text-fg-muted">{s.label}</dt>
            <dd className="order-1 text-5xl font-semibold tracking-tight tabular-nums md:text-6xl">
              <RollCounter value={s.value} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 font-mono text-sm text-fg-muted">
        <span className="text-ghost">{"// "}</span>
        {profile.positioning.philosophy[locale]}
      </p>
    </Section>
  );
}

/* 02 ─ Services bento (8+4 / 4+4+4 per DESIGN.md §4) */
const spans: Record<Service["size"], string> = {
  lg: "md:col-span-12 lg:col-span-7 lg:row-span-2",
  md: "md:col-span-6 lg:col-span-5",
  wide: "md:col-span-12",
};
const glow: Record<Service["accent"], React.CSSProperties> = {
  quantum: { "--glow-color": "rgb(36 87 255 / 0.7)", "--glow-fill": "rgb(36 87 255 / 0.10)" } as React.CSSProperties,
  ghost: {
    "--glow-color": "color-mix(in srgb, var(--color-ghost) 60%, transparent)",
    "--glow-fill": "color-mix(in srgb, var(--color-ghost) 6%, transparent)",
  } as React.CSSProperties,
  ice: {
    "--glow-color": "color-mix(in srgb, var(--color-ice) 55%, transparent)",
    "--glow-fill": "color-mix(in srgb, var(--color-ice) 5%, transparent)",
  } as React.CSSProperties,
};

export function Services({ services, dict, locale }: { services: Service[]; dict: Dictionary; locale: Locale }) {
  return (
    <Section id="services" index="02" label={dict.services.label} title={dict.services.title}>
      <div className="grid gap-4 md:grid-cols-12 md:gap-5">
        {services.map((s, i) => (
          <Reveal key={s.id} variant="scale" delay={i * 0.08} className={spans[s.size]}>
            <GlowCard
              style={glow[s.accent]}
              className={`flex h-full flex-col gap-8 rounded-xl border border-line p-6 md:p-8 ${
                s.size === "wide" ? "lg:grid lg:grid-cols-[auto_1fr_1fr] lg:items-start lg:gap-12 " : ""
              }${
                s.size === "lg"
                  ? "bg-[linear-gradient(160deg,var(--color-card-tint),var(--color-surface-1)_55%)]"
                  : "bg-surface-1"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-xs text-fg-subtle">/{pad(i + 1)}</span>
                {s.size === "lg" && <Tag tone="ghost">AI-native</Tag>}
              </div>
              <div className="flex flex-col gap-3">
                <h3 className={s.size === "lg" ? "text-h2 max-w-lg" : "text-h3"}>{s.title[locale]}</h3>
                <p className="max-w-xl text-fg-muted">{s.summary[locale]}</p>
              </div>
              {s.size === "lg" && <Terminal locale={locale} />}
              <ul
                className={`mt-auto grid gap-2 border-t border-line pt-5 text-sm text-fg-muted ${
                  s.size === "wide" ? "lg:mt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8" : ""
                }`}
              >
                {s.points.map((p) => (
                  <li key={p.en} className="flex gap-3">
                    <span aria-hidden className="text-ghost">
                      →
                    </span>
                    {p[locale]}
                  </li>
                ))}
              </ul>
            </GlowCard>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* 03 ─ Work: pinned horizontal cards for featured projects, a compact list for the rest */
export function Work({ cases, dict, locale }: { cases: CaseStudy[]; dict: Dictionary; locale: Locale }) {
  const featured = cases.filter((c) => c.tier === "featured");
  // The smaller products follow a hand-picked order (`order`), not their start year.
  const compact = cases.filter((c) => c.tier === "compact").sort((a, b) => a.order - b.order);
  return (
    <section id="work" aria-labelledby="work-title" className="scroll-mt-section pt-[var(--section-y)]">
      <div className="container-site">
        <div className="mb-12 flex flex-col gap-6 border-t border-line pt-6">
          <p className="text-label flex items-center gap-3 text-fg-muted">
            <span className="text-ghost">03</span>
            <span aria-hidden className="text-fg-subtle">
              /
            </span>
            {dict.work.label}
          </p>
          <h2 id="work-title" className="text-h2 max-w-3xl">
            <EffectText text={dict.work.title} effect="rise" />
          </h2>
        </div>
      </div>
      <HorizontalWork count={featured.length}>
        {featured.map((c, i) => (
          <CaseCard key={c.slug} study={c} index={i} dict={dict} locale={locale} />
        ))}
      </HorizontalWork>
      {compact.length > 0 && <CompactWork items={compact} dict={dict} locale={locale} />}
    </section>
  );
}

/** Where a project leads: its own write-up if it has one, else its live site, else nowhere. */
function workTarget(study: CaseStudy, locale: Locale) {
  if (hasDetail(study)) return { href: href(locale, `/work/${study.slug}`), external: false };
  if (study.url) return { href: study.url, external: true };
  return null;
}

function WorkLink({
  study,
  locale,
  className,
  children,
  from,
}: {
  study: CaseStudy;
  locale: Locale;
  className: string;
  children: React.ReactNode;
  /** Where the click happened, for analytics ("card", "list"). */
  from: string;
}) {
  const target = workTarget(study, locale);
  if (!target) return <div className={className}>{children}</div>;
  // Umami: opening a write-up is "project-open", leaving for the product's own site is "project-site".
  const event = {
    "data-umami-event": target.external ? "project-site" : "project-open",
    "data-umami-event-project": study.slug,
    "data-umami-event-from": from,
  };
  if (target.external)
    return (
      <a href={target.href} target="_blank" rel="noreferrer" className={className} {...event}>
        {children}
      </a>
    );
  return (
    <Link href={target.href} className={className} {...event}>
      {children}
    </Link>
  );
}

/** Display order for the product-surface tags on cards and rows. */
const SURFACE_ORDER: CaseStudy["parts"][number]["kind"][] = [
  "api",
  "web",
  "admin",
  "site",
  "mobile",
  "desktop",
  "kiosk",
  "skill",
  "mcp",
  "npm",
  "nuget",
];

/** The kinds of product surfaces a project ships, excluding internal services and shared packages. */
function productKinds(study: CaseStudy) {
  const kinds = new Set(study.parts.map((part) => part.kind));
  return SURFACE_ORDER.filter((k) => kinds.has(k));
}

function CaseCard({
  study,
  index,
  dict,
  locale,
}: {
  study: CaseStudy;
  index: number;
  dict: Dictionary;
  locale: Locale;
}) {
  const target = workTarget(study, locale);
  const types = productKinds(study).map((k) => dict.work.kinds[k]);
  const cardClass =
    "work-card group flex w-full shrink-0 flex-col gap-5 rounded-xl border border-line bg-surface-1 p-6 hover:border-line-strong md:w-[min(78vw,620px)] md:p-8";
  const body = (
    <>
      <div className="flex items-center justify-between font-mono text-xs text-fg-subtle">
        <div className="flex items-center gap-4">
          <span>/{pad(index + 1)}</span>
        </div>
        <span className="flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${study.status === "live" ? "bg-ghost" : "bg-ice/60"}`} />
          {dict.work.status[study.status]}
        </span>
      </div>
      <ProjectVisual study={study} locale={locale} />
      <div className="flex flex-col gap-3">
        <h3 className="text-h3 font-semibold tracking-tight">{study.title}</h3>
        {(study.pitch ?? study.tagline) && (
          <p className="text-pretty text-fg-muted">{(study.pitch ?? study.tagline)![locale]}</p>
        )}
      </div>
      {/* Pushed down onto the footer rule, so the tags sit with the numbers instead of floating mid-card. */}
      {types.length > 0 && (
        <ul aria-label={dict.work.parts} className="mt-auto flex flex-wrap gap-2">
          {types.map((type) => (
            <li key={type}>
              <Tag tone="ghost">{type}</Tag>
            </li>
          ))}
        </ul>
      )}
      <div
        className={`flex items-end justify-between gap-6 border-t border-line pt-5 ${types.length > 0 ? "-mt-1" : "mt-auto"}`}
      >
        <dl className="flex gap-8">
          <div>
            <dd className="text-2xl font-semibold tabular-nums">{startYear(study) || "—"}</dd>
            <dt className="text-xs text-fg-muted">{locale === "tr" ? "yıl" : "year"}</dt>
          </div>
          <div>
            <dd className="text-2xl font-semibold tabular-nums">{types.length}</dd>
            <dt className="text-xs text-fg-muted">{locale === "tr" ? "alt kırılım" : "product parts"}</dt>
          </div>
        </dl>
        {target && (
          <WorkLink
            study={study}
            locale={locale}
            from="card"
            className="inline-flex items-center gap-2 text-sm text-fg-muted transition-colors hover:text-ghost"
          >
            {target.external ? dict.work.visit : dict.work.readCase}
            {target.external ? (
              <ArrowUpRight />
            ) : (
              <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1" />
            )}
          </WorkLink>
        )}
      </div>
    </>
  );
  // The whole card opens the project; the "Read case" link stays the accessible path to it.
  if (!target) return <article className={cardClass}>{body}</article>;
  return (
    <ClickableCard href={target.href} external={target.external} slug={study.slug} className={cardClass}>
      {body}
    </ClickableCard>
  );
}

/** A product part: its kind (Mobile, API…) in mono, then its name. */
function PartChip({ name, kind }: { name: string; kind: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1 text-xs leading-none text-fg">
      <span className="font-mono text-[0.625rem] tracking-wide text-ghost uppercase">{kind}</span>
      {name}
    </span>
  );
}

/** One row per smaller product: year, name, one line, a few tags. */
function CompactWork({ items, dict, locale }: { items: CaseStudy[]; dict: Dictionary; locale: Locale }) {
  return (
    <div className="container-site pt-16 md:pt-24">
      <p className="text-label mb-6 text-fg-muted">{dict.work.more}</p>
      <ul className="border-t border-line">
        {items.map((c) => {
          const target = workTarget(c, locale);
          return (
            <li key={c.slug}>
              <WorkLink
                study={c}
                locale={locale}
                from="list"
                className="group grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-x-6 gap-y-1 border-b border-line py-5 md:grid-cols-[4rem_11rem_1fr_auto_1.5rem]"
              >
                <span className="font-mono text-xs text-fg-subtle tabular-nums">{startYear(c) || "—"}</span>
                <span className="text-xl font-semibold tracking-tight transition-colors duration-200 group-hover:text-ghost">
                  {c.title}
                </span>
                <span className="col-start-2 text-sm text-fg-muted md:col-start-auto">{c.tagline?.[locale]}</span>
                <span className="hidden flex-wrap justify-end gap-2 md:flex">
                  {/* One tag per kind of part (API, Web, Mobile…): what the product is made of, at a glance. */}
                  {/* Internal services and shared packages aren't product surfaces; keep the row to what users touch. */}
                  {productKinds(c).map((k) => (
                    <Tag key={k} tone="ghost">
                      {dict.work.kinds[k]}
                    </Tag>
                  ))}
                </span>
                <span className="col-start-3 row-start-1 text-fg-muted transition-colors group-hover:text-ghost md:col-start-auto md:row-start-auto">
                  {target &&
                    (target.external ? (
                      <ArrowUpRight />
                    ) : (
                      <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1" />
                    ))}
                </span>
              </WorkLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* 04 ─ Process */
export function Process({ dict }: { dict: Dictionary }) {
  return (
    <Section id="process" index="04" label={dict.process.label} title={dict.process.title} titleEffect="type">
      <ProcessLine steps={dict.process.steps} />
    </Section>
  );
}

/* 05 ─ Open source list */
export function OpenSource({ projects, dict, locale }: { projects: OssProject[]; dict: Dictionary; locale: Locale }) {
  return (
    <Section id="oss" index="05" label={dict.oss.label} title={dict.oss.title} titleEffect="flip">
      <ul className="border-t border-line">
        {projects.map((p, i) => (
          <li key={p.name}>
            <Reveal delay={Math.min(i, 6) * 0.06}>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                data-umami-event="open-source-click"
                data-umami-event-repo={p.name}
                className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 border-b border-line px-2 py-5 md:grid-cols-[4rem_16rem_1fr_6rem_auto] md:gap-6 md:px-4"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 origin-left scale-x-0 bg-surface-1 transition-transform duration-[400ms] ease-[var(--ease-out)] group-hover:scale-x-100"
                />
                <span className="font-mono text-xs text-fg-subtle transition-colors group-hover:text-ghost">
                  /{pad(i + 1)}
                </span>
                <span className="font-medium">{p.name}</span>
                <span className="col-span-3 row-start-2 text-sm text-fg-muted md:col-span-1 md:row-start-auto">
                  {p.summary[locale]}
                </span>
                <span className="hidden md:block">
                  <Tag>{dict.oss.kinds[p.kind]}</Tag>
                </span>
                <ArrowUpRight className="col-start-3 row-start-1 text-fg-subtle transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ghost md:col-start-auto md:row-start-auto" />
              </a>
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* 06 ─ Experience timeline */
const monthFmt = (ym: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(`${ym}-01T00:00:00`));

/** Logo tile sitting on the timeline rail; falls back to a monogram (E1). */
function LogoTile({
  name,
  logo,
  current,
  side = "left",
}: {
  name: string;
  logo?: Experience["logo"];
  current?: boolean;
  side?: "left" | "right";
}) {
  const initials = name
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 || w === w.toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    // Centred on the rail: ol padding (4rem / 5rem) minus rail offset (1.25rem / 1.5rem) plus half the tile.
    <span
      aria-hidden
      className={`absolute -top-1 grid size-10 place-items-center md:size-11 ${
        side === "right" ? "-right-[3.5rem] md:-right-[4.875rem]" : "-left-[3.5rem] md:-left-[4.875rem]"
      }`}
    >
      {current && <span className="absolute inset-0 animate-ping-slow rounded-xl bg-ghost/25" />}
      <span
        className={`relative grid size-full place-items-center overflow-hidden rounded-xl border bg-surface-1 ${
          current ? "border-ghost/60" : "border-line-strong"
        }`}
      >
        {logo?.mode === "mono" ? (
          <span
            className="size-6 bg-fg"
            style={{
              mask: `url(${logo.src}) center / contain no-repeat`,
              WebkitMask: `url(${logo.src}) center / contain no-repeat`,
            }}
          />
        ) : logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- tiny static logo, no optimisation needed
          <img src={logo.src} alt="" className="size-7 object-contain" />
        ) : (
          <span className="font-mono text-[0.7rem] font-semibold text-fg-muted">{initials}</span>
        )}
      </span>
    </span>
  );
}

export function ExperienceList({
  items,
  education,
  dict,
  locale,
}: {
  items: Experience[];
  education: Education[];
  dict: Dictionary;
  locale: Locale;
}) {
  const range = (start?: string, end?: string | null) =>
    start ? `${monthFmt(start, locale)} — ${end ? monthFmt(end, locale) : dict.experience.present}` : null;

  return (
    <Section id="experience" index="06" label={dict.experience.label} title={dict.experience.title} titleEffect="focus">
      {/* Newest on top, filling bottom → top from where the career began. */}
      <TimelineRail fill="up">
        {items.map((e, i) => (
          <li key={`${e.company}-${e.start}`} className="relative">
            <LogoTile name={e.company} logo={e.logo} current={e.end === null} />
            <Reveal delay={i * 0.06} className="grid gap-4 md:grid-cols-[1fr_12rem] md:gap-10">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="font-mono text-xs text-fg-muted md:hidden">{range(e.start, e.end)}</p>
                  <h3 className="text-h3">{e.role[locale]}</h3>
                  <p className="text-sm text-fg-muted">
                    {e.company} · {e.location[locale]}
                  </p>
                </div>
                <ul className="grid gap-2 text-fg-muted">
                  {e.bullets.map((b) => (
                    <li key={b.text.en} className="flex gap-3 text-[0.9375rem]">
                      <span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-fg-subtle" />
                      {b.text[locale]}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  {e.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              </div>
              <p className="hidden pt-2 text-right font-mono text-xs text-fg-muted md:block">{range(e.start, e.end)}</p>
            </Reveal>
          </li>
        ))}
      </TimelineRail>

      {education.length > 0 && (
        <>
          <div className="mt-24 mb-12 flex flex-col gap-6 border-t border-line pt-6">
            <p className="text-label flex items-center gap-3 text-fg-muted">
              <span className="text-ghost">06.1</span>
              <span aria-hidden className="text-fg-subtle">
                /
              </span>
              {dict.experience.education}
            </p>
            <h3 className="text-h2">
              <EffectText text={dict.experience.educationTitle} effect="blur" />
            </h3>
          </div>
          {/* Newest stays on top, but the rail fills bottom → top: the journey grows from the oldest entry. */}
          <TimelineRail side="right" fill="up">
            {education.map((ed, i) => (
              <li key={ed.school} className="relative">
                <LogoTile name={ed.school} logo={ed.logo} current={ed.ongoing} side="right" />
                <Reveal delay={i * 0.06} className="grid gap-2 md:grid-cols-[1fr_12rem] md:gap-10">
                  <div>
                    <h4 className="text-h3">{ed.school}</h4>
                    <p className="text-sm text-fg-muted">{ed.degree[locale]}</p>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-fg-muted md:flex-col md:items-end md:pt-2">
                    {range(ed.start, ed.end)}
                    {ed.ongoing && <Tag tone="ghost">{dict.experience.ongoing}</Tag>}
                  </div>
                </Reveal>
              </li>
            ))}
          </TimelineRail>
        </>
      )}
    </Section>
  );
}

/* 07 ─ Contact */
export function Contact({ profile, dict, locale }: { profile: Profile; dict: Dictionary; locale: Locale }) {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="section-y relative scroll-mt-section overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-[70%] bg-[radial-gradient(50%_60%_at_50%_100%,color-mix(in_srgb,var(--color-ghost)_9%,transparent),transparent_70%)]"
      />
      <div className="container-site">
        <div className="mb-14 border-t border-line pt-6">
          <p className="text-label flex items-center gap-3 text-fg-muted">
            <span className="text-ghost">07</span>
            <span aria-hidden className="text-fg-subtle">
              /
            </span>
            {dict.contact.label}
          </p>
        </div>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div className="flex flex-col gap-8">
            <h2 id="contact-title" className="text-display">
              <EffectText text={dict.contact.title} effect="pop" />
            </h2>
            <p className="max-w-md text-lg text-fg-muted">{dict.contact.text}</p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`mailto:${profile.email}`}
                className="text-xl font-medium underline decoration-line-strong underline-offset-8 transition-colors hover:decoration-ghost"
              >
                {profile.email}
              </a>
              <CopyButton value={profile.email} label={dict.contact.copy} done={dict.contact.copied} />
            </div>
            {profile.calLink && (
              <a
                href={`https://cal.com/${profile.calLink}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-3 rounded-full border border-line-strong px-5 py-3 text-sm transition-colors hover:border-ghost/50"
              >
                {dict.contact.schedule}
                <ArrowUpRight />
              </a>
            )}
            <ul className="mt-auto flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-6 text-sm">
              {profile.socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    data-umami-event="social-click"
                    data-umami-event-network={s.label}
                    className="group inline-flex items-center gap-1.5 text-fg-muted transition-colors hover:text-fg"
                  >
                    {s.label}
                    <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <ContactForm dict={dict.contact.form} locale={locale} />
        </div>
      </div>
    </section>
  );
}
