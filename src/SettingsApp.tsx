import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_ENABLED_PROVIDERS,
  isBuiltinProviderId,
  normalizeCustomProviders,
  normalizeEnabledProviders,
  resolveProvider,
  type ProviderConfig,
  type ProviderId,
} from "./providers";
import {
  loadCustomProviders,
  loadEnabledProviders,
  saveCustomProviders,
  saveEnabledProviders,
} from "./storage";
import { SettingsPanel } from "./components/SettingsPanel";

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

/**
 * Full-page settings UI (options / tab page).
 * Owns provider state, persists via chrome.storage, stays in sync with the side panel.
 */
export default function SettingsApp() {
  const [enabled, setEnabled] = useState<ProviderId[]>(DEFAULT_ENABLED_PROVIDERS);
  const [customProviders, setCustomProviders] = useState<ProviderConfig[]>([]);
  const [ready, setReady] = useState(false);

  const customProvidersRef = useRef(customProviders);
  customProvidersRef.current = customProviders;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Bootstrap customs + enabled from chrome.storage.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [customs, enabledList] = await Promise.all([
        loadCustomProviders(),
        loadEnabledProviders(),
      ]);
      if (cancelled) return;
      setCustomProviders(customs);
      setEnabled(enabledList);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Stay in sync when the side panel (or another tab) updates storage.
  useEffect(() => {
    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local") return;

      if (changes.customProviders) {
        const nextCustoms = normalizeCustomProviders(
          changes.customProviders.newValue
        );
        setCustomProviders(nextCustoms);
        setEnabled((prev) => normalizeEnabledProviders(prev, nextCustoms));
      }

      if (changes.enabledProviders) {
        setCustomProviders((customs) => {
          const nextEnabled = normalizeEnabledProviders(
            changes.enabledProviders.newValue,
            customs
          );
          setEnabled(nextEnabled);
          return customs;
        });
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const handleEnabledChange = useCallback(async (nextEnabled: ProviderId[]) => {
    const customs = customProvidersRef.current;
    const prevEnabled = enabledRef.current;

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
  }, []);

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

      const customIds = new Set(savedCustoms.map((p) => p.id));
      const nextEnabled = enabledRef.current.filter(
        (id) => isBuiltinProviderId(id) || customIds.has(id)
      );
      const savedEnabled = await saveEnabledProviders(nextEnabled, savedCustoms);
      setEnabled(savedEnabled);
    },
    []
  );

  const handleClose = useCallback(() => {
    try {
      window.close();
    } catch {
      // Tab may not be script-closable; ignore.
    }
  }, []);

  if (!ready) {
    return (
      <div className="settings-page">
        <div className="settings-page__loading" aria-busy="true">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <SettingsPanel
        open
        variant="page"
        onClose={handleClose}
        enabledProviders={enabled}
        onEnabledChange={handleEnabledChange}
        customProviders={customProviders}
        onCustomProvidersChange={handleCustomProvidersChange}
      />
    </div>
  );
}
