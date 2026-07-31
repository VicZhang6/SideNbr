import { DEFAULT_LOCALE, type Locale } from "./types";

const LOCALE_STORAGE_KEY = "localePreference";

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh";
}

/**
 * Detect the active locale.
 * 1. Prefer chrome.storage.local `localePreference` when set to "en" | "zh"
 * 2. Else navigator.language / languages: "zh"* → "zh", otherwise "en"
 * 3. Default "en"
 */
export async function detectLocale(): Promise<Locale> {
  try {
    if (
      typeof chrome !== "undefined" &&
      chrome.storage?.local?.get
    ) {
      const result = await chrome.storage.local.get(LOCALE_STORAGE_KEY);
      const stored: unknown = result[LOCALE_STORAGE_KEY];
      if (isLocale(stored)) {
        return stored;
      }
    }
  } catch {
    // Fall through to browser language detection.
  }

  return detectBrowserLocale();
}

/**
 * Resolve locale from navigator.language / navigator.languages only.
 */
export function detectBrowserLocale(): Locale {
  try {
    const candidates: string[] = [];

    if (typeof navigator !== "undefined") {
      if (Array.isArray(navigator.languages)) {
        candidates.push(...navigator.languages);
      }
      if (typeof navigator.language === "string") {
        candidates.push(navigator.language);
      }
    }

    for (const lang of candidates) {
      if (typeof lang === "string" && lang.toLowerCase().startsWith("zh")) {
        return "zh";
      }
    }
  } catch {
    // ignore
  }

  return DEFAULT_LOCALE;
}
