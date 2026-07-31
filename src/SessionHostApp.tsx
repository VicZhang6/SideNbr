import { useEffect, useState } from "react";
import {
  DEFAULT_ENABLED_PROVIDERS,
  DEFAULT_PROVIDER,
  PROVIDERS,
  isProviderId,
  normalizeEnabledProviders,
  type ProviderId,
} from "./providers";
import { loadActiveProvider, loadEnabledProviders } from "./storage";
import { MSG } from "./messages";
import { ProviderFrame } from "./components/ProviderFrame";

/**
 * Minimal full-viewport host for background keep-alive.
 * Mounts all enabled providers immediately (warm iframes).
 * No toolbar — pure iframe stage only.
 */
export default function SessionHostApp() {
  const [active, setActive] = useState<ProviderId>(DEFAULT_PROVIDER);
  const [enabled, setEnabled] = useState<ProviderId[]>(DEFAULT_ENABLED_PROVIDERS);

  // Bootstrap from chrome.storage — mount ALL enabled for warm keep-alive.
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
        : (enabledList[0] ?? DEFAULT_PROVIDER);

      setEnabled(enabledList);
      setActive(nextActive);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // storage.onChanged: enabledProviders + activeProvider
  useEffect(() => {
    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local") return;

      if (changes.enabledProviders) {
        const nextEnabled = normalizeEnabledProviders(
          changes.enabledProviders.newValue
        );
        setEnabled(nextEnabled);
        setActive((prev) =>
          nextEnabled.includes(prev)
            ? prev
            : (nextEnabled[0] ?? DEFAULT_PROVIDER)
        );
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

  // runtime messages: SYNC_PROVIDERS { enabled, active }
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
        const nextEnabled = normalizeEnabledProviders(msg.enabled);
        setEnabled(nextEnabled);
        setActive((prev) => {
          if (isProviderId(msg.active) && nextEnabled.includes(msg.active)) {
            return msg.active;
          }
          return nextEnabled.includes(prev)
            ? prev
            : (nextEnabled[0] ?? DEFAULT_PROVIDER);
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
        {enabled.map((id) => (
          <ProviderFrame
            key={id}
            provider={PROVIDERS[id]}
            active={id === active}
            reloadToken={0}
            onLoad={() => {
              /* keep-alive host: no loading chrome */
            }}
          />
        ))}
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
