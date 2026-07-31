import type { ProviderConfig } from "../providers";

export interface ProviderFrameProps {
  provider: ProviderConfig;
  active: boolean;
  reloadToken: number;
  onLoad: () => void;
}

/**
 * Embeds a single AI provider page in an iframe.
 * Does not use sandbox (providers need full web capabilities).
 * Does not read iframe contentDocument (CORS / privacy).
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
