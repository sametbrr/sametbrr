/**
 * Renders the /cv page to PDF, one file per language, into public/cv/.
 * The CV page reads the same content/*.yaml as the site, so run this after content changes:
 *
 *   pnpm dev              # or any running build of the site
 *   pnpm cv:pdf           # BASE_URL=http://localhost:3000 pnpm cv:pdf to target another server
 *
 * Needs a Chromium-based browser; set CHROME_PATH if it isn't in a standard location.
 */
import { existsSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { parse } from "yaml";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3123";
const CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error("No Chromium-based browser found. Set CHROME_PATH.");
  process.exit(1);
}

const { handle } = parse(await readFile("content/profile.yaml", "utf8"));
mkdirSync("public/cv", { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
try {
  for (const [lang, path] of [["tr", "/cv"], ["en", "/en/cv"]]) {
    const context = await browser.newContext({ locale: lang === "tr" ? "tr-TR" : "en-US" });
    const page = await context.newPage();
    const res = await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
    if (!res?.ok()) throw new Error(`${path} returned ${res?.status()}`);
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: "print" });
    const out = `public/cv/${handle}-cv-${lang}.pdf`;
    await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
    console.log(`✓ ${out}`);
    await context.close();
  }
} finally {
  await browser.close();
}
