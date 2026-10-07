import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale, href, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { cvPdfPath } from "@/lib/cv";
import {
  getCaseStudies,
  getEducation,
  getExperience,
  getOssProjects,
  getProfile,
  getSkills,
  yearsOfExperience,
} from "@/lib/content/load";
import { startYear, type CaseStudy } from "@/lib/content/schema";

/**
 * Printable CV (A4). Everything comes from content/ — the same YAML as the site and README —
 * and `pnpm cv:pdf` turns this page into the downloadable PDF. Always uses the light palette
 * (`.cv-root` in globals.css) so the PDF reads like the site in light mode.
 */

export async function generateMetadata({ params }: PageProps<"/[lang]/cv">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return {
    title: getDictionary(lang).cv.title,
    alternates: { canonical: href(lang, "/cv"), languages: { tr: href("tr", "/cv"), en: href("en", "/cv") } },
  };
}

const monthFmt = (ym: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(`${ym}-01T00:00:00`));

const host = (url: string) => {
  const u = new URL(url);
  return (u.host.replace(/^www\./, "") + u.pathname).replace(/\/$/, "");
};

export default async function CvPage({ params }: PageProps<"/[lang]/cv">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const profile = getProfile();
  const experience = getExperience();
  const cases = getCaseStudies();
  const featured = cases.filter((c) => c.tier === "featured");
  const compact = cases.filter((c) => c.tier === "compact").sort((a, b) => a.order - b.order);
  const oss = getOssProjects();
  const packages = oss.filter((p) => p.registry);
  const tools = oss.filter((p) => !p.registry);
  const years = Math.max(5, yearsOfExperience(profile.careerStart));
  const range = (start: string, end: string | null | undefined) =>
    `${monthFmt(start, lang)} — ${end ? monthFmt(end, lang) : dict.experience.present}`;
  const contact = [
    { label: profile.email, href: `mailto:${profile.email}` },
    { label: host(profile.url), href: profile.url },
    ...profile.socials
      .filter((s) => s.label === "LinkedIn" || s.label === "GitHub")
      .map((s) => ({ label: host(s.url), href: s.url })),
    { label: profile.location[lang] },
  ];
  const other: Locale = lang === "tr" ? "en" : "tr";

  return (
    <main className="cv-root min-h-svh bg-surface-3 py-10 print:bg-transparent print:py-0">
      <div className="cv-toolbar mx-auto mb-6 flex w-[210mm] max-w-full items-center justify-between gap-4 px-4 font-mono text-xs print:hidden">
        <Link href={href(lang)} className="text-fg-muted transition-colors hover:text-fg">
          ← {dict.cv.back}
        </Link>
        <div className="flex items-center gap-3">
          <Link href={href(other, "/cv")} hrefLang={other} className="text-fg-muted transition-colors hover:text-fg">
            {dict.nav.switchTo}
          </Link>
          <a
            href={cvPdfPath(profile.handle, lang)}
            download
            data-umami-event="cv-download"
            data-umami-event-lang={lang}
            data-umami-event-from="cv-page"
            className="rounded-full bg-primary px-4 py-2 font-sans text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
          >
            {dict.cv.download}
          </a>
        </div>
      </div>

      <article className="cv-sheet mx-auto w-[210mm] max-w-full bg-void text-fg shadow-xl print:shadow-none">
        {/* Header */}
        <header className="flex items-center gap-7 border-b border-line px-[14mm] pt-[12mm] pb-[8mm]">
          <div className="relative size-[34mm] shrink-0 overflow-hidden rounded-full bg-card-tint">
            {/* eslint-disable-next-line @next/next/no-img-element -- printed as-is; next/image adds nothing to a PDF */}
            <img
              src="/images/samet-portrait.webp"
              alt={profile.name}
              className="absolute inset-0 size-full object-cover object-top"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-[2.1rem] leading-none font-semibold tracking-[-0.03em]">{profile.name}</h1>
            <p className="text-[0.95rem] font-medium text-ghost">
              {profile.positioning.roles
                .slice(0, 3)
                .map((r) => r[lang])
                .join(" · ")}
            </p>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.68rem] text-fg-muted">
              {contact.map((c) => (
                <li key={c.label}>{c.href ? <a href={c.href}>{c.label}</a> : c.label}</li>
              ))}
            </ul>
          </div>
        </header>

        <div className="grid grid-cols-[1fr_58mm] gap-[8mm] px-[14mm] pt-[7mm] pb-[12mm]">
          {/* Main column */}
          <div className="flex min-w-0 flex-col gap-[6mm]">
            <CvSection title={dict.cv.summary}>
              <p className="text-[0.82rem] leading-relaxed text-fg">
                {profile.positioning.manifesto[lang]} {profile.positioning.subhead[lang]}
              </p>
              <p className="mt-2 font-mono text-[0.68rem] text-fg-muted">
                <span className="font-semibold text-ghost">{years}+</span> {dict.cv.years} ·{" "}
                <span className="font-semibold text-ghost">{profile.products.length}+</span>{" "}
                {dict.about.stats.products.toLowerCase()}
              </p>
            </CvSection>

            <CvSection title={dict.cv.experience}>
              <ol className="flex flex-col gap-4">
                {experience.map((e) => (
                  <li key={`${e.company}-${e.start}`} className="break-inside-avoid">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-[0.92rem] font-semibold">{e.role[lang]}</h3>
                      <span className="shrink-0 font-mono text-[0.65rem] text-fg-muted">{range(e.start, e.end)}</span>
                    </div>
                    <p className="text-[0.75rem] text-fg-muted">
                      {e.company} · {e.location[lang]}
                    </p>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {e.bullets.map((b) => (
                        <li key={b.text.en} className="flex gap-2 text-[0.76rem] leading-snug text-fg">
                          <span aria-hidden className="mt-[0.45em] size-1 shrink-0 rounded-full bg-ghost" />
                          {b.text[lang]}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </CvSection>

            <CvSection title={dict.cv.projects}>
              <ul className="flex flex-col gap-3">
                {featured.map((c) => (
                  <ProjectItem key={c.slug} study={c} lang={lang} kinds={dict.work.kinds} />
                ))}
              </ul>
              {compact.length > 0 && (
                <p className="mt-3 text-[0.72rem] leading-relaxed text-fg-muted">
                  <span className="font-semibold text-fg">{dict.cv.more}: </span>
                  {compact.map((c, i) => (
                    <span key={c.slug}>
                      {c.title}
                      {c.tagline ? ` — ${c.tagline[lang].replace(/\.$/, "")}` : ""}
                      {i < compact.length - 1 ? " · " : "."}
                    </span>
                  ))}
                </p>
              )}
            </CvSection>
          </div>

          {/* Side column */}
          <aside className="flex min-w-0 flex-col gap-[6mm]">
            <CvSection title={dict.cv.skills}>
              <div className="flex flex-col gap-3">
                {getSkills().map((g) => (
                  <div key={g.name.en} className="break-inside-avoid">
                    <p className="mb-1 font-mono text-[0.62rem] tracking-wide text-ghost uppercase">{g.name[lang]}</p>
                    <p className="text-[0.74rem] leading-snug text-fg">{g.items.join(", ")}</p>
                  </div>
                ))}
              </div>
            </CvSection>

            <CvSection title={dict.cv.packages}>
              <ul className="flex flex-col gap-1.5">
                {packages.map((p) => (
                  <li key={p.name} className="text-[0.74rem] leading-snug">
                    <span className="font-medium">{p.name}</span>{" "}
                    <span className="font-mono text-[0.6rem] text-fg-muted uppercase">{p.registry?.type}</span>
                  </li>
                ))}
              </ul>
            </CvSection>

            <CvSection title={dict.cv.openSource}>
              <p className="text-[0.72rem] leading-relaxed text-fg">{tools.map((p) => p.name).join(" · ")}</p>
              <p className="mt-1 font-mono text-[0.62rem] text-fg-muted">github.com/{profile.handle}</p>
            </CvSection>

            <CvSection title={dict.cv.education}>
              <ul className="flex flex-col gap-2.5">
                {getEducation().map((ed) => (
                  <li key={ed.school} className="break-inside-avoid">
                    <p className="text-[0.76rem] leading-snug font-medium">{ed.school}</p>
                    <p className="text-[0.7rem] text-fg-muted">{ed.degree[lang]}</p>
                    {ed.start && (
                      <p className="font-mono text-[0.6rem] text-fg-subtle">
                        {monthFmt(ed.start, lang)} — {ed.end ? monthFmt(ed.end, lang) : dict.experience.present}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </CvSection>
          </aside>
        </div>
      </article>
    </main>
  );
}

function CvSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 flex items-center gap-2 font-mono text-[0.66rem] tracking-[0.14em] text-fg-muted uppercase">
        <span aria-hidden className="h-px w-4 bg-ghost" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function ProjectItem({
  study,
  lang,
  kinds,
}: {
  study: CaseStudy;
  lang: Locale;
  kinds: Record<CaseStudy["parts"][number]["kind"], string>;
}) {
  const surfaces = [...new Set(study.parts.map((p) => p.kind))].filter((k) => k !== "service" && k !== "library");
  return (
    <li className="break-inside-avoid">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[0.86rem] font-semibold">
          {study.title}
          {study.url && <span className="ml-2 font-mono text-[0.62rem] font-normal text-ghost">{host(study.url)}</span>}
        </h3>
        <span className="shrink-0 font-mono text-[0.62rem] text-fg-muted">{startYear(study) || ""}</span>
      </div>
      {study.tagline && <p className="text-[0.74rem] leading-snug text-fg">{study.tagline[lang]}</p>}
      <p className="mt-0.5 font-mono text-[0.6rem] text-fg-muted">
        {[...surfaces.map((k) => kinds[k]), ...study.stack.slice(0, 4)].join(" · ")}
      </p>
    </li>
  );
}
