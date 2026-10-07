import { Nav } from "@/components/sections/nav";
import { href, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getProfile } from "@/lib/content/load";

/** Server wrapper: resolves labels and locale URLs for the client Nav. */
export function SiteNav({ locale, path = "/", onHome = true }: { locale: Locale; path?: string; onHome?: boolean }) {
  const dict = getDictionary(locale);
  const other: Locale = locale === "tr" ? "en" : "tr";
  const ids = ["about", "services", "work", "process", "oss", "experience", "contact"] as const;
  return (
    <Nav
      name={getProfile().name}
      switchHref={href(other, path)}
      switchTo={dict.nav.switchTo}
      switchLabel={dict.nav.switchLabel}
      ctaLabel={dict.hero.ctaPrimary}
      sectionBase={onHome ? "" : href(locale)}
      themeLabels={{ light: dict.nav.themeLight, dark: dict.nav.themeDark }}
      soundLabels={{ on: dict.nav.soundOn, off: dict.nav.soundOff }}
      menuLabels={{ open: dict.nav.menu, close: dict.nav.menuClose }}
      items={ids.map((id) => ({ id, label: dict.nav[id] }))}
    />
  );
}
