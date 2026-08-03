/**
 * Export / import user settings for migration across unpacked installs
 * (different extension IDs do not share chrome.storage).
 */

import {
  normalizeCustomProviders,
  normalizeEnabledProviders,
  type ProviderConfig,
  type ProviderId,
} from "./providers";
import { getInstalledVersion } from "./updateCheck";

export const CONFIG_FORMAT_ID = "sidenbr-config";
export const CONFIG_FORMAT_VERSION = 1;

const KEYS = {
  activeProvider: "activeProvider",
  enabledProviders: "enabledProviders",
  customProviders: "customProviders",
  localePreference: "localePreference",
  themePreference: "themePreference",
  persistSessions: "persistSessions",
  onboardingSeen: "onboardingSeen",
} as const;

export type ConfigExportPayload = {
  format: typeof CONFIG_FORMAT_ID;
  formatVersion: number;
  exportedAt: string;
  appVersion: string;
  data: {
    activeProvider?: string;
    enabledProviders?: string[];
    customProviders?: ProviderConfig[];
    localePreference?: string;
    themePreference?: string;
    persistSessions?: boolean;
    onboardingSeen?: boolean;
  };
};

export type ImportResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "unsupported" | "empty" | "failed" };

/**
 * Read exportable settings from chrome.storage.local.
 */
export async function buildConfigExport(): Promise<ConfigExportPayload> {
  const result = await chrome.storage.local.get(Object.values(KEYS));
  const data: ConfigExportPayload["data"] = {};

  if (typeof result[KEYS.activeProvider] === "string") {
    data.activeProvider = result[KEYS.activeProvider] as string;
  }
  if (result[KEYS.enabledProviders] !== undefined) {
    data.enabledProviders = result[KEYS.enabledProviders] as string[];
  }
  if (result[KEYS.customProviders] !== undefined) {
    data.customProviders = normalizeCustomProviders(
      result[KEYS.customProviders]
    );
  }
  if (
    result[KEYS.localePreference] === "en" ||
    result[KEYS.localePreference] === "zh" ||
    result[KEYS.localePreference] === "auto"
  ) {
    data.localePreference = result[KEYS.localePreference] as string;
  }
  if (
    result[KEYS.themePreference] === "light" ||
    result[KEYS.themePreference] === "dark" ||
    result[KEYS.themePreference] === "auto"
  ) {
    data.themePreference = result[KEYS.themePreference] as string;
  }
  if (typeof result[KEYS.persistSessions] === "boolean") {
    data.persistSessions = result[KEYS.persistSessions] as boolean;
  }
  if (typeof result[KEYS.onboardingSeen] === "boolean") {
    data.onboardingSeen = result[KEYS.onboardingSeen] as boolean;
  }

  return {
    format: CONFIG_FORMAT_ID,
    formatVersion: CONFIG_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: getInstalledVersion(),
    data,
  };
}

/**
 * Trigger a JSON file download in the browser.
 */
export async function downloadConfigExport(): Promise<void> {
  const payload = await buildConfigExport();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = payload.exportedAt.slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sidenbr-config-${stamp}.json`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parsePayload(raw: unknown): ConfigExportPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (o.format !== CONFIG_FORMAT_ID) {
    return null;
  }
  if (typeof o.formatVersion !== "number" || o.formatVersion < 1) {
    return null;
  }
  if (!o.data || typeof o.data !== "object") {
    return null;
  }
  return o as ConfigExportPayload;
}

/**
 * Apply a config export file to chrome.storage.local (normalized).
 * Replaces exportable keys present in the file; does not wipe keys omitted from data.
 */
export async function importConfigFromText(
  text: string
): Promise<ImportResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const payload = parsePayload(raw);
  if (!payload) {
    return { ok: false, reason: "invalid" };
  }
  if (payload.formatVersion > CONFIG_FORMAT_VERSION) {
    return { ok: false, reason: "unsupported" };
  }

  const { data } = payload;
  const customs = normalizeCustomProviders(data.customProviders ?? []);
  const enabled = normalizeEnabledProviders(
    data.enabledProviders ?? [],
    customs
  ) as ProviderId[];

  if (
    Object.keys(data).length === 0 &&
    customs.length === 0 &&
    enabled.length === 0
  ) {
    return { ok: false, reason: "empty" };
  }

  const toSet: Record<string, unknown> = {
    [KEYS.customProviders]: customs,
    [KEYS.enabledProviders]: enabled,
  };

  if (typeof data.activeProvider === "string" && data.activeProvider) {
    const active = data.activeProvider;
    // Prefer an enabled id; else first enabled.
    toSet[KEYS.activeProvider] = enabled.includes(active as ProviderId)
      ? active
      : (enabled[0] ?? active);
  }

  if (
    data.localePreference === "en" ||
    data.localePreference === "zh" ||
    data.localePreference === "auto"
  ) {
    if (data.localePreference === "auto") {
      await chrome.storage.local.remove(KEYS.localePreference);
    } else {
      toSet[KEYS.localePreference] = data.localePreference;
    }
  }

  if (
    data.themePreference === "light" ||
    data.themePreference === "dark" ||
    data.themePreference === "auto"
  ) {
    if (data.themePreference === "auto") {
      await chrome.storage.local.remove(KEYS.themePreference);
    } else {
      toSet[KEYS.themePreference] = data.themePreference;
    }
  }

  if (typeof data.persistSessions === "boolean") {
    toSet[KEYS.persistSessions] = data.persistSessions;
  }

  if (typeof data.onboardingSeen === "boolean") {
    toSet[KEYS.onboardingSeen] = data.onboardingSeen;
  }

  try {
    await chrome.storage.local.set(toSet);
    return { ok: true };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/**
 * Read a File as text and import.
 */
export async function importConfigFromFile(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    return importConfigFromText(text);
  } catch {
    return { ok: false, reason: "failed" };
  }
}
