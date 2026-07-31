import { useI18n } from "../i18n";

export type OverlayMode = "hidden" | "slow" | "offline" | "blocked";

export interface ErrorOverlayProps {
  mode: OverlayMode;
  providerLabel: string;
  onReload: () => void;
  onOpenOfficial: () => void;
  onDismiss?: () => void;
}

/**
 * In-frame error / degraded-state overlay (FR-20..FR-24).
 * Parent should place this inside `.frame-stage` so it does not cover the toolbar.
 */
export function ErrorOverlay({
  mode,
  providerLabel,
  onReload,
  onOpenOfficial,
  onDismiss,
}: ErrorOverlayProps) {
  const { t } = useI18n();

  if (mode === "hidden") {
    return null;
  }

  const title =
    mode === "slow"
      ? t("error.slowTitle")
      : mode === "offline"
        ? t("error.offlineTitle")
        : t("error.blockedTitle");

  const body =
    mode === "slow"
      ? t("error.slowBody", { label: providerLabel })
      : mode === "offline"
        ? t("error.offlineBody")
        : t("error.blockedBody", { label: providerLabel });

  return (
    <div
      className="error-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-overlay-title"
      aria-describedby="error-overlay-body"
    >
      <div className="error-overlay__panel">
        <h2 id="error-overlay-title" className="error-overlay__title">
          {title}
        </h2>
        <p id="error-overlay-body" className="error-overlay__body">
          {body}
        </p>
        <div className="error-overlay__actions">
          <button
            type="button"
            className="error-overlay__btn error-overlay__btn--primary"
            onClick={onReload}
          >
            {t("error.reload")}
          </button>
          <button
            type="button"
            className="error-overlay__btn"
            onClick={onOpenOfficial}
          >
            {t("error.openOfficial")}
          </button>
          {onDismiss ? (
            <button
              type="button"
              className="error-overlay__btn error-overlay__btn--ghost"
              onClick={onDismiss}
            >
              {t("error.dismiss")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
