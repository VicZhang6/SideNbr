/**
 * SettingsPanel props contract (App owns state — single source of truth):
 *
 * ```tsx
 * export interface SettingsPanelProps {
 *   open: boolean;
 *   onClose: () => void;
 *   enabledProviders: string[]; // ProviderId (builtin + custom_*)
 *   onEnabledChange: (next: string[]) => void | Promise<void>;
 *   customProviders: ProviderConfig[];
 *   onCustomProvidersChange: (next: ProviderConfig[]) => void | Promise<void>;
 *   variant?: "modal" | "page"; // default "modal"
 * }
 * ```
 *
 * Enable rules: min 1, max 4 total (builtin + custom combined).
 * Delete custom → remove from customs and from enabled via callbacks.
 *
 * Custom entries may carry an optional `icon` token
 * (`{ kind: "emoji" | "lobe", value }`) alongside optional `iconUrl`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpCircle,
  ExternalLink,
  Github,
  Keyboard,
  Languages,
  Layers,
  Layers2,
  Monitor,
  Moon,
  Plus,
  RefreshCw,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { PRODUCT_NAME, REPO_LABEL, REPO_URL } from "../constants";
import {
  DEFAULT_CUSTOM_ALLOW,
  isBuiltinProviderId,
  MAX_ENABLED_PROVIDERS,
  MIN_ENABLED_PROVIDERS,
  PROVIDER_ORDER,
  PROVIDERS,
  type ProviderConfig,
} from "../providers";
import {
  ProviderIconView,
  type ProviderIcon,
} from "../icons/providerIcons";
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
import {
  checkLatestReleaseCached,
  getInstalledVersion,
} from "../updateCheck";
import { DEFAULT_CUSTOM_ICON, IconPicker } from "./IconPicker";
import { ToastViewport, useToast } from "./Toast";

export interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  enabledProviders: string[];
  onEnabledChange: (next: string[]) => void | Promise<void>;
  customProviders: ProviderConfig[];
  onCustomProvidersChange: (next: ProviderConfig[]) => void | Promise<void>;
  /** modal = side-panel overlay (default); page = full browser tab options UI */
  variant?: "modal" | "page";
}

