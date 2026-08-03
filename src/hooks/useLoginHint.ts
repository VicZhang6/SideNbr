import { useCallback, useEffect, useRef, useState } from "react";
import { MSG, parseExtensionMessage } from "../messages";
import type { ProviderId } from "../providers";

function notifyBackground(message: {
  type: string;
  providerId?: string;
  url?: string;
}): void {
  try {
    void chrome.runtime.sendMessage(message).catch(() => {});
  } catch {
    // Background may not be ready.
  }
}

/**
 * Login hint banner state driven by SW LOGIN_HINT / LOGIN_SUCCESS.
 *
 * Dismiss is per-provider for the side-panel session: switching tabs hides the
 * banner but does not re-show a provider the user already dismissed until
 * LOGIN_SUCCESS clears that dismissal (or the panel reloads).
 */
export function useLoginHint(options: {
  activeProviderId: ProviderId;
  getExternalUrl: (providerId: ProviderId) => string | null;
  onLoginSuccess: (providerId: ProviderId) => void;
}): {
  visible: boolean;
  openLoginWindow: () => void;
  dismiss: () => void;
} {
  const { activeProviderId, getExternalUrl, onLoginSuccess } = options;
  const [visible, setVisible] = useState(false);
  const dismissedRef = useRef<Set<string>>(new Set());
  const activeRef = useRef(activeProviderId);
  activeRef.current = activeProviderId;
  const onSuccessRef = useRef(onLoginSuccess);
  onSuccessRef.current = onLoginSuccess;
  const getUrlRef = useRef(getExternalUrl);
  getUrlRef.current = getExternalUrl;

  // Hide when switching providers; dismissed set is intentionally kept.
  useEffect(() => {
    setVisible(false);
  }, [activeProviderId]);

  useEffect(() => {
    const onMessage = (raw: unknown): void => {
      const msg = parseExtensionMessage(raw);
      if (!msg) {
        return;
      }

      if (msg.type === MSG.LOGIN_HINT) {
        if (msg.providerId !== activeRef.current) {
          return;
        }
        if (msg.show && dismissedRef.current.has(msg.providerId)) {
          return;
        }
        if (!msg.show) {
          dismissedRef.current.delete(msg.providerId);
        }
        setVisible(msg.show);
        return;
      }

      if (msg.type === MSG.LOGIN_SUCCESS) {
        dismissedRef.current.delete(msg.providerId);
        if (msg.providerId === activeRef.current) {
          setVisible(false);
        }
        onSuccessRef.current(msg.providerId);
      }
    };

    chrome.runtime.onMessage.addListener(onMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  const openLoginWindow = useCallback(() => {
    const id = activeRef.current;
    const url = getUrlRef.current(id);
    if (!url) {
      return;
    }
    notifyBackground({
      type: MSG.OPEN_LOGIN_WINDOW,
      providerId: id,
      url,
    });
  }, []);

  const dismiss = useCallback(() => {
    dismissedRef.current.add(activeRef.current);
    setVisible(false);
  }, []);

  return { visible, openLoginWindow, dismiss };
}
