import { NextResponse, type NextRequest } from "next/server";

const LOCALE_COOKIE = "lang";

/**
 * TR is served at the root (rewritten to /tr internally), EN under /en.
 * `/tr/...` redirects to the unprefixed URL so every page has one address.
 * On a first visit to `/`, an English-preferring browser is sent to /en once.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/tr" || pathname.startsWith("/tr/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const res = NextResponse.next();
    res.cookies.set(LOCALE_COOKIE, "en", { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  if (pathname === "/" && !request.cookies.has(LOCALE_COOKIE)) {
    const accept = request.headers.get("accept-language") ?? "";
    const first = accept.split(",")[0]?.trim().toLowerCase() ?? "";
    if (first.startsWith("en") && !accept.toLowerCase().includes("tr")) {
      const url = request.nextUrl.clone();
      url.pathname = "/en";
      return NextResponse.redirect(url);
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = `/tr${pathname === "/" ? "" : pathname}`;
  const res = NextResponse.rewrite(url);
  if (request.cookies.get(LOCALE_COOKIE)?.value !== "tr") {
    res.cookies.set(LOCALE_COOKIE, "tr", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
