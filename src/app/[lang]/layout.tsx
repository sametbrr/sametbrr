import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { MotionProvider } from "@/components/motion/motion-provider";
import { Footer } from "@/components/sections/footer";
import { BackToTop, ScrollProgress } from "@/components/ui/client-bits";
import { SoundEffects } from "@/components/ui/sound";
import { AnalyticsClicks } from "@/components/ui/analytics";
import { UMAMI } from "@/lib/analytics";
import Script from "next/script";
import { BootScreen } from "@/components/sections/boot-screen";
import { bootInitScript, themeInitScript } from "@/lib/init-scripts";
import "slot-text/style.css";
import { hasLocale, href, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getProfile } from "@/lib/content/load";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const generateStaticParams = () => locales.map((lang) => ({ lang }));
export const dynamicParams = false;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
    { media: "(prefers-color-scheme: light)", color: "#f6f6f2" },
  ],
  colorScheme: "dark light",
};

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  const profile = getProfile();
  return {
    metadataBase: new URL(profile.url),
    title: { default: dict.meta.title, template: `%s — ${profile.name}` },
    description: dict.meta.description,
    authors: [{ name: profile.name, url: profile.url }],
    alternates: {
      canonical: href(lang),
      languages: { tr: href("tr"), en: href("en"), "x-default": href("tr") },
    },
    openGraph: {
      type: "website",
      siteName: profile.name,
      locale: lang === "tr" ? "tr_TR" : "en_US",
      title: dict.meta.title,
      description: dict.meta.description,
    },
    twitter: { card: "summary_large_image", creator: "@sametbrr" },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const profile = getProfile();

  return (
    // data-theme is set by themeInitScript before hydration, hence suppressHydrationWarning.
    <html lang={lang} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript + bootInitScript }} />
      </head>
      <body id="top" className="min-h-svh bg-void font-sans text-fg">
        <a
          href="#main"
          className="sr-only z-[70] rounded-full bg-ghost px-4 py-2 text-void focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {lang === "tr" ? "İçeriğe geç" : "Skip to content"}
        </a>
        <BootScreen name={profile.name} year={new Date().getFullYear()} dict={dict.boot} />
        <SoundEffects />
        <AnalyticsClicks />
        <Script
          src={UMAMI.src}
          data-website-id={UMAMI.websiteId}
          data-domains={UMAMI.domains}
          strategy="afterInteractive"
        />
        <MotionProvider>
          <ScrollProgress />
          {children}
          <Footer profile={profile} dict={dict} locale={lang} />
          <BackToTop label={dict.footer.top} />
        </MotionProvider>
      </body>
    </html>
  );
}
