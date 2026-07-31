import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RefreshCw, Settings } from "lucide-react";
import { DEFAULT_PROVIDER, PROVIDERS, type ProviderId } from "./providers";
import {
  loadActiveProvider,
  loadOnboardingSeen,
  saveActiveProvider,
  saveOnboardingSeen,
} from "./storage";
import { ProviderFrame } from "./components/ProviderFrame";
import { ProviderSelector } from "./components/ProviderSelector";
import { ErrorOverlay, type OverlayMode } from "./components/ErrorOverlay";
import { OnboardingTip } from "./components/OnboardingTip";
import { SettingsPanel } from "./components/SettingsPanel";

const SLOW_LOAD_MS = 12_000;

export default function App() {
  const [active, setActive] = useState<ProviderId>(DEFAULT_PROVIDER);
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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const provider = await loadActiveProvider();
      if (cancelled) return;

      setActive(provider);
      setMounted(new Set<ProviderId>([provider]));
      setLoaded(new Set());
      setLoading(true);
      setShowSlowLoadHelp(false);
      setSlowDismissed(false);
      setBootstrapped(true);

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
    if (!loading || !online) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowSlowLoadHelp(true);
    }, SLOW_LOAD_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loading, online, active, reloadToken[active]]);

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

  const providerLabel = PROVIDERS[active].label;
  const showLoadingHint = loading && online && bootstrapped;
  const mountedList = useMemo(() => Array.from(mounted), [mounted]);

  return (
    <div className="app">
      <header className="toolbar" role="toolbar" aria-label="AI 服务工具栏">
        <div className="toolbar__selector">
          <ProviderSelector value={active} onChange={selectProvider} />
        </div>
        <div className="toolbar__actions">
          <button
            type="button"
            className="toolbar__btn"
            onClick={reloadCurrent}
            title="刷新当前服务"
            aria-label="刷新当前服务"
          >
            <RefreshCw size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="toolbar__btn"
            onClick={openOfficialSite}
            title="在官网打开"
            aria-label="在官网打开"
          >
            <ExternalLink size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={`toolbar__btn${settingsOpen ? " is-active" : ""}`}
            onClick={() => setSettingsOpen((v) => !v)}
            title="设置"
            aria-label="打开设置"
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
            正在加载…
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
      />

      <OnboardingTip visible={onboardingVisible} onDismiss={dismissOnboarding} />
    </div>
  );
}
