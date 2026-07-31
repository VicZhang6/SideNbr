import { DEFAULT_PROVIDER, isProviderId, type ProviderId } from "./providers";

const ACTIVE_PROVIDER_KEY = "activeProvider";
const ONBOARDING_SEEN_KEY = "onboardingSeen";

/**
 * Load the last active AI provider from chrome.storage.local.
 * Falls back to DEFAULT_PROVIDER when missing or invalid.
 * Never reads chat content, cookies, or tokens.
 */
export async function loadActiveProvider(): Promise<ProviderId> {
  const result = await chrome.storage.local.get(ACTIVE_PROVIDER_KEY);
  const value: unknown = result[ACTIVE_PROVIDER_KEY];
  if (isProviderId(value)) {
    return value;
  }
  return DEFAULT_PROVIDER;
}

/**
 * Persist the active AI provider id only.
 */
export async function saveActiveProvider(provider: ProviderId): Promise<void> {
  await chrome.storage.local.set({ [ACTIVE_PROVIDER_KEY]: provider });
}

/**
 * Whether the first-run onboarding tip has been dismissed.
 */
export async function loadOnboardingSeen(): Promise<boolean> {
  const result = await chrome.storage.local.get(ONBOARDING_SEEN_KEY);
  return result[ONBOARDING_SEEN_KEY] === true;
}

/**
 * Mark the first-run onboarding tip as seen.
 */
export async function saveOnboardingSeen(seen: boolean = true): Promise<void> {
  await chrome.storage.local.set({ [ONBOARDING_SEEN_KEY]: seen });
}

export interface ShortcutBinding {
  /** Command name, e.g. `_execute_action` */
  name: string;
  /** Bound shortcut string, or empty if unbound */
  shortcut: string;
  description?: string;
}

/**
 * Check whether the extension action shortcut is bound.
 * Returns the shortcut string when bound, null when unbound or unavailable.
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
