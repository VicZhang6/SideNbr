import type { ProviderId } from "../providers";
import { PROVIDERS } from "../providers";
import { ProviderBrandIcon } from "../icons/providerIcons";
import { useI18n } from "../i18n";

export interface ProviderSelectorProps {
  value: ProviderId;
  /** Enabled providers in catalog order (1–4). */
  options: ProviderId[];
  onChange: (id: ProviderId) => void;
  disabled?: boolean;
}

/**
 * Segmented ICON + Label control for switching AI providers.
 * Only renders enabled options; does not remount iframes (parent owns lifecycle).
 */
export function ProviderSelector({
  value,
  options,
  onChange,
  disabled = false,
}: ProviderSelectorProps) {
  const { t } = useI18n();

  return (
    <div
      className="provider-selector"
      role="tablist"
      aria-label={t("providerSelect.aria")}
    >
      {options.map((id) => {
        const provider = PROVIDERS[id];
        const selected = id === value;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={
              selected
                ? "provider-selector__item is-active"
                : "provider-selector__item"
            }
            disabled={disabled}
            onClick={() => onChange(id)}
            title={provider.label}
          >
            <span className="provider-selector__icon" aria-hidden>
              <ProviderBrandIcon id={id} size={15} />
            </span>
            <span className="provider-selector__label">{provider.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
