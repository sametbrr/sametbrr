/**
 * Generates the GitHub profile README (README.md, English) and its Turkish mirror (README.tr.md)
 * from content/*.yaml — the same files the site and the CV read. Never edit the READMEs by hand.
 *
 *   pnpm readme          # write both files
 *   pnpm readme:check    # exit 1 if they are out of date (for CI)
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { parse } from "yaml";
import { z } from "zod";
import {
  caseStudySchema,
  experienceSchema,
  ossProjectSchema,
  profileSchema,
  skillGroupSchema,
  startYear,
  type CaseStudy,
  type Locale,
} from "../src/lib/content/schema.ts";

const read = <T extends z.ZodType>(file: string, schema: T): z.infer<T> => schema.parse(parse(readFileSync(`content/${file}`, "utf8")));

const profile = read("profile.yaml", profileSchema);
const experience = read("experience.yaml", z.array(experienceSchema));
const skills = read("skills.yaml", z.array(skillGroupSchema));
const oss = read("projects.yaml", z.array(ossProjectSchema));
const cases = readdirSync("content/case-studies")
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => read(`case-studies/${f}`, caseStudySchema))
  .sort((a, b) => Number(b.pinned) - Number(a.pinned) || startYear(b) - startYear(a) || a.order - b.order);

/** Same rule as the site: whole years since careerStart, never below the floor shown on the site. */
function years(now = new Date()) {
  const [y, m] = profile.careerStart.split("-").map(Number);
  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  return Math.max(5, Math.floor(months / 12));
}

const host = (url: string) => {
  const u = new URL(url);
  return (u.host.replace(/^www\./, "") + u.pathname).replace(/\/$/, "");
};

const KIND_LABEL: Record<CaseStudy["parts"][number]["kind"], { tr: string; en: string }> = {
  web: { tr: "Web", en: "Web" },
  mobile: { tr: "Mobil", en: "Mobile" },
  desktop: { tr: "Masaüstü", en: "Desktop" },
  api: { tr: "API", en: "API" },
  admin: { tr: "Yönetim", en: "Admin" },
  service: { tr: "Servis", en: "Service" },
  site: { tr: "Web sitesi", en: "Website" },
  kiosk: { tr: "Kiosk", en: "Kiosk" },
  library: { tr: "Paket", en: "Package" },
  skill: { tr: "Skill", en: "Skill" },
  mcp: { tr: "MCP", en: "MCP" },
  npm: { tr: "npm", en: "npm" },
  nuget: { tr: "NuGet", en: "NuGet" },
};

const BADGE: Record<string, { color: string; logo: string }> = {
  LinkedIn: { color: "0a66c2", logo: "linkedin" },
  X: { color: "000000", logo: "x" },
  Instagram: { color: "E4405F", logo: "instagram" },
  GitHub: { color: "181717", logo: "github" },
  npm: { color: "CB3837", logo: "npm" },
  NuGet: { color: "004880", logo: "nuget" },
};

const T = {
  en: {
    // readme-standard Rule 4/5: verbatim language reference lines.
    langLine: "> 🇹🇷 Türkçe için [README.tr.md](README.tr.md)",
    about: "👋 About Me",
    years: (n: number) => `${n}+ years building production software`,
    products: (n: number) => `${n}+ live products`,
    now: "Currently",
    work: "🔨 Selected Work",
    project: "Project",
    what: "What it is",
    parts: "Built as",
    more: "More products",
    tools: "🧰 Open Source",
    toolsIntro: "Agent plugins for Claude Code and Codex ship through one marketplace — register it once, install anything by name:",
    packages: "📦 Published Packages",
    pkg: "Package",
    solves: "What it solves",
    downloads: "Downloads",
    stack: "🛠 Tech Stack",
    analytics: "📊 GitHub Analytics",
    activity: "📈 Contribution Activity",
    alt: { details: "Profile Details", langs: "Repos Per Language", commits: "Most Commit Language", streak: "GitHub Streak" },
    generated: "Generated from [`content/`](content) by `pnpm readme` — the same source as [sametbrr.com](https://sametbrr.com) and the CV.",
    contact: "📬 Contact",
    contactIntro: "Consulting, architecture reviews or a new product — let's talk.",
    email: "Email",
    site: "Website",
    community: "Questions about a project? Use its **Discussions** tab. Contribution guide: [CONTRIBUTING](https://github.com/sametbrr/.github/blob/main/CONTRIBUTING.md).",
    license: "Code in this repository is MIT licensed; the site content (texts, case studies, images) is © Samet Birer, all rights reserved. See [NOTICE](NOTICE).",
  },
  tr: {
    langLine: "> 🇬🇧 For English see [README.md](README.md)",
    about: "👋 Hakkımda",
    years: (n: number) => `${n}+ yıldır canlıda çalışan yazılımlar geliştiriyorum`,
    products: (n: number) => `${n}+ canlı ürün`,
    now: "Şu an",
    work: "🔨 Seçili Çalışmalar",
    project: "Proje",
    what: "Ne yapar",
    parts: "Parçalar",
    more: "Diğer ürünler",
    tools: "🧰 Açık Kaynak",
    toolsIntro: "Claude Code ve Codex için agent plugin'lerinin hepsi tek bir marketplace'ten dağıtılır — bir kez ekleyin, ismiyle kurun:",
    packages: "📦 Yayınlanmış Paketler",
    pkg: "Paket",
    solves: "Ne çözer",
    downloads: "İndirme",
    stack: "🛠 Teknolojiler",
    analytics: "📊 GitHub İstatistikleri",
    activity: "📈 Katkı Aktivitesi",
    alt: { details: "Profil Detayları", langs: "Dile Göre Repolar", commits: "En Çok Commit Edilen Dil", streak: "GitHub Serisi" },
    generated: "Bu dosya [`content/`](content) klasöründen `pnpm readme` ile üretilir — [sametbrr.com](https://sametbrr.com) ve CV ile aynı kaynak.",
    contact: "📬 İletişim",
    contactIntro: "Danışmanlık, mimari inceleme ya da yeni bir ürün — konuşalım.",
    email: "E-posta",
    site: "Web sitesi",
    community: "Bir proje hakkında sorun mu var? Projenin **Discussions** sekmesini kullanın. Katkı rehberi: [CONTRIBUTING](https://github.com/sametbrr/.github/blob/main/CONTRIBUTING.tr.md).",
    license: "Bu repodaki kod MIT lisanslıdır; site içeriği (metinler, vaka çalışmaları, görseller) © Samet Birer, tüm hakları saklıdır. Bkz. [NOTICE](NOTICE).",
  },
} as const;

