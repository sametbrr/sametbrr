/**
 * Inline <head> scripts that must run before first paint. They live in a plain module
 * (not "use client") so the server renders them as strings, not client references.
 */

export const THEME_STORAGE_KEY = "theme";
export const BOOT_SESSION_KEY = "booted";

/**
 * Runs in <head> before first paint: stored choice, else the OS preference.
 * Kept as a string so it can be inlined without a network request (no theme flash).
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})();`;

/**
 * Runs in <head> before first paint: if the boot screen already ran this session, or the
 * visitor prefers reduced motion, or this is the printable CV, mark the page as booted so CSS never shows the screen.
 */
export const bootInitScript = `(function(){try{if(/\\/cv\\/?$/.test(location.pathname)||sessionStorage.getItem("${BOOT_SESSION_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.booted="1"}}catch(e){document.documentElement.dataset.booted="1"}})();`;
