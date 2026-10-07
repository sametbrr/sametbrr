/**
 * Umami Cloud analytics. The website ID is public by design (it ships in the page anyway).
 * `domains` limits counting to the live site, so dev servers and previews never pollute the stats.
 */
export const UMAMI = {
  src: "https://cloud.umami.is/script.js",
  websiteId: "4cc9d5a9-402f-424f-bdbb-56b66191df2f",
  domains: "sametbrr.com,www.sametbrr.com",
} as const;

type EventData = Record<string, string | number | boolean>;
type Umami = { track: (event: string, data?: EventData) => void };

/** Sends a custom event; a no-op until the tracker has loaded (or when it is blocked). */
export function track(event: string, data?: EventData) {
  (window as Window & { umami?: Umami }).umami?.track(event, data);
}
