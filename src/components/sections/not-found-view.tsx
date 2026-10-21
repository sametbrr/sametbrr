import Link from "next/link";
import { LazyArcadePreview } from "@/components/arcade/lazy";

/**
 * Bilingual 404 body: the locale is unknown for an unmatched URL, so both languages show.
 * Used by app/global-not-found.tsx (unmatched routes) and [lang]/not-found.tsx (notFound() calls).
 */
export function NotFoundView() {
  return (
    <main id="main" className="container-site grid min-h-svh items-center gap-12 py-24 lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col items-start gap-6">
        <p className="font-mono text-sm text-ghost">404</p>
        <h1 className="text-h2">
          Sayfa bulunamadı <span className="text-fg-subtle">/ Page not found</span>
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="rounded-full bg-primary px-5 py-3 font-medium text-on-primary transition-colors hover:bg-primary-hover">
            Ana sayfa · Home
          </Link>
          <Link
            href="/arcade/runner"
            data-umami-event="arcade-open"
            data-umami-event-from="404"
            className="rounded-full border border-line-strong px-5 py-3 font-mono text-sm transition-colors hover:border-ghost/60 hover:text-ghost"
          >
            ▶ Kaybolmuşken bir oyun? · Play a game
          </Link>
        </div>
      </div>
      <Link
        href="/arcade/runner"
        aria-label="Canlıya Koşu · Deploy Runner"
        className="relative block overflow-hidden rounded-lg border border-line-strong bg-[#06120c]"
      >
        <LazyArcadePreview slug="runner" locale="tr" />
        <div aria-hidden className="crt-overlay pointer-events-none absolute inset-0" />
      </Link>
    </main>
  );
}
