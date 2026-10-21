import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NotFoundView } from "@/components/sections/not-found-view";
import { themeInitScript } from "@/lib/init-scripts";
import "./globals.css";

/*
 * Unmatched URLs never reach app/[lang]/layout.tsx (the root layout sits under a dynamic
 * segment), so Next would fall back to its default page. This is the site's own 404 instead.
 */
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "404 — Sayfa bulunamadı / Page not found",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="tr" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-svh bg-void font-sans text-fg">
        <NotFoundView />
      </body>
    </html>
  );
}
