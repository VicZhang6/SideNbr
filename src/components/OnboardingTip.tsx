import { openShortcutSettings, SHORTCUTS_URL } from "../shortcuts";
import { useI18n } from "../i18n";

export interface OnboardingTipProps {
  visible: boolean;
  onDismiss: () => void;
  onOpenShortcuts?: () => void;
}

/**
 * First-run tip explaining that the side-panel shortcut is customizable.
 */
export function OnboardingTip({
  visible,
  onDismiss,
  onOpenShortcuts,
}: OnboardingTipProps) {
  const { t } = useI18n();

  if (!visible) {
    return null;
  }

  const handleOpenShortcuts = () => {
    if (onOpenShortcuts) {
      onOpenShortcuts();
      return;
    }
    void openShortcutSettings();
  };

  return (
    <div
      className="onboarding-tip"
      role="status"
      aria-live="polite"
      aria-label={t("onboarding.aria")}
    >
      <p className="onboarding-tip__text">{t("onboarding.hint")}</p>
      <p className="onboarding-tip__path">
        <code>{SHORTCUTS_URL}</code>
      </p>
      <div className="onboarding-tip__actions">
        <button
          type="button"
          className="onboarding-tip__btn onboarding-tip__btn--primary"
          onClick={handleOpenShortcuts}
        >
          {t("onboarding.openShortcuts")}
        </button>
        <button
          type="button"
          className="onboarding-tip__btn onboarding-tip__btn--ghost"
          onClick={onDismiss}
        >
          {t("onboarding.dismiss")}
        </button>
      </div>
    </div>
  );
}
