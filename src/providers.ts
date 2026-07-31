export type ProviderId = "perplexity" | "chatgpt";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  embedUrl: string;
  externalUrl: string;
  allow: string;
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  perplexity: {
    id: "perplexity",
    label: "Perplexity",
    embedUrl: "https://www.perplexity.ai/sidecar",
    externalUrl: "https://www.perplexity.ai/",
    allow: "clipboard-read; clipboard-write; microphone"
  },
  chatgpt: {
    id: "chatgpt",
    label: "ChatGPT",
    embedUrl: "https://chatgpt.com/",
    externalUrl: "https://chatgpt.com/",
    allow: "clipboard-read; clipboard-write; microphone"
  }
};

export const DEFAULT_PROVIDER: ProviderId = "perplexity";

export function isProviderId(value: unknown): value is ProviderId {
  return value === "perplexity" || value === "chatgpt";
}
