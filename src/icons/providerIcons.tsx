import type { CSSProperties, ReactNode } from "react";
import {
  isBuiltinProviderId,
  type ProviderConfig,
  type ProviderIcon,
  type BuiltinProviderId,
} from "../providers";
import { isMonoLobeIcon, type LobeIconId } from "./iconCatalog";
import {
  ClaudeIcon,
  DeepSeekIcon,
  GeminiIcon,
  GenericIcon,
  GrokIcon,
  MetaIcon,
  OpenAIIcon,
  PerplexityIcon,
} from "./BrandIcons";

export type { ProviderIcon };

/** Brand green — fixed accent, not theme-inverted. */
const OPENAI_BRAND = "#10a37f";

/**
 * Wrap mono (black / currentColor) SVGs so dark mode can recolor them via CSS.
 * Color brands stay unwrapped / use fixed fills.
 */
function wrapProviderIcon(
  node: ReactNode,
  opts: { mono: boolean; size: number }
): ReactNode {
  const style: CSSProperties = {
    width: opts.size,
    height: opts.size,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    lineHeight: 0,
  };
  return (
    <span
      className={
        opts.mono
          ? "provider-icon provider-icon--mono"
          : "provider-icon provider-icon--color"
      }
      style={style}
      aria-hidden
    >
      {node}
    </span>
  );
}

function LobeBrandIcon({
  id,
  size = 16,
  title,
}: {
  id: string;
  size?: number;
  title?: string;
}): ReactNode {
  const mono = isMonoLobeIcon(id);
  let mark: ReactNode;

  switch (id as LobeIconId) {
    case "perplexity":
      mark = <PerplexityIcon size={size} title={title ?? "Perplexity"} />;
      break;
    case "openai":
      mark = (
        <OpenAIIcon
          size={size}
          title={title ?? "OpenAI"}
          style={{ color: OPENAI_BRAND }}
        />
      );
      break;
    case "deepseek":
      mark = <DeepSeekIcon size={size} title={title ?? "DeepSeek"} />;
      break;
    case "grok":
      // currentColor only — ink comes from .provider-icon--mono theme rules
      mark = <GrokIcon size={size} title={title ?? "Grok"} />;
      break;
    case "claude":
      mark = <ClaudeIcon size={size} title={title ?? "Claude"} />;
      break;
    case "gemini":
      mark = <GeminiIcon size={size} title={title ?? "Gemini"} />;
      break;
    case "meta":
      mark = <MetaIcon size={size} title={title ?? "Meta"} />;
      break;
    case "generic":
      mark = <GenericIcon size={size} title={title ?? "AI"} />;
      break;
    default:
      mark = <GenericIcon size={size} title={title ?? "AI"} />;
      break;
  }

  return wrapProviderIcon(mark, { mono, size });
}

/** Builtin provider → lobe brand mark (legacy helper). */
export function ProviderBrandIcon({
  id,
  size = 16,
}: {
  id: BuiltinProviderId | string;
  size?: number;
}): ReactNode {
  if (!isBuiltinProviderId(id)) return null;
  const lobeMap: Record<BuiltinProviderId, LobeIconId> = {
    perplexity: "perplexity",
    chatgpt: "openai",
    deepseek: "deepseek",
    grok: "grok",
  };
  return <LobeBrandIcon id={lobeMap[id]} size={size} />;
}

export type ProviderIconViewProps = {
  /** Full provider config (preferred for list/toolbar rows). */
  config?: ProviderConfig;
  /** Explicit icon token (overrides config.icon; used by icon picker). */
  icon?: ProviderIcon | null;
  id?: string;
  label?: string;
  size?: number;
};

/**
 * Icon for any provider: emoji, lobe brand, or letter fallback.
 * Accepts either a full `config` or a standalone `icon` (+ optional label).
 */
export function ProviderIconView({
  config,
  icon: iconProp,
  id: idProp,
  label: labelProp,
  size = 16,
}: ProviderIconViewProps): ReactNode {
  const icon = iconProp ?? config?.icon ?? null;
  const label = labelProp ?? config?.label;
  const id = idProp ?? config?.id;

  if (icon?.kind === "emoji" && icon.value) {
    return (
      <span
        aria-hidden
        className="provider-icon-emoji"
        style={{
          width: size,
          height: size,
          fontSize: Math.max(11, Math.round(size * 0.9)),
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        {icon.value}
      </span>
    );
  }

  if (icon?.kind === "lobe" && icon.value) {
    return <LobeBrandIcon id={icon.value} size={size} title={label} />;
  }

  if (id && isBuiltinProviderId(id)) {
    return <ProviderBrandIcon id={id} size={size} />;
  }

  const letter = (label || id || "?").charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(9, Math.round(size * 0.65)),
        fontWeight: 600,
        lineHeight: 1,
        background: "var(--surface-muted, #e5e7eb)",
        color: "var(--text-secondary, #374151)",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {letter}
    </span>
  );
}
