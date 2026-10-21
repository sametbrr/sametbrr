import type { Localized } from "@/lib/content/schema";

/** Game list shared by the home teaser, the arcade hub and the game pages (no DOM code here). */
export const GAMES = [
  {
    slug: "runner",
    title: { tr: "Canlıya Koşu", en: "Deploy Runner" },
    genre: { tr: "Platform", en: "Platformer" },
    summary: {
      tr: "Bug'ların üstüne zıpla, ? bloklarından commit coin topla, kahveyle kalkan kazan ve PROD bayrağına ulaş.",
      en: "Stomp the bugs, bump ? blocks for commit coins, grab a coffee shield and reach the PROD flag.",
    },
    controls: {
      tr: ["← → yürü", "Space / Z / ↑ zıpla (basılı tut: daha yükseğe)", "X basılı: koş"],
      en: ["← → walk", "Space / Z / ↑ jump (hold for higher)", "Hold X: run"],
    },
  },
  {
    slug: "pipeline",
    title: { tr: "Veri Hattı", en: "Pipeline" },
    genre: { tr: "Yılan", en: "Snake" },
    summary: {
      tr: "Veri paketlerini topla; hat uzadıkça hızlanır. Altın paketler süreli bonus verir.",
      en: "Collect data packets; the pipeline speeds up as it grows. Golden packets are timed bonuses.",
    },
    controls: {
      tr: ["← → ↑ ↓ ya da WASD yön değiştir", "Duvara ve hattın kendisine çarpma"],
      en: ["← → ↑ ↓ or WASD to turn", "Avoid the walls and your own pipe"],
    },
  },
  {
    slug: "bug-smasher",
    title: { tr: "Hata Avcısı", en: "Bug Smasher" },
    genre: { tr: "Tuğla kırma", en: "Breakout" },
    summary: {
      tr: "Hata duvarını build topuyla temizle. ? işaretli hatalar güçlendirme düşürür: geniş raket, çoklu top, ekstra can.",
      en: "Clear the bug wall with the build ball. ? bugs drop power-ups: wide paddle, multi-ball, extra life.",
    },
    controls: {
      tr: ["← → ya da fare/dokunma ile raket", "Space / ↑ topu fırlat"],
      en: ["← → or mouse/touch to move", "Space / ↑ to launch"],
    },
  },
] as const satisfies readonly {
  slug: string;
  title: Localized;
  genre: Localized;
  summary: Localized;
  controls: { tr: readonly string[]; en: readonly string[] };
}[];

export type GameSlug = (typeof GAMES)[number]["slug"];
export const getGame = (slug: string) => GAMES.find((g) => g.slug === slug);
