import { PROVIDERS, type ProviderId } from "../providers";
import { ProviderBrandIcon } from "../icons/providerIcons";

export interface ProviderSelectorProps {
  value: ProviderId;
  onChange: (id: ProviderId) => void;
  disabled?: boolean;
}

/**
 * Segmented ICON + Label control for switching AI providers.
 */
export function ProviderSelector({
  value,
  onChange,
  disabled = false,
}: ProviderSelectorProps) {
  return (
    <div
      className="provider-selector"
      role="tablist"
      aria-label="选择 AI 服务"
    >
      {Object.values(PROVIDERS).map((provider) => {
        const selected = provider.id === value;
        return (
          <button
            key={provider.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={
              selected
                ? "provider-selector__item is-active"
                : "provider-selector__item"
            }
            disabled={disabled}
            onClick={() => onChange(provider.id)}
            title={provider.label}
          >
            <span className="provider-selector__icon" aria-hidden>
              <ProviderBrandIcon id={provider.id} size={15} />
            </span>
            <span className="provider-selector__label">{provider.label}</span>
          </button>
        );
      })}
    </div>
  );
}