function render(lang: Locale) {
  const t = T[lang];
  const p = profile.positioning;
  const featured = cases.filter((c) => c.tier === "featured");
  const compact = cases.filter((c) => c.tier === "compact").sort((a, b) => a.order - b.order);
  // Featured projects first; otherwise keep the file order (newest first).
  const byFeatured = (a: (typeof oss)[number], b: (typeof oss)[number]) => Number(b.featured) - Number(a.featured);
  const packages = oss.filter((o) => o.registry).sort(byFeatured);
  const tools = oss.filter((o) => !o.registry).sort(byFeatured);
  const repoPath = (url: string) => new URL(url).pathname.replace(/^\//, "");
  const stars = (o: (typeof oss)[number]) =>
    o.featured ? `<br><img src="https://img.shields.io/github/stars/${repoPath(o.url)}?style=flat&color=137a43&label=%E2%98%85" alt="GitHub stars">` : "";
  const current = experience.find((e) => e.end === null);
  const cvUrl = `${profile.url}/cv/${profile.handle}-cv-${lang}.pdf`;
  const badge = (label: string, message: string, color: string, logo: string, link: string) =>
    `  <a href="${link}">\n    <img src="https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(message).replace(/-/g, "--")}-${color}?style=for-the-badge&logo=${logo}&logoColor=white">\n  </a>`;

  const surfaces = (c: CaseStudy) =>
    [...new Set(c.parts.map((x) => x.kind))]
      .filter((k) => k !== "service" && k !== "library")
      .map((k) => KIND_LABEL[k][lang])
      .join(" · ");

  const lines: string[] = [];
  lines.push(
    `<!-- ${t.generated.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")} -->`,
    `<div align="center">`,
    ``,
    `# ${profile.name}`,
    ``,
    `### ${p.roles.map((r) => r[lang]).join(" · ")}`,
    ``,
    `**${p.headline[lang]}**`,
    ``,
    p.subhead[lang],
    ``,
    t.langLine,
    ``,
    `<p>`,
    badge("Website", host(profile.url), "137a43", "googlechrome", profile.url),
    ...profile.socials.filter((s) => BADGE[s.label] && s.label !== "GitHub").map((s) => badge(s.label, s.handle.replace(/^@/, ""), BADGE[s.label].color, BADGE[s.label].logo, s.url)),
    `</p>`,
    ``,
    `<p>`,
    `  <a href="${cvUrl}">`,
    // Badge images stay identical in both files (Rule: same shields.io URLs); only the link follows the language.
    `    <img src="https://img.shields.io/badge/CV-PDF-137a43?style=for-the-badge&logo=readdotcv&logoColor=white">`,
    `  </a>`,
    `</p>`,
    ``,
    `![Profile Views](https://komarev.com/ghpvc/?username=${profile.handle}&style=for-the-badge&color=137a43&label=PROFILE+VIEWS)`,
    ``,
    `</div>`,
    ``,
    `---`,
    ``,
    `## ${t.about}`,
    ``,
    `> **${p.philosophy[lang]}**`,
    ``,
    p.manifesto[lang],
    ``,
    `* ${t.years(years())}`,
    `* ${t.products(profile.products.length)}: ${profile.products.join(", ")}`,
  );
  if (current) lines.push(`* ${t.now}: **${current.role[lang]}** @ ${current.company}`);

  lines.push(
    ``,
    `---`,
    ``,
    `## ${t.work}`,
    ``,
    `<table>`,
    `<thead>`,
    `<tr><th width="180">${t.project}</th><th>${t.what}</th><th width="170">${t.parts}</th></tr>`,
    `</thead>`,
    `<tbody>`,
  );
  for (const c of featured) {
    const name = c.url ? `<a href="${c.url}"><b>${c.title}</b></a>` : `<b>${c.title}</b>`;
    const year = startYear(c) ? `<br><sub>${startYear(c)}</sub>` : "";
    lines.push(`<tr>`, `<td>${name}${year}</td>`, `<td>${(c.pitch ?? c.tagline)?.[lang] ?? ""}</td>`, `<td>${surfaces(c)}</td>`, `</tr>`);
  }
  lines.push(`</tbody>`, `</table>`, ``);
  if (compact.length) {
    lines.push(`**${t.more}:** ${compact.map((c) => `**${c.title}**${c.tagline ? ` — ${c.tagline[lang].replace(/\.$/, "")}` : ""}`).join(" · ")}.`, ``);
  }

  lines.push(
    `---`,
    ``,
    `## ${t.tools}`,
    ``,
    t.toolsIntro,
    ``,
    "```bash",
    `claude plugin marketplace add ${profile.handle}/skill-hub   # Claude Code`,
    `codex plugin marketplace add ${profile.handle}/skill-hub    # Codex`,
    "```",
    ``,
    `<table>`,
    `<thead>`,
    `<tr><th width="200">${t.project}</th><th>${t.what}</th></tr>`,
    `</thead>`,
    `<tbody>`,
  );
  for (const o of tools) lines.push(`<tr>`, `<td><a href="${o.url}"><b>${o.name}</b></a>${stars(o)}</td>`, `<td>${o.summary[lang]}</td>`, `</tr>`);
  lines.push(`</tbody>`, `</table>`, ``, `### ${t.packages}`, ``, `| ${t.pkg} | ${t.solves} | ${t.downloads} |`, `|---------|----------------|-----------|`);
  for (const o of packages) {
    const r = o.registry!;
    const dl =
      r.type === "nuget"
        ? `[![NuGet](https://img.shields.io/nuget/dt/${r.id}?label=NuGet&color=004880&logo=nuget)](https://www.nuget.org/packages/${r.id})`
        : `[![npm](https://img.shields.io/npm/dt/${r.id}?label=npm&color=CB3837&logo=npm)](https://www.npmjs.com/package/${r.id})`;
    lines.push(`| [**${o.name}**](${o.url})${o.featured ? " ⭐" : ""} | ${o.summary[lang]} | ${dl} |`);
  }

  lines.push(``, `---`, ``, `## ${t.stack}`, ``);
  for (const g of skills) lines.push(`**${g.name[lang]}:** ${g.items.join(" · ")}  `);

  lines.push(
    ``,
    `---`,
    ``,
    `## ${t.analytics}`,
    ``,
    `<p align="center">`,
    `  <img src="https://github-profile-summary-cards.vercel.app/api/cards/profile-details?username=${profile.handle}&theme=tokyonight" width="100%" alt="${t.alt.details}" />`,
    `</p>`,
    ``,
    `<p align="center">`,
    `  <img src="https://github-profile-summary-cards.vercel.app/api/cards/repos-per-language?username=${profile.handle}&theme=tokyonight" width="49%" alt="${t.alt.langs}" />`,
    `  <img src="https://github-profile-summary-cards.vercel.app/api/cards/most-commit-language?username=${profile.handle}&theme=tokyonight" width="49%" alt="${t.alt.commits}" />`,
    `</p>`,
    ``,
    `---`,
    ``,
    `## ${t.activity}`,
    ``,
    `<p align="center">`,
    `  <img src="https://streak-stats.demolab.com/?user=${profile.handle}&theme=tokyonight&hide_border=true" alt="${t.alt.streak}" />`,
    `</p>`,
    ``,
    `---`,
    ``,
    `## ${t.contact}`,
    ``,
    t.contactIntro,
  );
  if (profile.availability.open) lines.push(``, `🟢 **${profile.availability.label[lang]}**`);
  lines.push(
    ``,
    `* **${t.site}:** [${host(profile.url)}](${profile.url})`,
    `* **${t.email}:** [${profile.email}](mailto:${profile.email})`,
    ...profile.socials.filter((s) => s.label !== "GitHub").map((s) => `* **${s.label}:** [${s.handle}](${s.url})`),
    ``,
    t.community,
    ``,
    `---`,
    ``,
    `<sub>${t.license}</sub>`,
    ``,
    `<sub>${t.generated}</sub>`,
    ``,
  );
  return lines.join("\n");
}

const files = { "README.md": render("en"), "README.tr.md": render("tr") };
if (process.argv.includes("--check")) {
  const stale = Object.entries(files).filter(([f, body]) => readFileSync(f, "utf8") !== body);
  if (stale.length) {
    console.error(`Out of date: ${stale.map(([f]) => f).join(", ")} — run pnpm readme`);
    process.exit(1);
  }
  console.log("READMEs are up to date");
} else {
  for (const [f, body] of Object.entries(files)) {
    writeFileSync(f, body);
    console.log(`✓ ${f}`);
  }
}
