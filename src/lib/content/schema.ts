import { z } from "zod";

export const locales = ["tr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "tr";

/** Bilingual string. Every user-facing text in content/ uses this shape. */
export const localized = z.object({ tr: z.string().min(1), en: z.string().min(1) });
export type Localized = z.infer<typeof localized>;

/** Where a field may appear. `pdf-only` stays out of web pages and JSON-LD. */
export const visibility = z.enum(["public", "pdf-only", "hidden"]);

const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM");

const privateField = z.object({ value: z.string(), visibility });

/** Organisation logo for timelines. `mono` is tinted with the theme (CSS mask); `color` is shown as-is. */
export const logoSchema = z.object({ src: z.string(), mode: z.enum(["mono", "color"]) });

export const profileSchema = z.object({
  name: z.string(),
  handle: z.string(),
  url: z.url(),
  email: z.email(),
  location: localized,
  careerStart: yearMonth,
  products: z.array(z.string()).min(1),
  publicRepos: z.number().int().nonnegative(),
  /** Hides the education timeline (and alumniOf in JSON-LD) without touching education.yaml. */
  showEducation: z.boolean().default(true),
  availability: z.object({ open: z.boolean(), label: localized }),
  positioning: z.object({
    role: localized,
    roles: z.array(localized).min(1),
    headline: localized,
    subhead: localized,
    manifesto: localized,
    philosophy: localized,
  }),
  socials: z.array(z.object({ label: z.string(), url: z.url(), handle: z.string() })),
  calLink: z.string().optional(),
  private: z.object({
    phone: privateField,
    birthDate: privateField,
    gender: privateField,
    maritalStatus: privateField,
  }),
});

export const serviceSchema = z.object({
  id: z.string(),
  size: z.enum(["lg", "md", "wide"]),
  accent: z.enum(["quantum", "ghost", "ice"]),
  title: localized,
  summary: localized,
  points: z.array(localized),
});

export const experienceSchema = z.object({
  role: localized,
  company: z.string(),
  logo: logoSchema.optional(),
  location: localized,
  start: yearMonth,
  end: yearMonth.nullable(),
  bullets: z.array(z.object({ text: localized, tags: z.array(z.string()) })),
  tags: z.array(z.string()),
});

export const skillGroupSchema = z.object({
  name: localized,
  items: z.array(z.string()),
});

export const ossProjectSchema = z.object({
  name: z.string(),
  url: z.url(),
  kind: z.enum(["plugin", "mcp", "package", "community"]),
  registry: z.object({ type: z.enum(["npm", "nuget"]), id: z.string() }).optional(),
  summary: localized,
  featured: z.boolean().default(false),
});

export const educationSchema = z.object({
  degree: localized,
  school: z.string(),
  logo: logoSchema.optional(),
  start: yearMonth.optional(),
  end: yearMonth.optional(),
  ongoing: z.boolean().default(false),
});

const archNode = z.object({
  id: z.string(),
  label: z.string(),
  layer: z.number().int().min(0).max(3),
  core: z.boolean().default(false),
});

/**
 * A project in the Work section. `featured` ones get a large card, `compact` ones a row in the
 * list under the cards. Only entries with a problem and solution get their own detail page;
 * the rest link to their live site (or nowhere), so a project can be listed before it is written up.
 */
export const partKind = z.enum([
  "web",
  "mobile",
  "desktop",
  "api",
  "admin",
  "service",
  "site",
  "kiosk",
  "library",
  "skill",
  "mcp",
  "npm",
  "nuget",
]);

export const caseStudySchema = z.object({
  slug: z.string(),
  tier: z.enum(["featured", "compact"]),
  /** Tie-breaker between projects that start in the same year (lower first). */
  order: z.number().default(0),
  /** Shown before everything else, regardless of year. */
  pinned: z.boolean().default(false),
  title: z.string(),
  client: z.string().optional(),
  url: z.url().optional(),
  repo: z.url().optional(),
  status: z.enum(["live", "ongoing"]),
  /** First year sorts the list, newest first. */
  period: localized.optional(),
  confidentiality: z.enum(["public", "anonymized"]).default("public"),
  role: z.array(z.enum(["architecture", "development", "pm", "product", "devops", "ai"])).default([]),
  tagline: localized.optional(),
  /** A longer, selling description for the big card (2–3 sentences); falls back to the tagline. */
  pitch: localized.optional(),
  /** Long, corporate write-up for the detail page, one entry per paragraph. */
  overview: z.array(localized).default([]),
  problem: localized.optional(),
  solution: localized.optional(),
  highlights: z.array(localized).default([]),
  stack: z.array(z.string()).default([]),
  /** The deployable pieces of the product (mobile app, admin panel, API…). */
  parts: z
    .array(
      z.object({
        name: z.string(),
        kind: partKind,
        note: localized.optional(),
        /** A paragraph on what this part does and how it is built (detail page only). */
        detail: localized.optional(),
        url: z.url().optional(),
      }),
    )
    .default([]),
  /** Architecture and technical traits, shown as tags (CQRS, Multi-tenant, Real-time…). */
  features: z.array(z.string()).default([]),
  impact: z.array(z.object({ value: z.string(), label: localized })).default([]),
  /** The decisions behind the diagram, shown under it on the detail page. */
  architectureNotes: z.array(z.object({ title: localized, body: localized })).default([]),
  architecture: z
    .object({
      nodes: z.array(archNode),
      edges: z.array(z.tuple([z.string(), z.string()])),
    })
    .optional(),
});

export type Profile = z.infer<typeof profileSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;
export type OssProject = z.infer<typeof ossProjectSchema>;
export type Education = z.infer<typeof educationSchema>;
export type CaseStudy = z.infer<typeof caseStudySchema>;
export type DetailedCaseStudy = CaseStudy & { problem: Localized; solution: Localized };

/**
 * Only featured projects get a /work/[slug] page, and only once they are written up.
 * Compact projects keep their problem/solution in YAML, so a page comes back if one is promoted.
 */
export const hasDetail = (c: CaseStudy): c is DetailedCaseStudy => c.tier === "featured" && !!c.problem && !!c.solution;

/** First year in the period ("2022 – Present" → 2022); 0 when the period is not filled in yet. */
export const startYear = (c: CaseStudy) => Number(c.period?.en.match(/\d{4}/)?.[0] ?? 0);
