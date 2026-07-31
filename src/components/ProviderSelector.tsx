import { useLayoutEffect, useRef, useState } from "react";
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
 * When any label would ellipsize/truncate, hide all labels (icons only).
 */
export function ProviderSelector({
  value,
  options,
  onChange,
  disabled = false,
}: ProviderSelectorProps) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [iconsOnly, setIconsOnly] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const measure = () => {
      // Temporarily show labels so we can detect real truncation.
      root.classList.remove("provider-selector--icons-only");
      // Force layout with labels visible.
      void root.offsetWidth;

      let truncated = false;
      const labels = root.querySelectorAll<HTMLElement>(
        ".provider-selector__label"
      );
      for (const label of labels) {
        // scrollWidth > clientWidth means ellipsis would apply
        if (label.scrollWidth > label.clientWidth + 0.5) {
          truncated = true;
          break;
        }
      }

      setIconsOnly(truncated);
      if (truncated) {
        root.classList.add("provider-selector--icons-only");
      }
    };

    measure();

    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(root);

    // Fonts / locale change can alter text width
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready?.then(() => measure()).catch(() => undefined);

    return () => {
      ro.disconnect();
    };
  }, [options, value]);

  return (
    <div
      ref={rootRef}
      className={
        iconsOnly
          ? "provider-selector provider-selector--icons-only"
          : "provider-selector"
      }
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
            aria-label={provider.label}
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