/** ProviderConfig plus optional picker icon token (may be persisted by App). */
type CustomProvider = ProviderConfig & { icon?: ProviderIcon };

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isValidHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function truncateUrl(url: string, max = 34): string {
  const s = url.trim();
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(1, max - 1))}…`;
}

function newCustomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Inline create (providers.createCustomProvider not always available). */
function createCustomProvider(input: {
  label: string;
  url: string;
  icon: ProviderIcon;
}): CustomProvider {
  const label = input.label.trim();
  const url = input.url.trim();
  return {
    id: newCustomId(),
    label,
    shortLabel: label.slice(0, 12) || "Custom",
    embedUrl: url,
    externalUrl: url,
    allow: DEFAULT_CUSTOM_ALLOW,
    custom: true,
    icon: input.icon,
  };
}

function readIcon(p: ProviderConfig): ProviderIcon | undefined {
  const icon = (p as CustomProvider).icon;
  if (
    icon &&
    (icon.kind === "emoji" || icon.kind === "lobe") &&
    typeof icon.value === "string" &&
    icon.value
  ) {
    return icon;
  }
  return undefined;
}

async function openExternalUrl(url: string): Promise<void> {
  try {
    await chrome.tabs.create({ url });
  } catch {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // ignore
    }
  }
}

async function openRepo(): Promise<void> {
  await openExternalUrl(REPO_URL);
}

/**
 * Settings centered modal: provider enable toggles (1–4), custom services,
 * shortcuts, open-source link.
 */
export function SettingsPanel({
  open,
  onClose,
  enabledProviders,
  onEnabledChange,
  customProviders,
  onCustomProvidersChange,
  variant = "modal",
}: SettingsPanelProps) {
  const isPage = variant === "page";
  const { t, localeMode, setLocaleMode } = useI18n();
  const { themeMode, setThemeMode } = useTheme();
  const { toasts, showToast, dismissToast } = useToast();
  const [actionShortcut, setActionShortcut] = useState<string | null>(null);
  const [commands, setCommands] = useState<CommandInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [persistSessions, setPersistSessions] = useState(false);

  const [addingCustom, setAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customIcon, setCustomIcon] =
    useState<ProviderIcon>(DEFAULT_CUSTOM_ICON);

  const [installedVersion, setInstalledVersion] = useState(() =>
    getInstalledVersion()
  );
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const unboundLabel = t("shortcut.unbound");
  const enabledSet = new Set(enabledProviders);
  const enabledCount = enabledProviders.length;

  const resetCustomForm = useCallback(() => {
    setAddingCustom(false);
    setCustomName("");
    setCustomUrl("");
    setCustomIcon(DEFAULT_CUSTOM_ICON);
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const [sc, all] = await Promise.all([
        getActionShortcut(),
        listCommands(),
      ]);
      setActionShortcut(sc);
      setCommands(all);
    } catch {
      showToast({
        message: t("settings.cannotReadShortcut"),
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }, [t, showToast]);

  useEffect(() => {
    if (!open) return;
    void refresh();
    resetCustomForm();
    setInstalledVersion(getInstalledVersion());
    setCheckingUpdate(false);
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
  }, [open, refresh, resetCustomForm]);

  useEffect(() => {
    if (!open || !addingCustom) return;
    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, addingCustom]);

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
      setPersistSessions(!next);
    }
  }, [persistSessions]);

  // Modal-only: lock body scroll, trap focus, restore previous focus.
  useEffect(() => {
    if (!open || isPage) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

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
  }, [open, isPage]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (addingCustom) {
          resetCustomForm();
          return;
        }
        onClose();
        return;
      }

      // Focus trap only for modal overlay.
      if (isPage || e.key !== "Tab" || !panelRef.current) return;

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
  }, [open, onClose, addingCustom, resetCustomForm, isPage]);

  const handleConfigure = async () => {
    setBusy(true);
    showToast({
      message: t("settings.openingShortcuts"),
      variant: "info",
    });
    const result = await openShortcutSettings();
    setBusy(false);
    if (result === "ok") {
      showToast({
        message: t("settings.openedShortcuts"),
        variant: "success",
      });
    } else {
      showToast({
        message: t("settings.cannotOpenShortcuts", { url: SHORTCUTS_URL }),
        variant: "error",
      });
    }
  };

  const handleCheckUpdate = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      // force: refresh cache so the side-panel settings badge stays in sync
      const result = await checkLatestReleaseCached({ force: true });
      if (result.status === "upToDate") {
        showToast({
          message: t("settings.upToDate"),
          variant: "success",
        });
      } else if (result.status === "updateAvailable") {
        const version =
          result.latestVersion ?? result.installedVersion;
        const releaseUrl = result.releaseUrl;
        showToast({
          message: t("settings.updateAvailable", { version }),
          variant: "warning",
          durationMs: releaseUrl ? 0 : 6000,
          action: releaseUrl
            ? {
                label: t("settings.openRelease"),
                onClick: () => {
                  void openExternalUrl(releaseUrl);
                },
              }
            : undefined,
        });
      } else {
        showToast({
          message: result.message || t("settings.updateCheckFailed"),
          variant: "error",
        });
      }
    } catch {
      showToast({
        message: t("settings.updateCheckFailed"),
        variant: "error",
      });
    } finally {
      setCheckingUpdate(false);
    }
  }, [showToast, t]);

  const toggleProvider = (id: string) => {
    const isOn = enabledSet.has(id);
    if (isOn) {
      if (enabledCount <= MIN_ENABLED_PROVIDERS) {
        showToast({
          message: t("settings.minOne", { min: MIN_ENABLED_PROVIDERS }),
          variant: "warning",
        });
        return;
      }
      void onEnabledChange(enabledProviders.filter((p) => p !== id));
      return;
    }
    if (enabledCount >= MAX_ENABLED_PROVIDERS) {
      showToast({
        message: t("settings.maxFour", { max: MAX_ENABLED_PROVIDERS }),
        variant: "warning",
      });
      return;
    }
    const nextSet = new Set([...enabledProviders, id]);
    const builtins = PROVIDER_ORDER.filter((p) => nextSet.has(p));
    const customIds: string[] = [];
    for (const p of enabledProviders) {
      if (!isBuiltinProviderId(p) && nextSet.has(p) && !customIds.includes(p)) {
        customIds.push(p);
      }
    }
    if (!isBuiltinProviderId(id) && !customIds.includes(id)) {
      customIds.push(id);
    }
    void onEnabledChange([...builtins, ...customIds]);
  };

  const handleDeleteCustom = (id: string) => {
    void onCustomProvidersChange(
      customProviders.filter((c) => c.id !== id)
    );
    if (enabledSet.has(id)) {
      void onEnabledChange(enabledProviders.filter((p) => p !== id));
    }
  };

  const handleSaveCustom = () => {
    const name = customName.trim();
    if (!name) {
      showToast({
        message: t("settings.customInvalidName"),
        variant: "error",
      });
      return;
    }
    if (!isValidHttpUrl(customUrl)) {
      showToast({
        message: t("settings.customInvalidUrl"),
        variant: "error",
      });
      return;
    }
    const created = createCustomProvider({
      label: name,
      url: customUrl,
      icon: customIcon,
    });
    void onCustomProvidersChange([
      ...customProviders,
      created as ProviderConfig,
    ]);
    resetCustomForm();
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
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      {!isPage ? (
        <button
          type="button"
          className="settings-backdrop"
          aria-label={t("settings.close")}
          onClick={onClose}
        />
      ) : null}
      <div
        ref={panelRef}
        className="settings-panel"
        role={isPage ? "region" : "dialog"}
        aria-modal={isPage ? undefined : true}
        aria-labelledby="settings-title"
      >
        <header
          className={
            isPage
              ? "settings-panel__header settings-panel__header--page"
              : "settings-panel__header"
          }
        >
          {isPage ? (
            <div className="settings-brand">
              <img
                className="settings-brand__logo"
                src={
                  typeof chrome !== "undefined" && chrome.runtime?.getURL
                    ? chrome.runtime.getURL("icons/icon-128.png")
                    : "/icons/icon-128.png"
                }
                width={72}
                height={72}
                alt={PRODUCT_NAME}
                decoding="async"
              />
              <h2 id="settings-title" className="settings-panel__title">
                {t("settings.title", { name: PRODUCT_NAME })}
              </h2>
            </div>
          ) : (
            <>
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
            </>
          )}
        </header>

        <section className="settings-section">
          <div className="settings-section__label">
            <Languages size={14} strokeWidth={2} aria-hidden />
            <span>{t("settings.language")}</span>
          </div>
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
                  {mode === "auto" ? (
                    <Monitor size={14} strokeWidth={2} aria-hidden />
                  ) : null}
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section__label">
            <Sun size={14} strokeWidth={2} aria-hidden />
            <span>{t("settings.appearance")}</span>
          </div>
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
                      <ProviderIconView config={p} size={16} />
                    </span>
                    <span className="settings-provider-list__name">
                      {p.label}
                    </span>
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
                      on ? "settings-switch is-on" : "settings-switch"
                    }
                    onClick={() => toggleProvider(id)}
                  >
                    <span className="settings-switch__knob" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="settings-section">
          <div className="settings-section__heading">
            <div className="settings-section__label">
              <Plus size={14} strokeWidth={2} aria-hidden />
              <span>{t("settings.customTitle")}</span>
            </div>
            {!addingCustom ? (
              <button
                type="button"
                className="settings-btn settings-btn--add"
                onClick={() => {
                  setAddingCustom(true);
                }}
              >
                <Plus size={14} strokeWidth={2} aria-hidden />
                {t("settings.customAdd")}
              </button>
            ) : null}
          </div>

          {customProviders.length === 0 && !addingCustom ? (
            <p className="settings-footnote settings-footnote--tight">
              {t("settings.customEmpty")}
            </p>
          ) : null}

          {customProviders.length > 0 ? (
            <ul className="settings-provider-list">
              {customProviders.map((p) => {
                const on = enabledSet.has(p.id);
                const url = p.embedUrl || p.externalUrl;
                return (
                  <li key={p.id} className="settings-provider-list__item">
                    <span className="settings-provider-list__meta settings-provider-list__meta--custom">
                      <span
                        className="settings-provider-list__icon"
                        aria-hidden
                      >
                        <ProviderIconView
                          config={p}
                          icon={readIcon(p)}
                          size={16}
                        />
                      </span>
                      <span className="settings-provider-list__text">
                        <span className="settings-provider-list__name">
                          {p.label}
                        </span>
                        <span
                          className="settings-provider-list__url"
                          title={url}
                        >
                          {truncateUrl(url)}
                        </span>
                      </span>
                    </span>
                    <span className="settings-provider-list__actions">
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
                          on ? "settings-switch is-on" : "settings-switch"
                        }
                        onClick={() => toggleProvider(p.id)}
                      >
                        <span className="settings-switch__knob" />
                      </button>
                      <button
                        type="button"
                        className="settings-icon-btn"
                        title={t("settings.customDelete")}
                        aria-label={t("settings.customDelete")}
                        onClick={() => handleDeleteCustom(p.id)}
                      >
                        <Trash2 size={14} strokeWidth={2} aria-hidden />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {addingCustom ? (
            <div className="settings-custom-form">
              <label className="settings-field">
                <span className="settings-field__label">
                  {t("settings.customName")}
                </span>
                <input
                  ref={nameInputRef}
                  type="text"
                  className="settings-field__input"
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                  }}
                  autoComplete="off"
                  maxLength={48}
                />
              </label>
              <label className="settings-field">
                <span className="settings-field__label">
                  {t("settings.customUrl")}
                </span>
                <input
                  type="url"
                  className="settings-field__input"
                  value={customUrl}
                  onChange={(e) => {
                    setCustomUrl(e.target.value);
                  }}
                  placeholder="https://"
                  autoComplete="off"
                  inputMode="url"
                />
              </label>
              <div className="settings-field">
                <span className="settings-field__label">
                  {t("settings.customIcon")}
                </span>
                <IconPicker value={customIcon} onChange={setCustomIcon} />
              </div>
              <div className="settings-actions">
                <button
                  type="button"
                  className="settings-btn settings-btn--primary"
                  onClick={handleSaveCustom}
                >
                  {t("settings.customSave")}
                </button>
                <button
                  type="button"
                  className="settings-btn"
                  onClick={resetCustomForm}
                >
                  {t("settings.customCancel")}
                </button>
              </div>
            </div>
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
                  <code>
                    {formatShortcut(c.shortcut || null, unboundLabel)}
                  </code>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="settings-section">
          <div className="settings-section__label">
            <ArrowUpCircle size={14} strokeWidth={2} aria-hidden />
            <span>{t("settings.aboutTitle")}</span>
          </div>
          <div className="settings-about-row">
            <div className="settings-about-row__meta">
              <span className="settings-about-row__label">
                {t("settings.currentVersion")}
              </span>
              <code
                className="settings-version"
                title={t("settings.version")}
              >
                {installedVersion}
              </code>
            </div>
            <button
              type="button"
              className="settings-btn"
              onClick={() => void handleCheckUpdate()}
              disabled={checkingUpdate}
            >
              <RefreshCw
                size={14}
                strokeWidth={2}
                aria-hidden
                className={checkingUpdate ? "is-spinning" : undefined}
              />
              {checkingUpdate
                ? t("settings.checkingUpdate")
                : t("settings.checkUpdate")}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section__label">
            <Github size={14} strokeWidth={2} aria-hidden />
            <span>{t("settings.openSource")}</span>
          </div>
          <button
            type="button"
            className="settings-repo-link"
            onClick={() => void openRepo()}
            title={t("settings.openRepo")}
          >
            <Github size={15} strokeWidth={2} aria-hidden />
            <span className="settings-repo-link__label">{REPO_LABEL}</span>
            <span className="settings-repo-link__badge">
              {t("settings.openSourceMit")}
            </span>
            <ExternalLink
              size={13}
              strokeWidth={2}
              className="settings-repo-link__ext"
              aria-hidden
            />
          </button>
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
