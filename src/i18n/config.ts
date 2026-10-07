import { defaultLocale, locales, type Locale, type Localized } from "@/lib/content/schema";

export { defaultLocale, locales, type Locale };

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

/** Pick the string for the active locale from a { tr, en } pair. */
export const t = (value: Localized, locale: Locale) => value[locale];

/** Public URL for a path: TR lives at the root, EN under /en. */
export function href(locale: Locale, path = "/") {
  const clean = path === "/" ? "" : path;
  return locale === defaultLocale ? clean || "/" : `/${locale}${clean}`;
}
