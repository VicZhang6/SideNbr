import { openShortcutSettings, SHORTCUTS_URL } from "../shortcuts";

const SHORTCUT_HINT =
  "可在设置中或 chrome://extensions/shortcuts 修改唤醒快捷键（macOS 建议 Command+Shift+A，Windows/Linux Alt+Shift+A）";

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
      aria-label="快捷键提示"
    >
      <p className="onboarding-tip__text">{SHORTCUT_HINT}</p>
      <p className="onboarding-tip__path">
        <code>{SHORTCUTS_URL}</code>
      </p>
      <div className="onboarding-tip__actions">
        <button
          type="button"
          className="onboarding-tip__btn"
          onClick={handleOpenShortcuts}
        >
          打开快捷键设置
        </button>
        <button
          type="button"
          className="onboarding-tip__btn onboarding-tip__btn--dismiss"
          onClick={onDismiss}
        >
          知道了
        </button>
      </div>
    </div>
  );
}
