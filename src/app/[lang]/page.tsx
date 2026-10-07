import { notFound } from "next/navigation";
import { Hero } from "@/components/sections/hero";
import {
  About,
  Contact,
  ExperienceList,
  MarqueeBand,
  OpenSource,
  Process,
  Services,
  Work,
} from "@/components/sections/home-sections";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getCaseStudies,
  getEducation,
  getExperience,
  getOssProjects,
  getProfile,
  getServices,
  getSkills,
  yearsOfExperience,
} from "@/lib/content/load";
import { SiteNav } from "./site-nav";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const profile = getProfile();
  const cases = getCaseStudies();
  const oss = getOssProjects();
  const education = profile.showEducation ? getEducation() : [];
  const years = Math.max(5, yearsOfExperience(profile.careerStart));
  const stats = {
    years,
    products: profile.products.length,
    // Shown as "N+", so round down to a ten once there are at least ten (12 → 10+).
    oss: profile.publicRepos >= 10 ? Math.floor(profile.publicRepos / 10) * 10 : profile.publicRepos,
    packages: oss.filter((p) => p.registry).length,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${profile.url}/#person`,
        name: profile.name,
        url: profile.url,
        email: `mailto:${profile.email}`,
        jobTitle: profile.positioning.role[lang],
        address: { "@type": "PostalAddress", addressLocality: "İstanbul", addressCountry: "TR" },
        sameAs: profile.socials.map((s) => s.url),
        knowsAbout: getSkills().flatMap((g) => g.items),
        alumniOf: education.map((e) => ({ "@type": "EducationalOrganization", name: e.school })),
      },
      {
        "@type": "ProfessionalService",
        name: `${profile.name} — ${profile.positioning.role[lang]}`,
        url: profile.url,
        founder: { "@id": `${profile.url}/#person` },
        areaServed: "Worldwide",
        serviceType: getServices().map((s) => s.title[lang]),
      },
    ],
  };

  return (
    <>
      <SiteNav locale={lang} />
      <main id="main">
        <Hero profile={profile} dict={dict} locale={lang} stats={stats} />
        <MarqueeBand products={profile.products} skills={getSkills()} />
        <About profile={profile} dict={dict} locale={lang} stats={stats} />
        <Services services={getServices()} dict={dict} locale={lang} />
        <Work cases={cases} dict={dict} locale={lang} />
        <Process dict={dict} />
        <OpenSource projects={oss} dict={dict} locale={lang} />
        <ExperienceList items={getExperience()} education={education} dict={dict} locale={lang} />
        <Contact profile={profile} dict={dict} locale={lang} />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
