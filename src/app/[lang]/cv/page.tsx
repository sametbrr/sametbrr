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
} from "@/lib/content/load";

/** The same reference-layout document is shown here and exported by pnpm cv:pdf. */
export async function generateMetadata({ params }: PageProps<"/[lang]/cv">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return {
    title: getDictionary(lang).cv.title,
    alternates: { canonical: href(lang, "/cv"), languages: { tr: href("tr", "/cv"), en: href("en", "/cv") } },
  };
}

const months = {
  tr: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
const monthFmt = (ym: string, lang: Locale) => {
  const [year, month] = ym.split("-");
  return `${months[lang][Number(month) - 1]} ${year}`;
};
const host = (url: string) => {
  const u = new URL(url);
  return (u.host.replace(/^www\./, "") + u.pathname).replace(/\/$/, "");
};
const clean = (text: string) => text.replace(/[–—‑]/g, "-");
const tagEnglish: Record<string, string> = {
  "Ekip Liderliği": "Team leadership",
  "Proje Yönetimi": "Project management",
  "Teknik Roadmap": "Technical roadmap",
  "Paydaş İletişimi": "Stakeholder communication",
};
const projectSlugs = ["egecocuk", "tezgahtar", "narpos", "ai-tooling"];
const skillOrder = ["Frontend", "Backend", "Databases", "DevOps & Tooling", "AI & LLM Tooling"];

export default async function CvPage({ params }: PageProps<"/[lang]/cv">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const tr = lang === "tr";
  const dict = getDictionary(lang);
  const profile = getProfile();
  const experience = getExperience();
  const companies = [...new Set(experience.map((e) => e.company))];
  const cases = getCaseStudies();
  const selected = projectSlugs.flatMap((slug) => cases.filter((c) => c.slug === slug));
  const packages = getOssProjects().filter((p) => p.registry);
  const skills = [...getSkills()].sort((a, b) => skillOrder.indexOf(a.name.en) - skillOrder.indexOf(b.name.en));
  const translateTag = (tag: string) => lang === "en" ? tagEnglish[tag] ?? tag : tag;
  const tags = [...new Set(experience.flatMap((e) => e.tags))].slice(0, 12).map(translateTag);
  const range = (start: string, end?: string | null) =>
    `${monthFmt(start, lang)} - ${end ? monthFmt(end, lang) : dict.experience.present}`;
  const contacts = [
    { label: profile.location[lang], href: undefined },
    { label: host(profile.url), href: profile.url },
    ...profile.socials.filter((s) => s.label === "LinkedIn" || s.label === "GitHub")
      .map((s) => ({ label: host(s.url), href: s.url })),
  ];
  const other: Locale = tr ? "en" : "tr";

  return (
    <main className="cv-root min-h-svh bg-surface-3 py-10 print:bg-transparent print:py-0">
      <div className="cv-toolbar mx-auto mb-6 flex w-[210mm] max-w-full items-center justify-between gap-4 px-4 font-mono text-xs print:hidden">
        <Link href={href(lang)} className="text-fg-muted transition-colors hover:text-fg">← {dict.cv.back}</Link>
        <div className="flex items-center gap-3">
          <Link href={href(other, "/cv")} hrefLang={other} className="text-fg-muted transition-colors hover:text-fg">{dict.nav.switchTo}</Link>
          <a href={cvPdfPath(profile.handle, lang)} download data-umami-event="cv-download"
            data-umami-event-lang={lang} data-umami-event-from="cv-page"
            className="rounded-full bg-primary px-4 py-2 font-sans text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover">
            {dict.cv.download}
          </a>
        </div>
      </div>
      <div className="cv-viewport">
        <article className="cv-sheet" lang={lang}>
          <header className="cv-header">
            <div className="cv-portrait">
              {/* eslint-disable-next-line @next/next/no-img-element -- native image for print export */}
              <img src="/images/samet-portrait.webp" alt={profile.name} />
            </div>
            <div><h1>{profile.name}</h1><p>{clean(profile.positioning.role[lang])}</p></div>
          </header>
          <div className="cv-columns">
            <aside className="cv-sidebar" aria-label={tr ? "İletişim, beceriler ve eğitim" : "Contact, skills and education"}>
              <CvSection title={tr ? "İletişim" : "Contact"}>
                <ul className="cv-contacts">
                  <li><a href={`mailto:${profile.email}`}>{profile.email}</a></li>
                  {/* PDF-only data is inserted by the exporter, never sent in the web page HTML. */}
                  <li data-cv-phone hidden />
                  {profile.private.phone.visibility === "public" && (
                    <li><a href={`tel:${profile.private.phone.value.replace(/\s/g, "")}`}>{profile.private.phone.value}</a></li>
                  )}
                  {contacts.map((c) => <li key={c.label}>{c.href ? <a href={c.href}>{c.label}</a> : c.label}</li>)}
                </ul>
              </CvSection>
              <CvSection title={tr ? "Teknik beceriler" : "Technical skills"}>
                <div className="cv-skills">
                  {skills.map((group) => <div key={group.name.en}>
                    <h3>{group.name[lang]}</h3>
                    <Chips items={group.items.map(translateTag)} />
                  </div>)}
                </div>
              </CvSection>
              <CvSection title={dict.cv.education}>
                <ul className="cv-education">
                  {getEducation().map((ed) => <li key={ed.school}>
                    <h3>{ed.degree[lang]}</h3>
                    <p className="cv-accent">{ed.school}</p>
                    {ed.start && <p className="cv-date">{range(ed.start, ed.end)}</p>}
                  </li>)}
                </ul>
              </CvSection>
              <CvSection title={tr ? "Açık kaynak paketler" : "Open-source packages"}>
                <ul className="cv-packages">
                  {packages.map((p) => <li key={p.name}>
                    <h3><a href={p.url}>{p.name}</a></h3>
                    <p>{p.registry?.type === "nuget" ? "NuGet" : p.registry?.type}</p>
                  </li>)}
                </ul>
              </CvSection>
            </aside>
            <div className="cv-main">
              <CvSection title={tr ? "Profil" : "Profile"}>
                <p>{clean(profile.positioning.manifesto[lang])} {clean(profile.positioning.subhead[lang])}</p>
              </CvSection>
              <CvSection title={tr ? "İş deneyimi" : "Work experience"}>
                {companies.map((company) => {
                  const roles = experience.filter((e) => e.company === company);
                  const newest = roles[0];
                  const oldest = roles[roles.length - 1];
                  return <div key={company} className="cv-company">
                    <h3>{company}</h3>
                    <p className="cv-company-meta">{newest.location[lang]} | {range(oldest.start, newest.end)}</p>
                    <ol className="cv-experience">
                      {roles.map((e) => <li key={`${e.company}-${e.start}`}>
                        <div className="cv-row"><h4>{e.role[lang]}</h4><span className="cv-date">{range(e.start, e.end)}</span></div>
                        <ul>{e.bullets.map((b) => <li key={b.text.en}>{clean(b.text[lang])}</li>)}</ul>
                      </li>)}
                    </ol>
                  </div>;
                })}
                <Chips items={tags} />
              </CvSection>
              <CvSection title={tr ? "Öne çıkan projeler" : "Featured projects"}>
                <ul className="cv-projects">
                  {selected.map((c) => <li key={c.slug}>
                    <div className="cv-row">
                      <h3>{c.title}</h3>
                      {c.url && <a className="cv-project-link" href={c.url}>{host(c.url)}</a>}
                    </div>
                    <p className="cv-project-meta">
                      {c.role.map((r) => r === "ai" ? (tr ? "AI entegrasyonu" : "AI integration") : dict.work.roles[r]).join(" · ")}
                      {c.period && ` | ${clean(c.period[lang])}`}
                    </p>
                    <p>{clean(c.solution?.[lang] ?? c.tagline?.[lang] ?? "")}</p>
                  </li>)}
                </ul>
              </CvSection>
            </div>
          </div>
          <footer className="cv-document-footer"><a href={profile.url}>{host(profile.url)}</a></footer>
        </article>
      </div>
    </main>
  );
}

function CvSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="cv-section"><h2>{title}</h2>{children}</section>;
}
function Chips({ items }: { items: string[] }) {
  return <ul className="cv-chips">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}
