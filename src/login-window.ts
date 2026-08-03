/**
 * Top-level login window flow.
 *
 * WeChat/OAuth often cannot finish inside the side-panel iframe. Open a real
 * browser popup, use content-script LOGIN_STATE for hints + best-effort
 * completion, then tell the side panel to reload its iframe.
 *
 * Completion is best-effort (DOM/URL heuristics). Users can always dismiss
 * the hint and refresh manually.
 */

import {
  MSG,
  broadcastExtensionMessage,
  type LoginStateMessage,
} from "./messages";

const LOGIN_WINDOW_WIDTH = 520;
const LOGIN_WINDOW_HEIGHT = 780;
/** Delay before closing popup after success so the SPA can settle. */
const CLOSE_AFTER_SUCCESS_MS = 900;

type LoginSession = {
  providerId: string;
  windowId: number;
  tabId: number;
  /** True once the popup showed a login-like UI. */
  sawLogin: boolean;
};

/** Single index: tabId → session (login windows are few). */
const sessionsByTab = new Map<number, LoginSession>();

let listenersRegistered = false;

function findSessionByProvider(providerId: string): LoginSession | null {
  for (const session of sessionsByTab.values()) {
    if (session.providerId === providerId) {
      return session;
    }
  }
  return null;
}

function removeSession(session: LoginSession): void {
  sessionsByTab.delete(session.tabId);
}

async function focusSession(session: LoginSession): Promise<boolean> {
  try {
    await chrome.windows.update(session.windowId, { focused: true });
    await chrome.tabs.update(session.tabId, { active: true });
    return true;
  } catch {
    removeSession(session);
    return false;
  }
}

/**
 * Open (or focus) a top-level popup for provider login.
 */
export async function openLoginWindow(
  providerId: string,
  url: string
): Promise<{ ok: boolean; reason?: string }> {
  if (!providerId || !url || !/^https?:\/\//i.test(url)) {
    return { ok: false, reason: "invalid" };
  }

  const existing = findSessionByProvider(providerId);
  if (existing) {
    if (await focusSession(existing)) {
      return { ok: true };
    }
  }

  try {
    const win = await chrome.windows.create({
      url,
      type: "popup",
      width: LOGIN_WINDOW_WIDTH,
      height: LOGIN_WINDOW_HEIGHT,
      focused: true,
    });

    const windowId = win?.id;
    const tabId = win?.tabs?.[0]?.id;
    if (windowId == null || tabId == null) {
      return { ok: false, reason: "create-failed" };
    }

    sessionsByTab.set(tabId, {
      providerId,
      windowId,
      tabId,
      sawLogin: false,
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "create-failed" };
  }
}

function completeLoginSession(session: LoginSession): void {
  removeSession(session);

  broadcastExtensionMessage({
    type: MSG.LOGIN_SUCCESS,
    providerId: session.providerId,
  });
  broadcastExtensionMessage({
    type: MSG.LOGIN_HINT,
    providerId: session.providerId,
    show: false,
  });

  setTimeout(() => {
    void chrome.windows.remove(session.windowId).catch(() => {
      // already closed
    });
  }, CLOSE_AFTER_SUCCESS_MS);
}

/**
 * Content-script LOGIN_STATE handler (typed).
 */
export function handleLoginState(
  message: LoginStateMessage,
  sender: chrome.runtime.MessageSender
): void {
  const { providerId, isLogin, topLevel } = message;
  const tabId = sender.tab?.id;

  // Nested frame (side panel iframe, session-host iframe): surface hint only.
  if (!topLevel) {
    broadcastExtensionMessage({
      type: MSG.LOGIN_HINT,
      providerId,
      show: isLogin,
    });
    return;
  }

  // Top-level — only act if this tab is our login popup.
  if (tabId == null) {
    return;
  }
  const session = sessionsByTab.get(tabId);
  if (!session || session.providerId !== providerId) {
    return;
  }

  if (isLogin) {
    session.sawLogin = true;
    return;
  }

  // Login UI gone after we saw it → best-effort success.
  if (session.sawLogin) {
    completeLoginSession(session);
  }
}

/**
 * Register tab/window cleanup once.
 */
export function registerLoginWindowLifecycle(): void {
  if (listenersRegistered) {
    return;
  }
  listenersRegistered = true;

  chrome.tabs.onRemoved.addListener((tabId) => {
    sessionsByTab.delete(tabId);
  });

  chrome.windows.onRemoved.addListener((windowId) => {
    for (const [tabId, session] of sessionsByTab) {
      if (session.windowId === windowId) {
        sessionsByTab.delete(tabId);
      }
    }
  });
}
