import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RefreshCw, Settings } from "lucide-react";
import {
  DEFAULT_ENABLED_PROVIDERS,
  DEFAULT_PROVIDER,
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
  saveOnboardingSeen,
} from "./storage";
import { MSG } from "./messages";
import { useI18n } from "./i18n";
import { openSettingsPage } from "./shortcuts";
import { ProviderFrame } from "./components/ProviderFrame";
import { ProviderSelector } from "./components/ProviderSelector";
import { ErrorOverlay, type OverlayMode } from "./components/ErrorOverlay";
import { LoadingHint } from "./components/LoadingHint";
import { OnboardingTip } from "./components/OnboardingTip";

const SLOW_LOAD_MS = 12_000;

function notifyBackground(message: Record<string, unknown>): void {
  try {
    void chrome.runtime.sendMessage(message).catch(() => {});
  } catch {
    // Background may not be ready or may lack a listener yet.
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

  const activeRef = useRef(active);
  activeRef.current = active;
  const customProvidersRef = useRef(customProviders);
  customProvidersRef.current = customProviders;

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
            className="toolbar__btn"
            onClick={openSettingsPage}
            title={t("toolbar.settings")}
            aria-label={t("toolbar.settingsOpen")}
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

      <OnboardingTip visible={onboardingVisible} onDismiss={dismissOnboarding} />
    </div>
  );
}
