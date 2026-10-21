import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GAMES, getGame } from "@/components/arcade/catalog";
import { LazyArcadePlayer } from "@/components/arcade/lazy";
import { ArrowIcon, Label, Tag } from "@/components/ui/primitives";
import { hasLocale, href, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { SiteNav } from "../../site-nav";

export const dynamicParams = false;

export const generateStaticParams = () => locales.flatMap((lang) => GAMES.map((g) => ({ lang, game: g.slug })));

export async function generateMetadata({ params }: PageProps<"/[lang]/arcade/[game]">): Promise<Metadata> {
  const { lang, game: slug } = await params;
  const game = getGame(slug);
  if (!game || !hasLocale(lang)) return {};
  return {
    title: `${game.title[lang]} · Arcade`,
    description: game.summary[lang],
    alternates: {
      canonical: href(lang, `/arcade/${slug}`),
      languages: { tr: href("tr", `/arcade/${slug}`), en: href("en", `/arcade/${slug}`) },
    },
  };
}

export default async function GamePage({ params }: PageProps<"/[lang]/arcade/[game]">) {
  const { lang, game: slug } = await params;
  const game = getGame(slug);
  if (!game || !hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const a = dict.arcade;
  const others = GAMES.filter((g) => g.slug !== game.slug);

  return (
    <>
      <SiteNav locale={lang} path={`/arcade/${slug}`} onHome={false} />
      <main id="main" className="pt-28 pb-24 md:pt-32">
        <div className="container-site flex flex-col gap-8">
          <Link
            href={href(lang, "/arcade")}
            className="group inline-flex w-fit items-center gap-2 font-mono text-xs text-fg-muted hover:text-fg"
          >
            <ArrowIcon className="rotate-180 transition-transform group-hover:-translate-x-1" />
            {a.back}
          </Link>
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-4">
              <Label index="▶">{a.label}</Label>
              <h1 className="text-h2">{game.title[lang]}</h1>
            </div>
            <Tag tone="ghost">{game.genre[lang]}</Tag>
          </header>

          <LazyArcadePlayer
            slug={game.slug}
            locale={lang}
            title={game.title[lang]}
            labels={{
              insertCoin: a.insertCoin,
              start: a.start,
              startHint: a.startHint,
              pause: a.pause,
              resume: a.resume,
              paused: a.paused,
              restart: a.restart,
              gameOver: a.gameOver,
              newRecord: a.newRecord,
              score: a.score,
              best: a.best,
              lives: a.lives,
              level: a.level,
              soundOff: a.soundOff,
              fullscreen: a.fullscreen,
              exitFullscreen: a.exitFullscreen,
            }}
          />

          <div className="grid gap-8 border-t border-line pt-8 md:grid-cols-[1fr_1fr]">
            <div className="flex flex-col gap-3">
              <p className="text-label text-fg-muted">{a.controls}</p>
              <p className="text-fg-muted">{game.summary[lang]}</p>
              <ul className="flex flex-col gap-1.5 font-mono text-sm">
                {[...game.controls[lang], ...a.common].map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="text-ghost">›</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-label text-fg-muted">{a.others}</p>
              <ul className="border-t border-line">
                {others.map((g) => (
                  <li key={g.slug}>
                    <Link
                      href={href(lang, `/arcade/${g.slug}`)}
                      className="group flex items-center justify-between gap-4 border-b border-line px-2 py-4"
                    >
                      <span className="font-medium">{g.title[lang]}</span>
                      <span className="flex items-center gap-3 text-sm text-fg-muted">
                        {g.genre[lang]}
                        <ArrowIcon className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
