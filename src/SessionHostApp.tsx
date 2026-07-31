import { useEffect, useState } from "react";
import {
  DEFAULT_ENABLED_PROVIDERS,
  DEFAULT_PROVIDER,
  isProviderId,
  normalizeCustomProviders,
  normalizeEnabledProviders,
  resolveProvider,
  type ProviderConfig,
  type ProviderId,
} from "./providers";
import {
  loadActiveProvider,
  loadCustomProviders,
  loadEnabledProviders,
} from "./storage";
import { MSG } from "./messages";
import { ProviderFrame } from "./components/ProviderFrame";

/**
 * Minimal full-viewport host for background keep-alive.
 * Mounts all enabled providers immediately (warm iframes), including customs.
 * No toolbar — pure iframe stage only.
 */
export default function SessionHostApp() {
  const [active, setActive] = useState<ProviderId>(DEFAULT_PROVIDER);
  const [enabled, setEnabled] = useState<ProviderId[]>(DEFAULT_ENABLED_PROVIDERS);
  const [customProviders, setCustomProviders] = useState<ProviderConfig[]>([]);

  // Bootstrap from chrome.storage — mount ALL enabled for warm keep-alive.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [customs, enabledList, lastActive] = await Promise.all([
        loadCustomProviders(),
        loadEnabledProviders(),
        loadActiveProvider(),
      ]);
      if (cancelled) return;

      const nextActive = enabledList.includes(lastActive)
        ? lastActive
        : (enabledList[0] ?? DEFAULT_PROVIDER);

      setCustomProviders(customs);
      setEnabled(enabledList);
      setActive(nextActive);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // storage.onChanged: customProviders + enabledProviders + activeProvider
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
        setEnabled((prev) => {
          const nextEnabled = normalizeEnabledProviders(prev, nextCustoms);
          setActive((prevActive) =>
            nextEnabled.includes(prevActive)
              ? prevActive
              : (nextEnabled[0] ?? DEFAULT_PROVIDER)
          );
          return nextEnabled;
        });
      }

      if (changes.enabledProviders) {
        setCustomProviders((customs) => {
          const nextEnabled = normalizeEnabledProviders(
            changes.enabledProviders.newValue,
            customs
          );
          setEnabled(nextEnabled);
          setActive((prev) =>
            nextEnabled.includes(prev)
              ? prev
              : (nextEnabled[0] ?? DEFAULT_PROVIDER)
          );
          return customs;
        });
      }

      if (changes.activeProvider) {
        const value: unknown = changes.activeProvider.newValue;
        if (isProviderId(value)) {
          setActive(value);
        }
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  // runtime messages: SYNC_PROVIDERS { enabled, active } — string ids
  useEffect(() => {
    const onMessage = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: unknown) => void
    ): boolean | void => {
      if (!message || typeof message !== "object") return;

      const msg = message as {
        type?: string;
        enabled?: unknown;
        active?: unknown;
      };

      if (msg.type !== MSG.SYNC_PROVIDERS) return;

      if (msg.enabled !== undefined) {
        setCustomProviders((customs) => {
          const nextEnabled = normalizeEnabledProviders(msg.enabled, customs);
          setEnabled(nextEnabled);
          setActive((prev) => {
            if (isProviderId(msg.active) && nextEnabled.includes(msg.active)) {
              return msg.active;
            }
            return nextEnabled.includes(prev)
              ? prev
              : (nextEnabled[0] ?? DEFAULT_PROVIDER);
          });
          return customs;
        });
      } else if (isProviderId(msg.active)) {
        setActive(msg.active);
      }
    };

    chrome.runtime.onMessage.addListener(onMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  return (
    <div className="app session-host-app">
      <main className="frame-stage" aria-label="SideNbr background session host">
        {enabled.map((id) => {
          const provider = resolveProvider(id, customProviders);
          if (!provider) return null;
          return (
            <ProviderFrame
              key={id}
              provider={provider}
              active={id === active}
              reloadToken={0}
              onLoad={() => {
                /* keep-alive host: no loading chrome */
              }}
            />
          );
        })}
      </main>

      <div
        className="session-host-badge"
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 6,
          right: 8,
          zIndex: 100,
          fontSize: 10,
          lineHeight: 1.2,
          opacity: 0.35,
          color: "var(--text-muted, #6b7280)",
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        SideNbr · background
      </div>
    </div>
  );
}
