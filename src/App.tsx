import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RefreshCw, Settings } from "lucide-react";
import {
  DEFAULT_ENABLED_PROVIDERS,
  DEFAULT_PROVIDER,
  PROVIDERS,
  type ProviderId,
} from "./providers";
import {
  loadActiveProvider,
  loadEnabledProviders,
  loadOnboardingSeen,
  saveActiveProvider,
  saveEnabledProviders,
  saveOnboardingSeen,
} from "./storage";
import { useI18n } from "./i18n";
import { ProviderFrame } from "./components/ProviderFrame";
import { ProviderSelector } from "./components/ProviderSelector";
import { ErrorOverlay, type OverlayMode } from "./components/ErrorOverlay";
import { OnboardingTip } from "./components/OnboardingTip";
import { SettingsPanel } from "./components/SettingsPanel";

const SLOW_LOAD_MS = 12_000;

export default function App() {
  const { t } = useI18n();
  const [active, setActive] = useState<ProviderId>(DEFAULT_PROVIDER);
  const [enabled, setEnabled] = useState<ProviderId[]>(DEFAULT_ENABLED_PROVIDERS);
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

  // Bootstrap: restore enabled list + last provider; mount only the active one first.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [enabledList, lastActive] = await Promise.all([
        loadEnabledProviders(),
        loadActiveProvider(),
      ]);
      if (cancelled) return;

      const nextActive = enabledList.includes(lastActive)
        ? lastActive
        : enabledList[0] ?? DEFAULT_PROVIDER;

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

      const seen = await loadOnboardingSeen();
      if (!cancelled && !seen) {
        setOnboardingVisible(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
   * Settings: enable/disable providers (min 1, max 4).
   * Disabling unmounts that iframe (free memory). Enabling does not auto-mount until selected.
   */
  const handleEnabledChange = useCallback(
    async (nextEnabled: ProviderId[]) => {
      const saved = await saveEnabledProviders(nextEnabled);
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
    void chrome.tabs.create({ url: PROVIDERS[activeRef.current].externalUrl });
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

  const providerLabel = PROVIDERS[active]?.label ?? active;
  const showLoadingHint = loading && online && bootstrapped;
  // Stable order for keep-alive frames (catalog order among mounted)
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
            aria-expanded={settingsOpen}
          >
            <Settings size={15} strokeWidth={2} />
          </button>
        </div>
      </header>

      <main className="frame-stage">
        {mountedList.map((id) => (
          <ProviderFrame
            key={id}
            provider={PROVIDERS[id]}
            active={id === active}
            reloadToken={reloadToken[id] ?? 0}
            onLoad={() => handleFrameLoad(id)}
          />
        ))}

        {showLoadingHint ? (
          <div className="loading-hint" role="status" aria-live="polite">
            {t("loading")}
          </div>
        ) : null}

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
      />

      <OnboardingTip visible={onboardingVisible} onDismiss={dismissOnboarding} />
    </div>
  );
}
