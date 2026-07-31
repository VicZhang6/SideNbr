import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Github, Keyboard, RefreshCw, X } from "lucide-react";
import { PRODUCT_NAME, REPO_LABEL, REPO_URL } from "../constants";
import {
  ACTION_COMMAND,
  formatShortcut,
  getActionShortcut,
  listCommands,
  openExtensionDetails,
  openShortcutSettings,
  SHORTCUTS_URL,
  type CommandInfo,
} from "../shortcuts";

export interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Best-effort open of the open-source repo in a new tab.
 * Prefer chrome.tabs.create; fall back to window.open.
 */
async function openRepo(): Promise<void> {
  try {
    await chrome.tabs.create({ url: REPO_URL });
  } catch {
    try {
      window.open(REPO_URL, "_blank", "noopener,noreferrer");
    } catch {
      // ignore
    }
  }
}

/**
 * Settings drawer: shortcut status + deep-link into Chrome shortcut config.
 * Uses chrome.commands + chrome:// URLs; tries private developerPrivate when available.
 */
export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [actionShortcut, setActionShortcut] = useState<string | null>(null);
  const [commands, setCommands] = useState<CommandInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const [sc, all] = await Promise.all([
        getActionShortcut(),
        listCommands(),
      ]);
      setActionShortcut(sc);
      setCommands(all);
      setStatus(null);
    } catch {
      setStatus("无法读取快捷键绑定");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();

    // Re-read when user returns from chrome://extensions/shortcuts
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleConfigure = async () => {
    setBusy(true);
    setStatus("正在打开快捷键设置…");
    const result = await openShortcutSettings();
    setBusy(false);
    if (result === "ok") {
      setStatus("已打开 Chrome 快捷键页，改完后回到侧栏会自动刷新。");
    } else {
      setStatus(`无法自动打开，请手动访问 ${SHORTCUTS_URL}`);
    }
  };

  if (!open) return null;

  return (
    <div className="settings-layer" role="presentation">
      <button
        type="button"
        className="settings-backdrop"
        aria-label="关闭设置"
        onClick={onClose}
      />
      <aside
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header className="settings-panel__header">
          <h2 id="settings-title" className="settings-panel__title">
            {PRODUCT_NAME} 设置
          </h2>
          <button
            type="button"
            className="toolbar__btn"
            onClick={onClose}
            title="关闭"
            aria-label="关闭设置"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <section className="settings-section">
          <div className="settings-section__label">
            <Keyboard size={14} strokeWidth={2} aria-hidden />
            <span>唤醒快捷键</span>
          </div>

          <div className="settings-shortcut-card">
            <div className="settings-shortcut-card__meta">
              <span className="settings-shortcut-card__name">打开 / 关闭侧栏</span>
              <code className="settings-shortcut-card__key">
                {formatShortcut(actionShortcut)}
              </code>
            </div>
            <p className="settings-shortcut-card__hint">
              命令 <code>{ACTION_COMMAND}</code>
              {actionShortcut
                ? " · 已绑定"
                : " · 当前未绑定，请到 Chrome 中设置"}
            </p>
          </div>

          <div className="settings-actions">
            <button
              type="button"
              className="settings-btn settings-btn--primary"
              onClick={() => void handleConfigure()}
              disabled={busy}
            >
              <ExternalLink size={14} strokeWidth={2} aria-hidden />
              配置快捷键
            </button>
            <button
              type="button"
              className="settings-btn"
              onClick={() => void refresh()}
              disabled={busy}
              title="刷新绑定状态"
            >
              <RefreshCw size={14} strokeWidth={2} aria-hidden />
              刷新状态
            </button>
          </div>

          {status ? (
            <p className="settings-status" role="status">
              {status}
            </p>
          ) : null}

          <p className="settings-footnote">
            Chrome 不允许扩展直接改写系统快捷键绑定，会跳转到{" "}
            <code>{SHORTCUTS_URL}</code>。私有构建会尽量用{" "}
            <code>chrome.tabs</code> / 内部 API 打开该页。
          </p>
        </section>

        {commands.length > 1 ? (
          <section className="settings-section">
            <div className="settings-section__label">全部命令</div>
            <ul className="settings-cmd-list">
              {commands.map((c) => (
                <li key={c.name} className="settings-cmd-list__item">
                  <span>{c.description || c.name}</span>
                  <code>{formatShortcut(c.shortcut || null)}</code>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="settings-section">
          <div className="settings-section__label">
            <Github size={14} strokeWidth={2} aria-hidden />
            <span>开源</span>
          </div>
          <div className="settings-repo-card">
            <div className="settings-repo-card__meta">
              <span className="settings-repo-card__name">{PRODUCT_NAME}</span>
              <span className="settings-repo-card__desc">开源 · MIT</span>
            </div>
            <button
              type="button"
              className="settings-repo-link"
              onClick={() => void openRepo()}
              title={`在新标签页打开 ${REPO_URL}`}
            >
              <Github size={15} strokeWidth={2} aria-hidden />
              <span className="settings-repo-link__label">{REPO_LABEL}</span>
              <ExternalLink
                size={13}
                strokeWidth={2}
                className="settings-repo-link__ext"
                aria-hidden
              />
            </button>
          </div>
        </section>

        <section className="settings-section settings-section--footer">
          <button
            type="button"
            className="settings-btn settings-btn--ghost"
            onClick={() => void openExtensionDetails()}
          >
            打开扩展详情页
          </button>
        </section>
      </aside>
    </div>
  );
}
