import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GAMES } from "@/components/arcade/catalog";
import { LazyArcadePreview } from "@/components/arcade/lazy";
import { ArrowIcon, Label, Tag } from "@/components/ui/primitives";
import { hasLocale, href } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { SiteNav } from "../site-nav";

export async function generateMetadata({ params }: PageProps<"/[lang]/arcade">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return {
    title: dict.arcade.label,
    description: dict.arcade.metaDescription,
    alternates: {
      canonical: href(lang, "/arcade"),
      languages: { tr: href("tr", "/arcade"), en: href("en", "/arcade") },
    },
  };
}

export default async function ArcadePage({ params }: PageProps<"/[lang]/arcade">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <>
      <SiteNav locale={lang} path="/arcade" onHome={false} />
      <main id="main" className="pt-32 pb-24">
        <header className="container-site flex flex-col gap-6 pb-14">
          <Label index="▶">{dict.arcade.label}</Label>
          <h1 className="text-display max-w-4xl text-balance">{dict.arcade.title}</h1>
          <p className="max-w-2xl text-lg text-fg-muted">{dict.arcade.text}</p>
        </header>
        <ul className="container-site grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game, i) => (
            <li key={game.slug}>
              <Link
                href={href(lang, `/arcade/${game.slug}`)}
                data-umami-event="arcade-open"
                data-umami-event-game={game.slug}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface-1 transition-colors hover:border-ghost/50"
              >
                <div className="relative overflow-hidden border-b border-line">
                  <LazyArcadePreview slug={game.slug} locale={lang} />
                  <div aria-hidden className="crt-overlay pointer-events-none absolute inset-0" />
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-fg-subtle">/{String(i + 1).padStart(2, "0")}</span>
                    <Tag>{game.genre[lang]}</Tag>
                  </div>
                  <h2 className="text-h3 font-semibold">{game.title[lang]}</h2>
                  <p className="text-sm text-fg-muted">{game.summary[lang]}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-medium text-ghost">
                    ▶ {dict.arcade.play}
                    <ArrowIcon className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <p className="container-site mt-12 font-mono text-xs text-fg-subtle">{dict.arcade.konami}</p>
      </main>
    </>
  );
}
