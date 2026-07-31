import { DEFAULT_THEME, type Theme } from "./types";

const PREFERS_DARK = "(prefers-color-scheme: dark)";

/**
 * Resolve the OS / browser color scheme via matchMedia.
 */
export function detectSystemTheme(): Theme {
  try {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia(PREFERS_DARK).matches ? "dark" : "light";
    }
  } catch {
    // ignore
  }
  return DEFAULT_THEME;
}

/**
 * Subscribe to system color-scheme changes.
 * Returns a cleanup function that removes the listener.
 */
export function listenSystemTheme(cb: (theme: Theme) => void): () => void {
  try {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return () => {};
    }

    const mql = window.matchMedia(PREFERS_DARK);
    const handler = (event: MediaQueryListEvent) => {
      cb(event.matches ? "dark" : "light");
    };

    // Modern API; mediaQueryList.addListener is deprecated.
    mql.addEventListener("change", handler);
    return () => {
      mql.removeEventListener("change", handler);
    };
  } catch {
    return () => {};
  }
}
