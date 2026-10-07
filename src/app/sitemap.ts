import type { MetadataRoute } from "next";
import { href, locales } from "@/i18n/config";
import { getDetailedCaseStudies, getProfile } from "@/lib/content/load";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getProfile().url;
  const paths = ["/", ...getDetailedCaseStudies().map((c) => `/work/${c.slug}`)];
  return paths.flatMap((path) =>
    locales.map((lang) => ({
      url: `${base}${href(lang, path) === "/" ? "" : href(lang, path)}`,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}${href(l, path)}`])) },
    })),
  );
}
