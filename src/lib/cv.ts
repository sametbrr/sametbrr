import type { Locale } from "@/i18n/config";

/**
 * Where the generated CV PDFs live (written by `pnpm cv:pdf` from the /cv page).
 * One file per language so the download always matches the page it came from.
 */
export const cvPdfPath = (handle: string, locale: Locale) => `/cv/${handle}-cv-${locale}.pdf`;
