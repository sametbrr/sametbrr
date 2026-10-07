import { ProjectLogo } from "@/components/ui/project-logo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RollCounter } from "@/components/motion/slot";
import { Reveal } from "@/components/motion/reveal";
import { ArchDiagram } from "@/components/sections/arch-diagram";
import { DrawOnView } from "@/components/sections/draw-on-view";
import { ArrowIcon, ArrowUpRight, Label, Tag } from "@/components/ui/primitives";
import { hasLocale, href, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCaseStudy, getDetailedCaseStudies } from "@/lib/content/load";
import { SiteNav } from "../../site-nav";

export const dynamicParams = false;

/** "https://www.egecocuk.com.tr/" → "egecocuk.com.tr", "https://github.com/sametbrr" → "github.com/sametbrr". */
const displayUrl = (url: string) => {
  const u = new URL(url);
  return (u.host.replace(/^www\./, "") + u.pathname).replace(/\/$/, "");
};

export const generateStaticParams = () =>
  locales.flatMap((lang) => getDetailedCaseStudies().map((c) => ({ lang, slug: c.slug })));

export async function generateMetadata({ params }: PageProps<"/[lang]/work/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const study = getCaseStudy(slug);
  if (!study || !hasLocale(lang)) return {};
  return {
    title: study.title,
    description: study.tagline?.[lang],
    alternates: {
      canonical: href(lang, `/work/${slug}`),
      languages: { tr: href("tr", `/work/${slug}`), en: href("en", `/work/${slug}`) },
    },
  };
}

