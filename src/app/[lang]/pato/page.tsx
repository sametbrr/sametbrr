import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GAMES } from "@/components/arcade/catalog";
import { Companion } from "@/components/patates/companion";
import { ArrowIcon } from "@/components/ui/primitives";
import { hasLocale, href } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { SiteNav } from "../site-nav";

export async function generateMetadata({ params }: PageProps<"/[lang]/pato">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return {
    title: "Pato",
    description: lang === "tr" ? "Biraz odaklan, biraz yürü. Pato ile çalışma ve mola ritmini bul." : "Focus a little, walk a little. Find your work and break rhythm with a potato companion.",
    manifest: "/patates-cuvali/manifest.webmanifest",
    appleWebApp: { capable: true, title: "Pato", statusBarStyle: "default" },
    icons: { apple: "/patates-cuvali/icon-192.png" },
    alternates: { canonical: href(lang, "/pato"), languages: { tr: href("tr", "/pato"), en: href("en", "/pato") } },
  };
}
export default async function Page({ params }: PageProps<"/[lang]/pato">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  // Same "more games" table as the arcade game pages.
  const others = (
    <div className="flex flex-col gap-3">
      <p className="text-label text-fg-muted">{dict.arcade.others}</p>
      <ul className="border-t border-line">
        {GAMES.map((g) => (
          <li key={g.slug}>
            <Link href={href(lang, `/arcade/${g.slug}`)} className="group flex items-center justify-between gap-4 border-b border-line px-2 py-4">
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
  );
  return (
    <>
      <SiteNav locale={lang} path="/pato" onHome={false} />
      <Companion english={lang === "en"} others={others} />
    </>
  );
}
