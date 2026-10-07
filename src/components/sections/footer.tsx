import { LocalClock } from "@/components/ui/client-bits";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Profile } from "@/lib/content/schema";

export function Footer({ profile, dict, locale }: { profile: Profile; dict: Dictionary; locale: Locale }) {
  return (
    <footer className="site-footer border-t border-line">
      <div className="container-site flex flex-col gap-6 py-10 font-mono text-xs text-fg-muted md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} {profile.name}. {dict.footer.rights}
        </p>
        <p className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-ghost" aria-hidden />
          {dict.footer.local} · <LocalClock locale={locale} />
        </p>
      </div>
    </footer>
  );
}
