import type { LobeIconId } from "./icons/iconCatalog";

/** Built-in catalog ids (fixed set). */
export type BuiltinProviderId =
  | "perplexity"
  | "chatgpt"
  | "deepseek"
  | "grok";

/**
 * Any provider id: builtin catalog or user-defined custom (`custom_*`).
 */
export type ProviderId = string;

/** Icon descriptor for toolbar / settings (emoji or lobe brand mark). */
export type ProviderIcon =
  | { kind: "emoji"; value: string }
  | { kind: "lobe"; value: LobeIconId | string };

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  /** Short label for narrow toolbar */
  shortLabel: string;
  embedUrl: string;
  externalUrl: string;
  allow: string;
  /** Display icon (emoji or lobe brand); optional on older customs */
  icon?: ProviderIcon;
  /** True when user-defined (not in builtin catalog) */
  custom?: boolean;
}

export const DEFAULT_CUSTOM_ALLOW =
  "clipboard-read; clipboard-write; microphone";

const DEFAULT_EMOJI_ICON: ProviderIcon = { kind: "emoji", value: "✨" };

/** Fixed catalog order (also settings list order for builtins). */
export const PROVIDER_ORDER: BuiltinProviderId[] = [
  "perplexity",
  "chatgpt",
  "deepseek",
  "grok",
];

export const PROVIDERS: Record<BuiltinProviderId, ProviderConfig> = {
  perplexity: {
    id: "perplexity",
    label: "Perplexity",
    shortLabel: "Perplexity",
    embedUrl: "https://www.perplexity.ai/sidecar",
    externalUrl: "https://www.perplexity.ai/",
    allow: DEFAULT_CUSTOM_ALLOW,
    icon: { kind: "lobe", value: "perplexity" },
  },
  chatgpt: {
    id: "chatgpt",
    label: "ChatGPT",
    shortLabel: "ChatGPT",
    embedUrl: "https://chatgpt.com/",
    externalUrl: "https://chatgpt.com/",
    allow: DEFAULT_CUSTOM_ALLOW,
    icon: { kind: "lobe", value: "openai" },
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    shortLabel: "DeepSeek",
    embedUrl: "https://chat.deepseek.com/",
    externalUrl: "https://chat.deepseek.com/",
    allow: DEFAULT_CUSTOM_ALLOW,
    icon: { kind: "lobe", value: "deepseek" },
  },
  grok: {
    id: "grok",
    label: "Grok",
    shortLabel: "Grok",
    embedUrl: "https://grok.com/",
    externalUrl: "https://grok.com/",
    allow: DEFAULT_CUSTOM_ALLOW,
    icon: { kind: "lobe", value: "grok" },
  },
};

export const DEFAULT_PROVIDER: ProviderId = "perplexity";

/** Default: all four builtins enabled (user can turn off in settings; min 1). */
export const DEFAULT_ENABLED_PROVIDERS: ProviderId[] = [...PROVIDER_ORDER];

export const MIN_ENABLED_PROVIDERS = 1;
export const MAX_ENABLED_PROVIDERS = 4;

export function isBuiltinProviderId(
  value: unknown
): value is BuiltinProviderId {
  return (
    value === "perplexity" ||
    value === "chatgpt" ||
    value === "deepseek" ||
    value === "grok"
  );
}

/** Non-empty string id (builtin or custom). */
export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value.length > 0 && value.length < 128;
}

function normalizeIcon(raw: unknown): ProviderIcon {
  if (!raw || typeof raw !== "object") return DEFAULT_EMOJI_ICON;
  const o = raw as Record<string, unknown>;
  if (o.kind === "emoji" && typeof o.value === "string" && o.value.trim()) {
    return { kind: "emoji", value: o.value.trim().slice(0, 8) };
  }
  if (o.kind === "lobe" && typeof o.value === "string" && o.value.trim()) {
    return { kind: "lobe", value: o.value.trim() };
  }
  return DEFAULT_EMOJI_ICON;
}

/**
 * Resolve a provider id against the builtin catalog and custom list.
 * Builtins always win over a custom entry with the same id.
 */
export function resolveProvider(
  id: string,
  customProviders: readonly ProviderConfig[] = []
): ProviderConfig | undefined {
  if (isBuiltinProviderId(id)) {
    return PROVIDERS[id];
  }
  return customProviders.find((p) => p.id === id);
}

function newCustomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `custom_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    }
  } catch {
    // fall through
  }
  return `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a validated custom provider config.
 * Throws if name/url invalid (caller shows form error).
 */
export function createCustomProvider(input: {
  label: string;
  url: string;
  icon?: ProviderIcon;
}): ProviderConfig {
  const label = input.label.trim();
  if (!label) {
    throw new Error("invalid name");
  }

  const rawUrl = input.url.trim();
  let href: string;
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("invalid url");
    }
    href = u.href;
  } catch {
    throw new Error("invalid url");
  }

  const shortLabel = label.length > 14 ? `${label.slice(0, 13)}…` : label;

  return {
    id: newCustomId(),
    label,
    shortLabel,
    embedUrl: href,
    externalUrl: href,
    allow: DEFAULT_CUSTOM_ALLOW,
    icon: normalizeIcon(input.icon ?? DEFAULT_EMOJI_ICON),
    custom: true,
  };
}

/**
 * Validate / normalize stored custom provider configs.
 * Drops builtins, invalid URLs, and duplicates.
 */
export function normalizeCustomProviders(raw: unknown): ProviderConfig[] {
  if (!Array.isArray(raw)) return [];
  const out: ProviderConfig[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;

    const id = typeof o.id === "string" ? o.id.trim() : "";
    if (!id || isBuiltinProviderId(id) || seen.has(id) || !isProviderId(id)) {
      continue;
    }

    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!label) continue;

    const embedUrl = typeof o.embedUrl === "string" ? o.embedUrl.trim() : "";
    if (!embedUrl) continue;
    try {
      const u = new URL(embedUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:") continue;
    } catch {
      continue;
    }

    const externalRaw =
      typeof o.externalUrl === "string" ? o.externalUrl.trim() : "";
    let externalUrl = externalRaw || embedUrl;
    try {
      const u = new URL(externalUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        externalUrl = embedUrl;
      }
    } catch {
      externalUrl = embedUrl;
    }

    const shortLabel =
      typeof o.shortLabel === "string" && o.shortLabel.trim()
        ? o.shortLabel.trim()
        : label.length > 14
          ? `${label.slice(0, 13)}…`
          : label;

    const allow =
      typeof o.allow === "string" && o.allow.trim()
        ? o.allow.trim()
        : DEFAULT_CUSTOM_ALLOW;

    seen.add(id);
    out.push({
      id,
      label,
      shortLabel,
      embedUrl,
      externalUrl,
      allow,
      icon: normalizeIcon(o.icon),
      custom: true,
    });
  }

  return out;
}

/**
 * Resolve configs in the given id order (toolbar / sort UI).
 * Unknown ids are skipped.
 */
export function orderedProviders(
  ids: Iterable<ProviderId>,
  customProviders: readonly ProviderConfig[] = []
): ProviderConfig[] {
  const result: ProviderConfig[] = [];
  for (const id of ids) {
    const cfg = resolveProvider(id, customProviders);
    if (cfg) result.push(cfg);
  }
  return result;
}

/**
 * Normalize enabled list: unique known ids (builtin or listed custom),
 * **preserves user order** from storage (for toolbar sorting),
 * clamp to [min, max].
 */
export function normalizeEnabledProviders(
  raw: unknown,
  customProviders: readonly ProviderConfig[] = []
): ProviderId[] {
  const customIds = new Set(customProviders.map((p) => p.id));
  const isKnown = (id: string) =>
    isBuiltinProviderId(id) || customIds.has(id);

  const ordered: ProviderId[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string" && isKnown(item) && !seen.has(item)) {
        seen.add(item);
        ordered.push(item);
      }
    }
  }

  if (ordered.length === 0) {
    return [...DEFAULT_ENABLED_PROVIDERS];
  }

  let next = ordered;
  if (next.length > MAX_ENABLED_PROVIDERS) {
    next = next.slice(0, MAX_ENABLED_PROVIDERS);
  }
  if (next.length < MIN_ENABLED_PROVIDERS) {
    // Pad with catalog defaults without reordering existing picks.
    for (const id of DEFAULT_ENABLED_PROVIDERS) {
      if (next.length >= MIN_ENABLED_PROVIDERS) break;
      if (!seen.has(id)) {
        seen.add(id);
        next = [...next, id];
      }
    }
    if (next.length < MIN_ENABLED_PROVIDERS) {
      next = [DEFAULT_PROVIDER];
    }
  }
  return next;
}
