import { EMOJI_ICONS, LOBE_ICON_OPTIONS } from "../icons/iconCatalog";
import {
  ProviderIconView,
  type ProviderIcon,
} from "../icons/providerIcons";
import { useI18n } from "../i18n";

export type { ProviderIcon };

export type IconPickerProps = {
  value: ProviderIcon;
  onChange: (icon: ProviderIcon) => void;
};

export const DEFAULT_CUSTOM_ICON: ProviderIcon = {
  kind: "emoji",
  value: EMOJI_ICONS[0],
};

function sameIcon(a: ProviderIcon, b: ProviderIcon): boolean {
  return a.kind === b.kind && a.value === b.value;
}

/**
 * Compact emoji + brand-icon picker for custom AI services.
 */
export function IconPicker({ value, onChange }: IconPickerProps) {
  const { t } = useI18n();

  return (
    <div className="icon-picker">
      <div className="icon-picker__group">
        <div className="icon-picker__group-label">{t("settings.emoji")}</div>
        <div
          className="icon-picker__grid"
          role="listbox"
          aria-label={t("settings.emoji")}
        >
          {EMOJI_ICONS.map((emoji) => {
            const option: ProviderIcon = { kind: "emoji", value: emoji };
            const selected = sameIcon(value, option);
            return (
              <button
                key={emoji}
                type="button"
                role="option"
                aria-selected={selected}
                className={
                  selected
                    ? "icon-picker__btn is-selected"
                    : "icon-picker__btn"
                }
                onClick={() => onChange(option)}
                title={emoji}
              >
                <span className="icon-picker__emoji" aria-hidden>
                  {emoji}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="icon-picker__group">
        <div className="icon-picker__group-label">
          {t("settings.brandIcons")}
        </div>
        <div
          className="icon-picker__grid"
          role="listbox"
          aria-label={t("settings.brandIcons")}
        >
          {LOBE_ICON_OPTIONS.map(({ id, label }) => {
            const option: ProviderIcon = { kind: "lobe", value: id };
            const selected = sameIcon(value, option);
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={selected}
                className={
                  selected
                    ? "icon-picker__btn is-selected"
                    : "icon-picker__btn"
                }
                onClick={() => onChange(option)}
                title={label}
                aria-label={label}
              >
                <ProviderIconView icon={option} label={label} size={16} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