export default async function CaseStudyPage({ params }: PageProps<"/[lang]/work/[slug]">) {
  const { lang, slug } = await params;
  const study = getCaseStudy(slug);
  if (!study || !hasLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const all = getDetailedCaseStudies();
  const next = all[(all.indexOf(study) + 1) % all.length];

  return (
    <>
      <SiteNav locale={lang} path={`/work/${slug}`} onHome={false} />
      <main id="main" className="pt-32">
        <article>
          <header className="container-site flex flex-col gap-8 pb-16">
            <Link
              href={`${href(lang)}#work`}
              className="group inline-flex w-fit items-center gap-2 font-mono text-xs text-fg-muted hover:text-fg"
            >
              <ArrowIcon className="rotate-180 transition-transform group-hover:-translate-x-1" />
              {dict.work.back}
            </Link>
            <Label index={String(all.indexOf(study) + 1).padStart(2, "0")}>
              {[study.client, study.period?.[lang]].filter(Boolean).join(" · ")}
            </Label>
            <div className="flex flex-wrap items-center gap-6">
              <ProjectLogo slug={study.slug} name={study.title} className="h-20 w-24" />
              <h1 className="text-display">{study.title}</h1>
            </div>
            {study.tagline && (
              <Reveal>
                <p className="max-w-3xl text-xl text-pretty text-fg-muted md:text-2xl">{study.tagline[lang]}</p>
              </Reveal>
            )}
            <Reveal delay={0.1} className="flex flex-wrap items-center gap-3">
              <Tag tone="ghost">{dict.work.status[study.status]}</Tag>
              {study.role.map((r) => (
                <Tag key={r}>{dict.work.roles[r]}</Tag>
              ))}
              {study.url && (
                <a
                  href={study.url}
                  data-umami-event="project-site"
                  data-umami-event-project={study.slug}
                  data-umami-event-from="detail"
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 font-mono text-sm transition-colors hover:border-ghost/50 hover:text-ghost"
                >
                  {displayUrl(study.url)}
                  <ArrowUpRight />
                </a>
              )}
            </Reveal>
          </header>

          {study.overview.length > 0 && (
            <section
              aria-label={dict.work.overview}
              className="container-site grid items-start gap-8 pb-20 md:grid-cols-[14rem_1fr] md:gap-16"
            >
              <Label>{dict.work.overview}</Label>
              <div className="flex max-w-3xl flex-col gap-6">
                {study.overview.map((p, i) => (
                  <Reveal key={p.en} delay={i * 0.05}>
                    <p
                      className={
                        i === 0
                          ? "text-xl leading-relaxed text-pretty text-fg md:text-2xl"
                          : "text-lg leading-relaxed text-pretty text-fg-muted"
                      }
                    >
                      {p[lang]}
                    </p>
                  </Reveal>
                ))}
              </div>
            </section>
          )}

          {study.parts.length > 0 && (
            <section aria-label={dict.work.parts} className="container-site pb-20">
              <Label className="mb-6">{dict.work.parts}</Label>
              <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
                {study.parts.map((p) => (
                  <li key={p.name} className="flex flex-col gap-3 bg-void p-6">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[0.6875rem] tracking-wide text-ghost uppercase">
                        {dict.work.kinds[p.kind]}
                      </span>
                      {p.url && (
                        <a
                          href={p.url}
                          data-umami-event="project-site"
                          data-umami-event-project={study.slug}
                          data-umami-event-from="part"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-fg-muted transition-colors hover:text-ghost"
                        >
                          {displayUrl(p.url)}
                          <ArrowUpRight />
                        </a>
                      )}
                    </span>
                    <span className="text-lg font-medium">{p.name}</span>
                    {p.note && <span className="text-sm text-fg">{p.note[lang]}</span>}
                    {p.detail && <span className="text-sm leading-relaxed text-fg-muted">{p.detail[lang]}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {study.architecture && (
            <section aria-label={dict.work.architecture} className="container-site">
              <DrawOnView className="work-card group rounded-xl border border-line bg-[radial-gradient(70%_80%_at_50%_0%,rgb(215_255_224/0.06),transparent_70%)] bg-surface-1 px-4 py-10 md:px-16 md:py-14">
                <div className="mb-8 flex items-center justify-between gap-4">
                  <p className="text-label text-fg-muted">{dict.work.architecture}</p>
                  <ProjectLogo slug={study.slug} name={study.title} />
                </div>
                <ArchDiagram architecture={study.architecture} size="lg" className="mx-auto max-w-3xl" />
              </DrawOnView>
              {study.architectureNotes.length > 0 && (
                <div className="pt-12">
                  <Label className="mb-6">{dict.work.decisions}</Label>
                  <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2">
                    {study.architectureNotes.map((n, i) => (
                      <li key={n.title.en} className="flex flex-col gap-3 bg-void p-6">
                        <span className="flex items-baseline gap-3">
                          <span className="font-mono text-xs text-ghost">{String(i + 1).padStart(2, "0")}</span>
                          <span className="text-lg font-medium">{n.title[lang]}</span>
                        </span>
                        <span className="text-sm leading-relaxed text-fg-muted">{n.body[lang]}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>
          )}

          <section className="container-site grid gap-12 py-20 md:grid-cols-2 md:gap-16">
            <Reveal className="flex flex-col gap-4">
              <Label index="A">{dict.work.problem}</Label>
              <p className="text-lg leading-relaxed text-fg">{study.problem[lang]}</p>
            </Reveal>
            <Reveal delay={0.08} className="flex flex-col gap-4">
              <Label index="B">{dict.work.solution}</Label>
              <p className="text-lg leading-relaxed text-fg">{study.solution[lang]}</p>
            </Reveal>
          </section>

          {study.impact.length > 0 && (
            <section aria-label={dict.work.scope} className="container-site">
              <Label className="mb-6">{dict.work.scope}</Label>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
                {study.impact.map((m) => (
                  <div key={m.label.en} className="flex flex-col gap-2 bg-void p-6">
                    <dd className="order-1 text-4xl font-semibold tabular-nums md:text-5xl">
                      <RollCounter value={m.value} />
                    </dd>
                    <dt className="order-2 text-sm text-fg-muted">{m.label[lang]}</dt>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="container-site grid gap-12 py-20 md:grid-cols-[1.4fr_1fr] md:gap-16">
            <div>
              <Label className="mb-6">{dict.work.highlights}</Label>
              <div className="grid gap-4">
                {study.highlights.map((h, i) => (
                  <Reveal key={h.en} delay={i * 0.06}>
                    <p className="flex gap-4 border-b border-line pb-4 text-fg">
                      <span className="font-mono text-xs text-ghost pt-1.5">{String(i + 1).padStart(2, "0")}</span>
                      {h[lang]}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-10">
              {study.features.length > 0 && (
                <div>
                  <Label className="mb-6">{dict.work.features}</Label>
                  <div className="flex flex-wrap gap-2">
                    {study.features.map((f) => (
                      <Tag key={f} tone="ghost">
                        {f}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label className="mb-6">{dict.work.stack}</Label>
                <div className="flex flex-wrap gap-2">
                  {study.stack.map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </article>

        <nav aria-label={dict.work.next} className="border-t border-line">
          <Link
            href={href(lang, `/work/${next.slug}`)}
            data-umami-event="project-open"
            data-umami-event-project={next.slug}
            data-umami-event-from="next"
            className="group container-site flex items-center justify-between gap-6 py-16"
          >
            <span className="flex flex-col gap-3">
              <span className="text-label text-fg-muted">{dict.work.next}</span>
              <span className="text-h2 transition-colors group-hover:text-ghost">{next.title}</span>
            </span>
            <ArrowIcon className="size-8 text-fg-muted transition-transform duration-300 group-hover:translate-x-2 group-hover:text-ghost" />
          </Link>
        </nav>
      </main>
    </>
  );
}
