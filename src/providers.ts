export type ProviderId = "perplexity" | "chatgpt" | "deepseek" | "grok";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  /** Short label for narrow toolbar */
  shortLabel: string;
  embedUrl: string;
  externalUrl: string;
  allow: string;
}

/** Fixed catalog order (also settings list order). */
export const PROVIDER_ORDER: ProviderId[] = [
  "perplexity",
  "chatgpt",
  "deepseek",
  "grok",
];

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  perplexity: {
    id: "perplexity",
    label: "Perplexity",
    shortLabel: "Perplexity",
    embedUrl: "https://www.perplexity.ai/sidecar",
    externalUrl: "https://www.perplexity.ai/",
    allow: "clipboard-read; clipboard-write; microphone",
  },
  chatgpt: {
    id: "chatgpt",
    label: "ChatGPT",
    shortLabel: "ChatGPT",
    embedUrl: "https://chatgpt.com/",
    externalUrl: "https://chatgpt.com/",
    allow: "clipboard-read; clipboard-write; microphone",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    shortLabel: "DeepSeek",
    embedUrl: "https://chat.deepseek.com/",
    externalUrl: "https://chat.deepseek.com/",
    allow: "clipboard-read; clipboard-write; microphone",
  },
  grok: {
    id: "grok",
    label: "Grok",
    shortLabel: "Grok",
    embedUrl: "https://grok.com/",
    externalUrl: "https://grok.com/",
    allow: "clipboard-read; clipboard-write; microphone",
  },
};

export const DEFAULT_PROVIDER: ProviderId = "perplexity";

/** Default: all four enabled (user can turn off in settings; min 1, max 4). */
export const DEFAULT_ENABLED_PROVIDERS: ProviderId[] = [...PROVIDER_ORDER];

export const MIN_ENABLED_PROVIDERS = 1;
export const MAX_ENABLED_PROVIDERS = 4;

export function isProviderId(value: unknown): value is ProviderId {
  return (
    value === "perplexity" ||
    value === "chatgpt" ||
    value === "deepseek" ||
    value === "grok"
  );
}

export function orderedProviders(
  ids: Iterable<ProviderId>
): ProviderConfig[] {
  const set = new Set(ids);
  return PROVIDER_ORDER.filter((id) => set.has(id)).map((id) => PROVIDERS[id]);
}

/**
 * Normalize enabled list: unique, known ids, catalog order, clamp to [min, max].
 */
export function normalizeEnabledProviders(
  raw: unknown
): ProviderId[] {
  const seen = new Set<ProviderId>();
  const list: ProviderId[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (isProviderId(item) && !seen.has(item)) {
        seen.add(item);
        list.push(item);
      }
    }
  }
  // Reorder by catalog
  let ordered = PROVIDER_ORDER.filter((id) => seen.has(id));
  if (ordered.length === 0) {
    ordered = [...DEFAULT_ENABLED_PROVIDERS];
  }
  if (ordered.length > MAX_ENABLED_PROVIDERS) {
    ordered = ordered.slice(0, MAX_ENABLED_PROVIDERS);
  }
  if (ordered.length < MIN_ENABLED_PROVIDERS) {
    ordered = [DEFAULT_PROVIDER];
  }
  return ordered;
}
