import "server-only";
import { href } from "@/i18n/config";
import {
  getCaseStudies,
  getExperience,
  getOssProjects,
  getProfile,
  getServices,
  getSkills,
  yearsOfExperience,
} from "@/lib/content/load";
import { hasDetail, type CaseStudy } from "@/lib/content/schema";
import { cvPdfPath } from "@/lib/cv";

/**
 * llms.txt (https://llmstxt.org) built from content/, in English: an H1, a blockquote summary,
 * then link lists. `full` inlines the case studies, experience and skills for llms-full.txt.
 * Only public data — `pdf-only` profile fields never reach these files.
 */
export function buildLlmsTxt({ full }: { full: boolean }) {
  const profile = getProfile();
  const base = profile.url;
  const url = (path: string, lang: "tr" | "en" = "en") => `${base}${href(lang, path) === "/" ? "" : href(lang, path)}`;
  const years = yearsOfExperience(profile.careerStart);
  const studies = getCaseStudies();
  const detailed = studies.filter(hasDetail);
  const out: string[] = [];

  out.push(
    `# ${profile.name}`,
    "",
    `> ${profile.positioning.role.en} based in ${profile.location.en}, ${years}+ years building production software. ${profile.positioning.subhead.en}`,
    "",
    profile.positioning.manifesto.en,
    "",
    `The site is bilingual: Turkish at ${base}/ (default) and English at ${url("/")}. Contact: ${profile.email}.${
      profile.availability.open ? ` ${profile.availability.label.en}.` : ""
    }`,
    "",
    "## Pages",
    "",
    `- [Home (EN)](${url("/")}): positioning, services, selected work, open source`,
    `- [Home (TR)](${url("/", "tr")}): the same in Turkish`,
    `- [CV (EN)](${url("/cv")}): experience, skills and projects`,
    `- [CV (TR)](${url("/cv", "tr")}): the same in Turkish`,
    `- [CV PDF (EN)](${base}${cvPdfPath(profile.handle, "en")}) · [CV PDF (TR)](${base}${cvPdfPath(profile.handle, "tr")})`,
    "",
    "## Case studies",
    "",
    ...detailed.map((c) => `- [${c.title}](${url(`/work/${c.slug}`)}): ${c.tagline?.en ?? c.solution.en}`),
    "",
    "## Services",
    "",
    ...getServices().map((s) => `- ${s.title.en}: ${s.summary.en}`),
    "",
    "## Open source",
    "",
    ...getOssProjects().map((p) => `- [${p.name}](${p.url}): ${p.summary.en}`),
    "",
    "## Profiles",
    "",
    ...profile.socials.map((s) => `- [${s.label}](${s.url})`),
  );

  if (!full) {
    out.push("", "## Optional", "", `- [Full text](${base}/llms-full.txt): case studies, experience and skills in one file`);
    return out.join("\n") + "\n";
  }

  out.push("", "## Experience", "");
  for (const e of getExperience()) {
    out.push(`### ${e.role.en} — ${e.company} (${e.start} – ${e.end ?? "present"}, ${e.location.en})`, "");
    out.push(...e.bullets.map((b) => `- ${b.text.en}`), "");
  }

  out.push("## Skills", "", ...getSkills().map((g) => `- ${g.name.en}: ${g.items.join(", ")}`), "");

  out.push("## Projects in detail", "");
  for (const c of studies) out.push(...caseStudy(c, hasDetail(c) ? url(`/work/${c.slug}`) : c.url), "");

  return out.join("\n").trimEnd() + "\n";
}

function caseStudy(c: CaseStudy, link?: string) {
  const lines = [`### ${c.title}${c.period ? ` (${c.period.en})` : ""}`, ""];
  if (link) lines.push(`URL: ${link}`, "");
  if (c.tagline) lines.push(c.tagline.en, "");
  lines.push(...c.overview.map((p) => p.en + "\n"));
  if (c.problem) lines.push(`Problem: ${c.problem.en}`, "");
  if (c.solution) lines.push(`Solution: ${c.solution.en}`, "");
  if (c.highlights.length) lines.push(...c.highlights.map((h) => `- ${h.en}`), "");
  if (c.parts.length) lines.push(`Parts: ${c.parts.map((p) => p.name).join(", ")}`);
  if (c.stack.length) lines.push(`Stack: ${c.stack.join(", ")}`);
  if (c.features.length) lines.push(`Traits: ${c.features.join(", ")}`);
  return lines;
}
