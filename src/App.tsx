import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RefreshCw, Settings } from "lucide-react";
import {
  DEFAULT_ENABLED_PROVIDERS,
  DEFAULT_PROVIDER,
  isBuiltinProviderId,
  resolveProvider,
  type ProviderConfig,
  type ProviderId,
} from "./providers";
import {
  loadActiveProvider,
  loadCustomProviders,
  loadEnabledProviders,
  loadOnboardingSeen,
  loadPersistSessions,
  saveActiveProvider,
  saveCustomProviders,
  saveEnabledProviders,
  saveOnboardingSeen,
} from "./storage";
import { MSG } from "./messages";
import { useI18n } from "./i18n";
import { ProviderFrame } from "./components/ProviderFrame";
import { ProviderSelector } from "./components/ProviderSelector";
import { ErrorOverlay, type OverlayMode } from "./components/ErrorOverlay";
import { LoadingHint } from "./components/LoadingHint";
import { OnboardingTip } from "./components/OnboardingTip";
import { SettingsPanel } from "./components/SettingsPanel";

const SLOW_LOAD_MS = 12_000;

function notifyBackground(message: Record<string, unknown>): void {
  try {
    void chrome.runtime.sendMessage(message).catch(() => {});
  } catch {
    // Background may not be ready or may lack a listener yet.
  }
}

/** Request optional host permission for a custom embed URL (ignore failures). */
async function requestHostPermissionForUrl(url: string): Promise<void> {
  try {
    const origin = new URL(url).origin + "/*";
    if (
      typeof chrome.permissions === "undefined" ||
      typeof chrome.permissions.request !== "function"
    ) {
      return;
    }
    await chrome.permissions.request({ origins: [origin] });
  } catch {
    // User denied or API unavailable — iframe may still work for some hosts.
  }
}

