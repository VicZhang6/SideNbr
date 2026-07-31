import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Github,
  Keyboard,
  Languages,
  Layers,
  Layers2,
  Monitor,
  Moon,
  RefreshCw,
  Sun,
  X,
} from "lucide-react";
import { PRODUCT_NAME, REPO_LABEL, REPO_URL } from "../constants";
import {
  MAX_ENABLED_PROVIDERS,
  MIN_ENABLED_PROVIDERS,
  PROVIDER_ORDER,
  PROVIDERS,
  type ProviderId,
} from "../providers";
import { ProviderBrandIcon } from "../icons/providerIcons";
import { useI18n, type LocaleMode } from "../i18n";
import { useTheme } from "../theme";
import { loadPersistSessions, savePersistSessions } from "../storage";
import { MSG } from "../messages";
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
  enabledProviders: ProviderId[];
  onEnabledChange: (next: ProviderId[]) => void | Promise<void>;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
 * Settings centered modal: provider enable toggles (1–4), shortcuts, open-source link.
 */
export function SettingsPanel({
  open,
  onClose,
  enabledProviders,
  onEnabledChange,
}: SettingsPanelProps) {
  const { t, localeMode, setLocaleMode } = useI18n();
  const { themeMode, setThemeMode } = useTheme();
  const [actionShortcut, setActionShortcut] = useState<string | null>(null);
  const [commands, setCommands] = useState<CommandInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [toggleHint, setToggleHint] = useState<string | null>(null);
  const [persistSessions, setPersistSessions] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const unboundLabel = t("shortcut.unbound");
  const enabledSet = new Set(enabledProviders);
  const enabledCount = enabledProviders.length;

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
      setStatus(t("settings.cannotReadShortcut"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  useEffect(() => {
    if (!open) return;
    void refresh();
    setToggleHint(null);
    void loadPersistSessions().then(setPersistSessions);

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

  const togglePersistSessions = useCallback(async () => {
    const next = !persistSessions;
    setPersistSessions(next);
    try {
      await savePersistSessions(next);
      void chrome.runtime
        .sendMessage({ type: MSG.PERSIST_CHANGED, enabled: next })
        .catch(() => {});
      void chrome.runtime
        .sendMessage({
          type: next ? MSG.ENSURE_SESSION_HOST : MSG.TEARDOWN_SESSION_HOST,
        })
        .catch(() => {});
    } catch {
      // Revert UI if save failed
      setPersistSessions(!next);
    }
  }, [persistSessions]);

  // Body scroll lock + focus open/restore while modal is open
  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus close button (or first focusable) after paint
    const focusTimer = window.setTimeout(() => {
      const target =
        closeBtnRef.current ??
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
        null;
      target?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function") {
        prev.focus();
      }
      previousFocusRef.current = null;
    };
  }, [open]);

  // Escape to close + simple Tab focus trap within dialog
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panelRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleConfigure = async () => {
    setBusy(true);
    setStatus(t("settings.openingShortcuts"));
    const result = await openShortcutSettings();
    setBusy(false);
    if (result === "ok") {
      setStatus(t("settings.openedShortcuts"));
    } else {
      setStatus(t("settings.cannotOpenShortcuts", { url: SHORTCUTS_URL }));
    }
  };

  const toggleProvider = (id: ProviderId) => {
    const isOn = enabledSet.has(id);
    if (isOn) {
      if (enabledCount <= MIN_ENABLED_PROVIDERS) {
        setToggleHint(
          t("settings.minOne", { min: MIN_ENABLED_PROVIDERS })
        );
        return;
      }
      const next = enabledProviders.filter((p) => p !== id);
      setToggleHint(null);
      void onEnabledChange(next);
      return;
    }
    if (enabledCount >= MAX_ENABLED_PROVIDERS) {
      setToggleHint(
        t("settings.maxFour", { max: MAX_ENABLED_PROVIDERS })
      );
      return;
    }
    // Preserve catalog order when enabling
    const next = PROVIDER_ORDER.filter(
      (p) => p === id || enabledSet.has(p)
    );
    setToggleHint(null);
    void onEnabledChange(next);
  };

  if (!open) return null;

  const langOptions: { mode: LocaleMode; label: string }[] = [
    { mode: "auto", label: t("settings.langAuto") },
    { mode: "en", label: t("settings.langEn") },
    { mode: "zh", label: t("settings.langZh") },
  ];

  const themeOptions: {
    mode: "auto" | "light" | "dark";
    label: string;
    icon: typeof Monitor;
  }[] = [
    { mode: "auto", label: t("settings.themeAuto"), icon: Monitor },
    { mode: "light", label: t("settings.themeLight"), icon: Sun },
    { mode: "dark", label: t("settings.themeDark"), icon: Moon },
  ];

  return (
    <div className="settings-layer" role="presentation">
      <button
        type="button"
        className="settings-backdrop"
        aria-label={t("settings.close")}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header className="settings-panel__header">
          <h2 id="settings-title" className="settings-panel__title">
            {t("settings.title", { name: PRODUCT_NAME })}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="toolbar__btn"
            onClick={onClose}
            title={t("settings.close")}
            aria-label={t("settings.close")}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <section className="settings-section">
          <div className="settings-section__label">
            <Languages size={14} strokeWidth={2} aria-hidden />
            <span>{t("settings.language")}</span>
          </div>
          <p className="settings-footnote settings-footnote--tight">
            {t("settings.languageHelp")}
          </p>
          <div
            className="settings-actions"
            role="radiogroup"
            aria-label={t("settings.language")}
          >
            {langOptions.map(({ mode, label }) => {
              const selected = localeMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={
                    selected
                      ? "settings-btn settings-btn--primary"
                      : "settings-btn"
                  }
                  onClick={() => setLocaleMode(mode)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section__label">
            <Monitor size={14} strokeWidth={2} aria-hidden />
            <span>{t("settings.appearance")}</span>
          </div>
          <p className="settings-footnote settings-footnote--tight">
            {t("settings.appearanceHelp")}
          </p>
          <div
            className="settings-actions"
            role="radiogroup"
            aria-label={t("settings.appearance")}
          >
            {themeOptions.map(({ mode, label, icon: Icon }) => {
              const selected = themeMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={
                    selected
                      ? "settings-btn settings-btn--primary"
                      : "settings-btn"
                  }
                  onClick={() => setThemeMode(mode)}
                >
                  <Icon size={14} strokeWidth={2} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section__label">
            <Layers size={14} strokeWidth={2} aria-hidden />
            <span>{t("settings.providersTitle")}</span>
          </div>
          <p className="settings-footnote settings-footnote--tight">
            {t("settings.providersHelp", {
              min: MIN_ENABLED_PROVIDERS,
              max: MAX_ENABLED_PROVIDERS,
              count: enabledCount,
            })}
          </p>
          <ul className="settings-provider-list">
            {PROVIDER_ORDER.map((id) => {
              const on = enabledSet.has(id);
              const p = PROVIDERS[id];
              return (
                <li key={id} className="settings-provider-list__item">
                  <span className="settings-provider-list__meta">
                    <span className="settings-provider-list__icon" aria-hidden>
                      <ProviderBrandIcon id={id} size={16} />
                    </span>
                    <span className="settings-provider-list__name">{p.label}</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={
                      on
                        ? t("settings.disable", { label: p.label })
                        : t("settings.enable", { label: p.label })
                    }
                    className={
                      on
                        ? "settings-switch is-on"
                        : "settings-switch"
                    }
                    onClick={() => toggleProvider(id)}
                  >
                    <span className="settings-switch__knob" />
                  </button>
                </li>
              );
            })}
          </ul>
          {toggleHint ? (
            <p className="settings-status" role="status">
              {toggleHint}
            </p>
          ) : null}
        </section>

        <section className="settings-section">
          <div className="settings-section__label">
            <Layers2 size={14} strokeWidth={2} aria-hidden />
            <span>{t("settings.persistTitle")}</span>
          </div>
          <p className="settings-footnote settings-footnote--tight">
            {t("settings.persistHelp")}
          </p>
          <ul className="settings-provider-list">
            <li className="settings-provider-list__item">
              <span className="settings-provider-list__meta">
                <span className="settings-provider-list__name">
                  {persistSessions
                    ? t("settings.persistOn")
                    : t("settings.persistOff")}
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={persistSessions}
                aria-label={t("settings.persistTitle")}
                className={
                  persistSessions
                    ? "settings-switch is-on"
                    : "settings-switch"
                }
                onClick={() => void togglePersistSessions()}
              >
                <span className="settings-switch__knob" />
              </button>
            </li>
          </ul>
          <p className="settings-footnote">{t("settings.persistWarning")}</p>
        </section>

        <section className="settings-section">
          <div className="settings-section__label">
            <Keyboard size={14} strokeWidth={2} aria-hidden />
            <span>{t("settings.shortcutTitle")}</span>
          </div>

          <div className="settings-shortcut-card">
            <div className="settings-shortcut-card__meta">
              <span className="settings-shortcut-card__name">
                {t("settings.toggleSidepanel")}
              </span>
              <code className="settings-shortcut-card__key">
                {formatShortcut(actionShortcut, unboundLabel)}
              </code>
            </div>
            <p className="settings-shortcut-card__hint">
              {t("settings.command")} <code>{ACTION_COMMAND}</code>
              {" · "}
              {actionShortcut ? t("settings.bound") : t("settings.unbound")}
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
              {t("settings.configureShortcut")}
            </button>
            <button
              type="button"
              className="settings-btn"
              onClick={() => void refresh()}
              disabled={busy}
              title={t("settings.refreshStatus")}
            >
              <RefreshCw size={14} strokeWidth={2} aria-hidden />
              {t("settings.refreshStatus")}
            </button>
          </div>

          {status ? (
            <p className="settings-status" role="status">
              {status}
            </p>
          ) : null}

          <p className="settings-footnote">{t("settings.shortcutFootnote")}</p>
        </section>

        {commands.length > 1 ? (
          <section className="settings-section">
            <div className="settings-section__label">
              {t("settings.allCommands")}
            </div>
            <ul className="settings-cmd-list">
              {commands.map((c) => (
                <li key={c.name} className="settings-cmd-list__item">
                  <span>{c.description || c.name}</span>
                  <code>{formatShortcut(c.shortcut || null, unboundLabel)}</code>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="settings-section">
          <div className="settings-section__label">
            <Github size={14} strokeWidth={2} aria-hidden />
            <span>{t("settings.openSource")}</span>
          </div>
          <div className="settings-repo-card">
            <div className="settings-repo-card__meta">
              <span className="settings-repo-card__name">{PRODUCT_NAME}</span>
              <span className="settings-repo-card__desc">
                {t("settings.openSourceMit")}
              </span>
            </div>
            <button
              type="button"
              className="settings-repo-link"
              onClick={() => void openRepo()}
              title={t("settings.openRepo")}
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
            {t("settings.openExtensionDetails")}
          </button>
        </section>
      </div>
    </div>
  );
}
