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
      tr: ["← → yürü", "Space / Z / ↑ zıpla (basılı tut: daha yükseğe)", "X basılı: koş", "Mobilde oyun ekranındaki ◀ ▶, A (zıpla) ve B (koş)"],
      en: ["← → walk", "Space / Z / ↑ jump (hold for higher)", "Hold X: run", "On mobile, the on-screen ◀ ▶, A (jump) and B (run)"],
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
      tr: ["← → ↑ ↓ ya da WASD yön değiştir", "Duvara ve hattın kendisine çarpma", "Mobilde ekranı kaydırarak yön ver"],
      en: ["← → ↑ ↓ or WASD to turn", "Avoid the walls and your own pipe", "On mobile, swipe to turn"],
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
      tr: ["← → ya da fare/dokunma ile raket", "Space / ↑ topu fırlat", "Mobilde parmağını sürükle, dokununca top fırlar"],
      en: ["← → or mouse/touch to move", "Space / ↑ to launch", "On mobile, drag your finger; touch to launch"],
    },
  },
  {
    slug: "uptime",
    title: { tr: "Kesintisiz", en: "Uptime" },
    genre: { tr: "Tek tuş", en: "One button" },
    summary: {
      tr: "Veri paketini firewall boşluklarından geçir. Her kapı bir istek; düşersen kesinti.",
      en: "Keep the data packet flying through firewall gaps. Every gate is a request; a fall is an outage.",
    },
    controls: {
      tr: ["Space / ↑ / tıkla: yüksel", "Mobilde ekrana dokun"],
      en: ["Space / ↑ / click to rise", "On mobile, tap the screen"],
    },
  },
  {
    slug: "merge-conflict",
    title: { tr: "Merge Çatışması", en: "Merge Conflict" },
    genre: { tr: "Uzay atışı", en: "Shoot 'em up" },
    summary: {
      tr: "Aşağı inen çatışma, hata ve uyarı dalgalarını vur. Her dördüncü dalgada Legacy Monolit seni bekliyor.",
      en: "Shoot down the waves of conflicts, bugs and warnings. Every fourth wave, the Legacy Monolith awaits.",
    },
    controls: {
      tr: ["← → ya da fare ile hareket", "Space / Z basılı: ateş", "Mobilde parmağını sürükle, basılı tuttukça ateş eder"],
      en: ["← → or mouse to move", "Hold Space / Z to fire", "On mobile, drag your finger; it fires while held"],
    },
  },
  {
    slug: "stack-overflow",
    title: { tr: "Stack Overflow", en: "Stack Overflow" },
    genre: { tr: "Blok dizme", en: "Falling blocks" },
    summary: {
      tr: "Görev bloklarını diz, dolan satırlar canlıya çıkıp silinir. Yığın tepeye ulaşırsa overflow.",
      en: "Stack the task blocks; full rows ship and clear. Let the stack reach the top and it overflows.",
    },
    controls: {
      tr: ["← → kaydır, ↓ hızlı indir", "↑ / X döndür, Space sert bırak", "Mobilde: kaydır, dokun döndür, aşağı fırlat bırak"],
      en: ["← → move, ↓ soft drop", "↑ / X rotate, Space hard drop", "On mobile: swipe to move, tap to rotate, flick down to drop"],
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