export default function App() {
  const { t } = useI18n();
  const [active, setActive] = useState<ProviderId>(DEFAULT_PROVIDER);
  const [enabled, setEnabled] = useState<ProviderId[]>(DEFAULT_ENABLED_PROVIDERS);
  const [customProviders, setCustomProviders] = useState<ProviderConfig[]>([]);
  /** Keep-alive: once mounted, stay until provider is disabled or manual reload. */
  const [mounted, setMounted] = useState<Set<ProviderId>>(() => new Set());
  const [loaded, setLoaded] = useState<Set<ProviderId>>(() => new Set());
  const [reloadToken, setReloadToken] = useState<Partial<Record<ProviderId, number>>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [showSlowLoadHelp, setShowSlowLoadHelp] = useState(false);
  const [slowDismissed, setSlowDismissed] = useState(false);
  const [online, setOnline] = useState(
    () => (typeof navigator !== "undefined" ? navigator.onLine : true)
  );
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeRef = useRef(active);
  activeRef.current = active;
  const customProvidersRef = useRef(customProviders);
  customProvidersRef.current = customProviders;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const getProvider = useCallback(
    (id: string) => resolveProvider(id, customProviders),
    [customProviders]
  );

  // Bootstrap: restore customs + enabled + last provider; mount only the active one first.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [customs, enabledList, lastActive, persist] = await Promise.all([
        loadCustomProviders(),
        loadEnabledProviders(),
        loadActiveProvider(),
        loadPersistSessions(),
      ]);
      if (cancelled) return;

      const nextActive = enabledList.includes(lastActive)
        ? lastActive
        : enabledList[0] ?? DEFAULT_PROVIDER;

      setCustomProviders(customs);
      setEnabled(enabledList);
      setActive(nextActive);
      // Lazy mount: only the first visible provider — switch keeps others alive once opened.
      setMounted(new Set<ProviderId>([nextActive]));
      setLoaded(new Set());
      setLoading(true);
      setShowSlowLoadHelp(false);
      setSlowDismissed(false);
      setBootstrapped(true);

      if (nextActive !== lastActive) {
        void saveActiveProvider(nextActive);
      }

      // Optional session-host: warm background window when persist is enabled.
      if (persist) {
        notifyBackground({ type: MSG.ENSURE_SESSION_HOST });
        notifyBackground({
          type: MSG.SYNC_PROVIDERS,
          enabled: enabledList,
          active: nextActive,
        });
      }

      const seen = await loadOnboardingSeen();
      if (!cancelled && !seen) {
        setOnboardingVisible(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep background session-host in sync when enabled set or active provider changes.
  useEffect(() => {
    if (!bootstrapped) return;
    let cancelled = false;

    (async () => {
      const persist = await loadPersistSessions();
      if (cancelled || !persist) return;
      notifyBackground({
        type: MSG.SYNC_PROVIDERS,
        enabled,
        active,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapped, enabled, active]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!loading || !online) return;
    const timer = window.setTimeout(() => {
      setShowSlowLoadHelp(true);
    }, SLOW_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, [loading, online, active, reloadToken[active]]);

  /**
   * Switch provider: add to mounted set (never remove on switch).
   * Already-loaded providers show instantly without iframe remount.
   */
  const selectProvider = useCallback((id: ProviderId) => {
    setActive(id);

    setMounted((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    setLoaded((prevLoaded) => {
      if (prevLoaded.has(id)) {
        setLoading(false);
        setShowSlowLoadHelp(false);
      } else {
        setLoading(true);
        setShowSlowLoadHelp(false);
        setSlowDismissed(false);
      }
      return prevLoaded;
    });

    void saveActiveProvider(id);
  }, []);

  /**
   * Settings: enable/disable providers.
   * Disabling unmounts that iframe (free memory). Enabling does not auto-mount until selected.
   * On newly enabled custom URLs, request optional host permission.
   */
  const handleEnabledChange = useCallback(
    async (nextEnabled: ProviderId[]) => {
      const customs = customProvidersRef.current;
      const prevEnabled = enabledRef.current;

      // Request host access for newly enabled custom providers.
      for (const id of nextEnabled) {
        if (prevEnabled.includes(id)) continue;
        if (isBuiltinProviderId(id)) continue;
        const cfg = resolveProvider(id, customs);
        if (cfg?.embedUrl) {
          await requestHostPermissionForUrl(cfg.embedUrl);
        }
      }

      const saved = await saveEnabledProviders(nextEnabled, customs);
      setEnabled(saved);

      // Drop mounts for disabled providers (destroy only when user turns them off).
      setMounted((prev) => {
        const next = new Set<ProviderId>();
        for (const id of prev) {
          if (saved.includes(id)) next.add(id);
        }
        return next;
      });
      setLoaded((prev) => {
        const next = new Set<ProviderId>();
        for (const id of prev) {
          if (saved.includes(id)) next.add(id);
        }
        return next;
      });

      // If active was disabled, switch to first remaining without destroying others.
      if (!saved.includes(activeRef.current)) {
        const fallback = saved[0];
        if (fallback) {
          setActive(fallback);
          setMounted((prev) => {
            if (prev.has(fallback)) return prev;
            const next = new Set(prev);
            next.add(fallback);
            return next;
          });
          setLoaded((prevLoaded) => {
            if (prevLoaded.has(fallback)) {
              setLoading(false);
            } else {
              setLoading(true);
              setShowSlowLoadHelp(false);
              setSlowDismissed(false);
            }
            return prevLoaded;
          });
          void saveActiveProvider(fallback);
        }
      }
    },
    []
  );

  /**
   * Settings: create / edit / remove custom providers.
   * Requests host permission for new/changed embed URLs.
   * Prunes enabled list when a custom is removed.
   */
  const handleCustomProvidersChange = useCallback(
    async (nextCustoms: ProviderConfig[]) => {
      const prev = customProvidersRef.current;
      const prevById = new Map(prev.map((p) => [p.id, p]));

      for (const p of nextCustoms) {
        const old = prevById.get(p.id);
        if (!old || old.embedUrl !== p.embedUrl) {
          await requestHostPermissionForUrl(p.embedUrl);
        }
      }

      const savedCustoms = await saveCustomProviders(nextCustoms);
      setCustomProviders(savedCustoms);

      // Drop enabled entries for removed customs; re-normalize against new list.
      const customIds = new Set(savedCustoms.map((p) => p.id));
      const nextEnabled = enabledRef.current.filter(
        (id) => isBuiltinProviderId(id) || customIds.has(id)
      );
      const savedEnabled = await saveEnabledProviders(nextEnabled, savedCustoms);
      setEnabled(savedEnabled);

      setMounted((prevMounted) => {
        const next = new Set<ProviderId>();
        for (const id of prevMounted) {
          if (savedEnabled.includes(id)) next.add(id);
        }
        return next;
      });
      setLoaded((prevLoaded) => {
        const next = new Set<ProviderId>();
        for (const id of prevLoaded) {
          if (savedEnabled.includes(id)) next.add(id);
        }
        return next;
      });

      if (!savedEnabled.includes(activeRef.current)) {
        const fallback = savedEnabled[0];
        if (fallback) {
          setActive(fallback);
          setMounted((m) => {
            if (m.has(fallback)) return m;
            const n = new Set(m);
            n.add(fallback);
            return n;
          });
          void saveActiveProvider(fallback);
        }
      }
    },
    []
  );

  const reloadCurrent = useCallback(() => {
    const id = activeRef.current;
    setReloadToken((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + 1,
    }));
    setLoaded((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setLoading(true);
    setShowSlowLoadHelp(false);
    setSlowDismissed(false);
  }, []);

  const openOfficialSite = useCallback(() => {
    const cfg = resolveProvider(activeRef.current, customProvidersRef.current);
    const url = cfg?.externalUrl;
    if (url) {
      void chrome.tabs.create({ url });
    }
  }, []);

  const handleFrameLoad = useCallback((id: ProviderId) => {
    setLoaded((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    if (activeRef.current === id) {
      setLoading(false);
      setShowSlowLoadHelp(false);
      setSlowDismissed(false);
    }
  }, []);

  const dismissOnboarding = useCallback(() => {
    setOnboardingVisible(false);
    void saveOnboardingSeen(true);
  }, []);

  const dismissSlowHelp = useCallback(() => {
    setSlowDismissed(true);
  }, []);

  const overlayMode: OverlayMode = useMemo(() => {
    if (!online) return "offline";
    if (showSlowLoadHelp && !slowDismissed) return "slow";
    return "hidden";
  }, [online, showSlowLoadHelp, slowDismissed]);

  const activeConfig = resolveProvider(active, customProviders);
  const providerLabel = activeConfig?.label ?? active;
  const showLoadingHint = loading && online && bootstrapped;
  // Stable order for keep-alive frames (enabled order among mounted)
  const mountedList = useMemo(() => {
    return enabled.filter((id) => mounted.has(id));
  }, [enabled, mounted]);

  return (
    <div className="app">
      <header className="toolbar" role="toolbar" aria-label={t("toolbar.aria")}>
        <div className="toolbar__selector">
          <ProviderSelector
            value={active}
            options={enabled}
            getProvider={getProvider}
            onChange={selectProvider}
          />
        </div>
        <div className="toolbar__actions">
          <button
            type="button"
            className="toolbar__btn"
            onClick={reloadCurrent}
            title={t("toolbar.refresh")}
            aria-label={t("toolbar.refresh")}
          >
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="toolbar__btn"
            onClick={openOfficialSite}
            title={t("toolbar.openOfficial")}
            aria-label={t("toolbar.openOfficial")}
          >
            <ExternalLink size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={`toolbar__btn${settingsOpen ? " is-active" : ""}`}
            onClick={() => setSettingsOpen((v) => !v)}
            title={t("toolbar.settings")}
            aria-label={t("toolbar.settingsOpen")}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
          >
            <Settings size={15} strokeWidth={2} />
          </button>
        </div>
      </header>

      <main className="frame-stage">
        {mountedList.map((id) => {
          const provider = resolveProvider(id, customProviders);
          if (!provider) return null;
          return (
            <ProviderFrame
              key={id}
              provider={provider}
              active={id === active}
              reloadToken={reloadToken[id] ?? 0}
              onLoad={() => handleFrameLoad(id)}
            />
          );
        })}

        {showLoadingHint ? <LoadingHint /> : null}

        <ErrorOverlay
          mode={overlayMode}
          providerLabel={providerLabel}
          onReload={reloadCurrent}
          onOpenOfficial={openOfficialSite}
          onDismiss={overlayMode === "slow" ? dismissSlowHelp : undefined}
        />
      </main>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        enabledProviders={enabled}
        onEnabledChange={handleEnabledChange}
        customProviders={customProviders}
        onCustomProvidersChange={handleCustomProvidersChange}
      />

      <OnboardingTip visible={onboardingVisible} onDismiss={dismissOnboarding} />
    </div>
  );
}
