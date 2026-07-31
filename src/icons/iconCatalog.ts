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

/**
 * Lobe brand marks.
 * - `tone: "color"` — multi-color or fixed brand color (never invert)
 * - `tone: "mono"` — black/currentColor SVG; themed via `.provider-icon--mono`
 *   (light = dark ink, dark = light ink)
 */
export const LOBE_ICON_OPTIONS = [
  { id: "perplexity", label: "Perplexity", tone: "color" },
  { id: "openai", label: "OpenAI", tone: "color" }, // brand green, not inverted
  { id: "deepseek", label: "DeepSeek", tone: "color" },
  { id: "grok", label: "Grok", tone: "mono" },
  { id: "claude", label: "Claude", tone: "mono" },
  { id: "gemini", label: "Gemini", tone: "mono" },
  { id: "meta", label: "Meta", tone: "mono" },
  { id: "generic", label: "Generic", tone: "mono" },
] as const;

export type LobeIconId = (typeof LOBE_ICON_OPTIONS)[number]["id"];
export type LobeIconTone = (typeof LOBE_ICON_OPTIONS)[number]["tone"];
export type EmojiIcon = (typeof EMOJI_ICONS)[number];

const LOBE_TONE_BY_ID: Record<LobeIconId, LobeIconTone> = Object.fromEntries(
  LOBE_ICON_OPTIONS.map((o) => [o.id, o.tone])
) as Record<LobeIconId, LobeIconTone>;

/** True when the mark is a mono/black SVG that should follow light/dark ink. */
export function isMonoLobeIcon(id: string): boolean {
  return LOBE_TONE_BY_ID[id as LobeIconId] === "mono";
}
