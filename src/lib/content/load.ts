import "server-only";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { parse } from "yaml";
import { z } from "zod";
import {
  caseStudySchema,
  educationSchema,
  hasDetail,
  startYear,
  experienceSchema,
  ossProjectSchema,
  profileSchema,
  serviceSchema,
  skillGroupSchema,
} from "./schema";

const CONTENT_DIR = path.join(process.cwd(), "content");

function read<T extends z.ZodType>(file: string, schema: T): z.infer<T> {
  const raw = parse(readFileSync(path.join(CONTENT_DIR, file), "utf8"));
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`content/${file} is invalid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const getProfile = cache(() => read("profile.yaml", profileSchema));
export const getServices = cache(() => read("services.yaml", z.array(serviceSchema)));
export const getExperience = cache(() => read("experience.yaml", z.array(experienceSchema)));
export const getSkills = cache(() => read("skills.yaml", z.array(skillGroupSchema)));
export const getOssProjects = cache(() => read("projects.yaml", z.array(ossProjectSchema)));
export const getEducation = cache(() => read("education.yaml", z.array(educationSchema)));

export const getCaseStudies = cache(() =>
  readdirSync(path.join(CONTENT_DIR, "case-studies"))
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => read(path.join("case-studies", f), caseStudySchema))
    // Pinned first, then newest first; `order` breaks ties within a year.
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || startYear(b) - startYear(a) || a.order - b.order),
);

/** Projects that have their own /work/[slug] page. */
export const getDetailedCaseStudies = cache(() => getCaseStudies().filter(hasDetail));

export const getCaseStudy = (slug: string) => getDetailedCaseStudies().find((c) => c.slug === slug);

/** Whole years since careerStart, month precision — never hand-written. */
export function yearsOfExperience(careerStart: string, now = new Date()): number {
  const [y, m] = careerStart.split("-").map(Number);
  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  return Math.floor(months / 12);
}
