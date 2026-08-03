export interface LoginHintProps {
  providerLabel: string;
  onOpenWindow: () => void;
  onDismiss: () => void;
  title: string;
  body: string;
  openLabel: string;
  dismissLabel: string;
}

/**
 * Compact banner when the side-panel iframe looks stuck on a login page.
 */
export function LoginHint({
  providerLabel,
  onOpenWindow,
  onDismiss,
  title,
  body,
  openLabel,
  dismissLabel,
}: LoginHintProps) {
  return (
    <div className="login-hint" role="status" aria-live="polite">
      <div className="login-hint__card">
        <p className="login-hint__title">{title}</p>
        <p className="login-hint__body">
          {body.replace(/\{label\}/g, providerLabel)}
        </p>
        <div className="login-hint__actions">
          <button
            type="button"
            className="error-overlay__btn error-overlay__btn--primary"
            onClick={onOpenWindow}
          >
            {openLabel}
          </button>
          <button
            type="button"
            className="error-overlay__btn error-overlay__btn--ghost"
            onClick={onDismiss}
          >
            {dismissLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
