export type OverlayMode = "hidden" | "slow" | "offline" | "blocked";

export interface ErrorOverlayProps {
  mode: OverlayMode;
  providerLabel: string;
  onReload: () => void;
  onOpenOfficial: () => void;
  onDismiss?: () => void;
}

const COPY: Record<
  Exclude<OverlayMode, "hidden">,
  { title: string; body: (label: string) => string }
> = {
  slow: {
    title: "加载较慢",
    body: (label) =>
      `${label} 页面加载较慢，可能受网络或嵌入限制影响。你可以继续等待，或刷新侧栏 / 在官网打开。`,
  },
  offline: {
    title: "网络已断开",
    body: () =>
      "当前设备似乎处于离线状态。请检查网络连接后刷新侧栏，或改在官网打开服务。",
  },
  blocked: {
    title: "无法在侧栏中加载",
    body: (label) =>
      `${label} 可能拒绝被嵌入，或加载失败。请尝试刷新侧栏；若仍无法使用，请在官网打开。`,
  },
};

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
  if (mode === "hidden") {
    return null;
  }

  const { title, body } = COPY[mode];

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
          {body(providerLabel)}
        </p>
        <div className="error-overlay__actions">
          <button
            type="button"
            className="error-overlay__btn error-overlay__btn--primary"
            onClick={onReload}
          >
            刷新侧栏
          </button>
          <button
            type="button"
            className="error-overlay__btn"
            onClick={onOpenOfficial}
          >
            在官网打开
          </button>
          {onDismiss ? (
            <button
              type="button"
              className="error-overlay__btn error-overlay__btn--ghost"
              onClick={onDismiss}
            >
              关闭提示
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
