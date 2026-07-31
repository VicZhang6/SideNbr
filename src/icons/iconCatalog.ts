/**
 * Icon options for custom-service picker UI.
 * Keep in sync with BrandIcons lobe components + ProviderIcon shape.
 */

export const EMOJI_ICONS = [
  "✨",
  "🤖",
  "💬",
  "🧠",
  "🌐",
  "⚡",
  "🔮",
  "🚀",
  "💡",
  "🪐",
  "🦊",
  "🐙",
  "🎯",
  "📚",
  "🛠️",
  "🌙",
] as const;

export const LOBE_ICON_OPTIONS = [
  { id: "perplexity", label: "Perplexity" },
  { id: "openai", label: "OpenAI" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "grok", label: "Grok" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
  { id: "meta", label: "Meta" },
  { id: "generic", label: "Generic" },
] as const;

export type LobeIconId = (typeof LOBE_ICON_OPTIONS)[number]["id"];
export type EmojiIcon = (typeof EMOJI_ICONS)[number];
