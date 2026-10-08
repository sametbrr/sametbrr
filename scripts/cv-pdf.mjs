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
import { readFile, writeFile } from "node:fs/promises";
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

const { handle, private: privateFields } = parse(await readFile("content/profile.yaml", "utf8"));
mkdirSync("public/cv", { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
try {
  const outputs = [];
  for (const [lang, path] of [["tr", "/cv"], ["en", "/en/cv"]]) {
    const context = await browser.newContext({ locale: lang === "tr" ? "tr-TR" : "en-US" });
    const page = await context.newPage();
    const res = await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
    if (!res?.ok()) throw new Error(`${path} returned ${res?.status()}`);
    // pdf-only contact data never ships in the CV page's HTML.
    await page.evaluate(async (phone) => {
      if (phone.visibility === "pdf-only" && phone.value) {
        const row = document.querySelector("[data-cv-phone]");
        const link = document.createElement("a");
        link.href = `tel:${phone.value.replace(/\s/g, "")}`;
        link.textContent = phone.value;
        row.append(link);
        row.hidden = false;
      }
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll(".cv-sheet img")].map((img) => img.decode()));
    }, privateFields.phone);
    await page.emulateMedia({ media: "print" });
    const fit = await page.evaluate(() => {
      const sheet = document.querySelector(".cv-sheet");
      const footer = sheet.querySelector(".cv-document-footer").getBoundingClientRect();
      const height = sheet.getBoundingClientRect().height;
      const contentBottom = Math.max(...[...sheet.querySelectorAll(".cv-section")].map((el) => el.getBoundingClientRect().bottom));
      return { height, contentBottom, footerTop: footer.top };
    });
    if (fit.height > 1122.6 + 1 || fit.contentBottom > fit.footerTop - 4) {
      throw new Error(`${path} exceeds the one-page CV layout: ${JSON.stringify(fit)}. Adjust content or spacing before exporting.`);
    }
    const out = `public/cv/${handle}-cv-${lang}.pdf`;
    outputs.push({ out, buffer: await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }) });
    await context.close();
  }
  // Validate both languages before replacing either downloadable file.
  for (const { out, buffer } of outputs) {
    await writeFile(out, buffer);
    console.log(`✓ ${out}`);
  }
} finally {
  await browser.close();
}
