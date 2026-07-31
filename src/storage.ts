import {
  DEFAULT_PROVIDER,
  isBuiltinProviderId,
  isProviderId,
  normalizeCustomProviders,
  normalizeEnabledProviders,
  type ProviderConfig,
  type ProviderId,
} from "./providers";
import type { Locale } from "./i18n/types";
import type { Theme, ThemeMode } from "./theme/types";

const ACTIVE_PROVIDER_KEY = "activeProvider";
const ONBOARDING_SEEN_KEY = "onboardingSeen";
const ENABLED_PROVIDERS_KEY = "enabledProviders";
const CUSTOM_PROVIDERS_KEY = "customProviders";
/** Stored language override: "en" | "zh" | "auto" (or missing = follow browser). */
const LOCALE_PREFERENCE_KEY = "localePreference";
/** Stored theme override: "light" | "dark" | "auto" (or missing = follow system). */
const THEME_PREFERENCE_KEY = "themePreference";
/** Keep AI pages warm in a background window. Default false. */
const PERSIST_SESSIONS_KEY = "persistSessions";

/**
 * Load the last active AI provider from chrome.storage.local.
 * Falls back to DEFAULT_PROVIDER when missing or invalid.
 * Custom ids are accepted as non-empty strings (caller may re-validate against enabled).
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
 * User-defined custom providers (not in the builtin catalog).
 */
export async function loadCustomProviders(): Promise<ProviderConfig[]> {
  const result = await chrome.storage.local.get(CUSTOM_PROVIDERS_KEY);
  return normalizeCustomProviders(result[CUSTOM_PROVIDERS_KEY]);
}

export async function saveCustomProviders(
  providers: ProviderConfig[]
): Promise<ProviderConfig[]> {
  const normalized = normalizeCustomProviders(providers);
  await chrome.storage.local.set({ [CUSTOM_PROVIDERS_KEY]: normalized });
  return normalized;
}

/**
 * Which providers appear in the toolbar (1–max).
 * Includes custom ids that still exist in customProviders.
 */
export async function loadEnabledProviders(): Promise<ProviderId[]> {
  const result = await chrome.storage.local.get([
    ENABLED_PROVIDERS_KEY,
    CUSTOM_PROVIDERS_KEY,
  ]);
  const customs = normalizeCustomProviders(result[CUSTOM_PROVIDERS_KEY]);
  return normalizeEnabledProviders(result[ENABLED_PROVIDERS_KEY], customs);
}

export async function saveEnabledProviders(
  providers: ProviderId[],
  customProviders?: ProviderConfig[]
): Promise<ProviderId[]> {
  const customs =
    customProviders !== undefined
      ? normalizeCustomProviders(customProviders)
      : await loadCustomProviders();
  const normalized = normalizeEnabledProviders(providers, customs);
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

/**
 * Whether to keep AI sessions warm in a background window.
 * Default false when missing or invalid.
 */
export async function loadPersistSessions(): Promise<boolean> {
  const result = await chrome.storage.local.get(PERSIST_SESSIONS_KEY);
  return result[PERSIST_SESSIONS_KEY] === true;
}

export async function savePersistSessions(value: boolean): Promise<void> {
  await chrome.storage.local.set({ [PERSIST_SESSIONS_KEY]: value });
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

/** @deprecated Prefer isBuiltinProviderId — kept for any external callers */
export { isBuiltinProviderId };
