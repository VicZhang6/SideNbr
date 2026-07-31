import {
  DEFAULT_PROVIDER,
  isProviderId,
  normalizeEnabledProviders,
  type ProviderId,
} from "./providers";
import type { Locale } from "./i18n/types";
import type { Theme, ThemeMode } from "./theme/types";

const ACTIVE_PROVIDER_KEY = "activeProvider";
const ONBOARDING_SEEN_KEY = "onboardingSeen";
const ENABLED_PROVIDERS_KEY = "enabledProviders";
/** Stored language override: "en" | "zh" | "auto" (or missing = follow browser). */
const LOCALE_PREFERENCE_KEY = "localePreference";
/** Stored theme override: "light" | "dark" | "auto" (or missing = follow system). */
const THEME_PREFERENCE_KEY = "themePreference";

/**
 * Load the last active AI provider from chrome.storage.local.
 * Falls back to DEFAULT_PROVIDER when missing or invalid.
 */
export async function loadActiveProvider(): Promise<ProviderId> {
  const result = await chrome.storage.local.get(ACTIVE_PROVIDER_KEY);
  const value: unknown = result[ACTIVE_PROVIDER_KEY];
  if (isProviderId(value)) {
    return value;
  }
  return DEFAULT_PROVIDER;
}

export async function saveActiveProvider(provider: ProviderId): Promise<void> {
  await chrome.storage.local.set({ [ACTIVE_PROVIDER_KEY]: provider });
}

/**
 * Which providers appear in the toolbar (1–4).
 */
export async function loadEnabledProviders(): Promise<ProviderId[]> {
  const result = await chrome.storage.local.get(ENABLED_PROVIDERS_KEY);
  return normalizeEnabledProviders(result[ENABLED_PROVIDERS_KEY]);
}

export async function saveEnabledProviders(
  providers: ProviderId[]
): Promise<ProviderId[]> {
  const normalized = normalizeEnabledProviders(providers);
  await chrome.storage.local.set({ [ENABLED_PROVIDERS_KEY]: normalized });
  return normalized;
}

export async function loadOnboardingSeen(): Promise<boolean> {
  const result = await chrome.storage.local.get(ONBOARDING_SEEN_KEY);
  return result[ONBOARDING_SEEN_KEY] === true;
}

export async function saveOnboardingSeen(seen: boolean = true): Promise<void> {
  await chrome.storage.local.set({ [ONBOARDING_SEEN_KEY]: seen });
}

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh";
}

/**
 * Load the user's language preference.
 * Returns the forced locale, or `null` when following the browser language.
 */
export async function loadLocalePreference(): Promise<Locale | null> {
  const result = await chrome.storage.local.get(LOCALE_PREFERENCE_KEY);
  const value: unknown = result[LOCALE_PREFERENCE_KEY];
  if (isLocale(value)) {
    return value;
  }
  // "auto", missing, or invalid → follow browser
  return null;
}

/**
 * Persist language preference.
 * Pass `"auto"` to clear the override and follow the browser language.
 */
export async function saveLocalePreference(
  locale: Locale | "auto"
): Promise<void> {
  if (locale === "auto") {
    await chrome.storage.local.remove(LOCALE_PREFERENCE_KEY);
    return;
  }
  await chrome.storage.local.set({ [LOCALE_PREFERENCE_KEY]: locale });
}

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Load the user's theme preference.
 * Returns `"light"` | `"dark"`, or `null` when following the system
 * (`"auto"` / missing / invalid).
 */
export async function loadThemePreference(): Promise<ThemeMode | null> {
  const result = await chrome.storage.local.get(THEME_PREFERENCE_KEY);
  const value: unknown = result[THEME_PREFERENCE_KEY];
  if (isTheme(value)) {
    return value;
  }
  // "auto", missing, or invalid → follow system
  return null;
}

/**
 * Persist theme preference.
 * Pass `"auto"` to clear the override and follow the system color scheme.
 */
export async function saveThemePreference(mode: ThemeMode): Promise<void> {
  if (mode === "auto") {
    await chrome.storage.local.remove(THEME_PREFERENCE_KEY);
    return;
  }
  await chrome.storage.local.set({ [THEME_PREFERENCE_KEY]: mode });
}

/**
 * Check whether the extension action shortcut is bound.
 */
export async function checkShortcutBound(
  commandName: string = "_execute_action"
): Promise<string | null> {
  if (
    typeof chrome.commands === "undefined" ||
    typeof chrome.commands.getAll !== "function"
  ) {
    return null;
  }

  const commands = await chrome.commands.getAll();
  const match = commands.find((cmd) => cmd.name === commandName);
  if (!match) {
    return null;
  }

  const shortcut = match.shortcut?.trim() ?? "";
  return shortcut.length > 0 ? shortcut : null;
}
