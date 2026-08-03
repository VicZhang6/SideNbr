/**
 * Top-level login window flow.
 *
 * Third-party WeChat/OAuth logins often break inside the side-panel iframe
 * (top navigation blocked, storage partitioned). We open a real browser popup
 * for login, detect completion via content-script LOGIN_STATE, then tell the
 * side panel to reload its iframe.
 */

import { MSG } from "./messages";

const LOGIN_WINDOW_WIDTH = 520;
const LOGIN_WINDOW_HEIGHT = 780;

type LoginSession = {
  providerId: string;
  windowId: number;
  tabId: number;
  /** True once the popup showed a login-like UI. */
  sawLogin: boolean;
};

/** tabId → active login popup session */
const sessionsByTab = new Map<number, LoginSession>();
/** providerId → tabId (at most one login window per provider) */
const tabByProvider = new Map<string, number>();

let listenersRegistered = false;

function broadcast(message: Record<string, unknown>): void {
  try {
    void chrome.runtime.sendMessage(message).catch(() => {
      // No receiving page (side panel closed) — fine.
    });
  } catch {
    // ignore
  }
}

async function focusExistingLoginWindow(tabId: number): Promise<boolean> {
  const session = sessionsByTab.get(tabId);
  if (!session) {
    return false;
  }
  try {
    await chrome.windows.update(session.windowId, { focused: true });
    await chrome.tabs.update(tabId, { active: true });
    return true;
  } catch {
    sessionsByTab.delete(tabId);
    tabByProvider.delete(session.providerId);
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

  const existingTabId = tabByProvider.get(providerId);
  if (existingTabId != null) {
    const focused = await focusExistingLoginWindow(existingTabId);
    if (focused) {
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

    const session: LoginSession = {
      providerId,
      windowId,
      tabId,
      sawLogin: false,
    };
    sessionsByTab.set(tabId, session);
    tabByProvider.set(providerId, tabId);
    return { ok: true };
  } catch {
    return { ok: false, reason: "create-failed" };
  }
}

async function completeLoginSession(session: LoginSession): Promise<void> {
  sessionsByTab.delete(session.tabId);
  if (tabByProvider.get(session.providerId) === session.tabId) {
    tabByProvider.delete(session.providerId);
  }

  broadcast({
    type: MSG.LOGIN_SUCCESS,
    providerId: session.providerId,
  });
  // Clear side-panel hint if still showing.
  broadcast({
    type: MSG.LOGIN_HINT,
    providerId: session.providerId,
    show: false,
  });

  // Close the login popup shortly after success (hand off to side panel iframe).
  setTimeout(() => {
    void chrome.windows.remove(session.windowId).catch(() => {
      // already closed
    });
  }, 900);
}

/**
 * Content-script LOGIN_STATE handler.
 */
export function handleLoginState(message: {
  providerId?: unknown;
  isLogin?: unknown;
  topLevel?: unknown;
}, sender: chrome.runtime.MessageSender): void {
  const providerId =
    typeof message.providerId === "string" ? message.providerId : null;
  if (!providerId) {
    return;
  }
  const isLogin = message.isLogin === true;
  const topLevel = message.topLevel === true;
  const tabId = sender.tab?.id;

  if (!topLevel) {
    // Side panel (or other) iframe: surface hint only.
    broadcast({
      type: MSG.LOGIN_HINT,
      providerId,
      show: isLogin,
    });
    return;
  }

  // Top-level document — may be our login popup.
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

  // Login UI gone after we saw it → treat as success.
  if (session.sawLogin && !isLogin) {
    void completeLoginSession(session);
  }
}

function clearSessionForTab(tabId: number): void {
  const session = sessionsByTab.get(tabId);
  if (!session) {
    return;
  }
  sessionsByTab.delete(tabId);
  if (tabByProvider.get(session.providerId) === tabId) {
    tabByProvider.delete(session.providerId);
  }
}

function clearSessionForWindow(windowId: number): void {
  for (const [tabId, session] of sessionsByTab) {
    if (session.windowId === windowId) {
      sessionsByTab.delete(tabId);
      if (tabByProvider.get(session.providerId) === tabId) {
        tabByProvider.delete(session.providerId);
      }
    }
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
    clearSessionForTab(tabId);
  });

  chrome.windows.onRemoved.addListener((windowId) => {
    clearSessionForWindow(windowId);
  });
}
