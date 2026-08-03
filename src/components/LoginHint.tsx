import { useI18n } from "../i18n";

export interface LoginHintProps {
  providerLabel: string;
  onOpenWindow: () => void;
  onDismiss: () => void;
}

/**
 * Compact banner when the side-panel iframe looks stuck on a login page.
 */
export function LoginHint({
  providerLabel,
  onOpenWindow,
  onDismiss,
}: LoginHintProps) {
  const { t } = useI18n();
  const withLabel = (key: "login.hintTitle" | "login.hintBody") =>
    t(key).replace(/\{label\}/g, providerLabel);

  return (
    <div className="login-hint" role="status" aria-live="polite">
      <div className="login-hint__card">
        <p className="login-hint__title">{withLabel("login.hintTitle")}</p>
        <p className="login-hint__body">{withLabel("login.hintBody")}</p>
        <div className="login-hint__actions">
          <button
            type="button"
            className="error-overlay__btn error-overlay__btn--primary"
            onClick={onOpenWindow}
          >
            {t("login.openWindow")}
          </button>
          <button
            type="button"
            className="error-overlay__btn error-overlay__btn--ghost"
            onClick={onDismiss}
          >
            {t("login.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
