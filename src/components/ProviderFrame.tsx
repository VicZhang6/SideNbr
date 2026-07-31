import type { ProviderConfig } from "../providers";

export interface ProviderFrameProps {
  provider: ProviderConfig;
  active: boolean;
  reloadToken: number;
  onLoad: () => void;
}

/**
 * Embeds a single AI provider page in an iframe.
 * - Parent must use stable key={provider.id} so switching providers does NOT remount.
 * - Only reloadToken change remounts this iframe (manual refresh).
 * - Hidden frames stay mounted (display:none) to preserve SPA session state.
 * - No sandbox; no contentDocument access.
 */
export function ProviderFrame({
  provider,
  active,
  reloadToken,
  onLoad,
}: ProviderFrameProps) {
  const className = active
    ? "provider-frame is-active"
    : "provider-frame";

  return (
    <iframe
      key={`${provider.id}-${reloadToken}`}
      className={className}
      title={provider.label}
      src={provider.embedUrl}
      allow={provider.allow}
      referrerPolicy="strict-origin-when-cross-origin"
      loading="eager"
      onLoad={onLoad}
    />
  );
}
