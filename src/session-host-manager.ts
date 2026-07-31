/**
 * Session host window lifecycle (persist mode).
 *
 * When persistSessions is true, keeps a single popup window loading
 * session-host.html warm (prefer minimized). Survives SW restarts via
 * chrome.storage.session + windows.get rehydrate.
 */

import { MSG } from "./messages";

export { MSG };
export type SessionHostMessageType = (typeof MSG)[keyof typeof MSG];

const HOST_PATH = "session-host.html";
const WINDOW_ID_KEY = "sessionHostWindowId";
const PERSIST_SESSIONS_KEY = "persistSessions";
const RECREATE_DELAY_MS = 300;
const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 720;

let cachedWindowId: number | null = null;
let listenersRegistered = false;
let recreateTimer: ReturnType<typeof setTimeout> | null = null;
/** When true, onRemoved must not re-warm (intentional close). */
let tearingDown = false;

function hostUrl(): string {
  return chrome.runtime.getURL(HOST_PATH);
}

export async function getPersistEnabled(): Promise<boolean> {
  const result = await chrome.storage.local.get(PERSIST_SESSIONS_KEY);
  return result[PERSIST_SESSIONS_KEY] === true;
}

async function setStoredWindowId(id: number | null): Promise<void> {
  cachedWindowId = id;
  try {
    if (id == null) {
      await chrome.storage.session.remove(WINDOW_ID_KEY);
    } else {
      await chrome.storage.session.set({ [WINDOW_ID_KEY]: id });
    }
  } catch {
    // session storage unavailable — module cache still used
  }
}

async function getStoredWindowId(): Promise<number | null> {
  if (cachedWindowId != null) {
    return cachedWindowId;
  }
  try {
    const result = await chrome.storage.session.get(WINDOW_ID_KEY);
    const id: unknown = result[WINDOW_ID_KEY];
    if (typeof id === "number" && Number.isFinite(id)) {
      cachedWindowId = id;
      return id;
    }
  } catch {
    // ignore
  }
  return null;
}

async function windowExists(
  id: number
): Promise<chrome.windows.Window | null> {
  try {
    return await chrome.windows.get(id);
  } catch {
    return null;
  }
}

/**
 * Resolve a live host window id from cache / session storage.
 */
async function resolveHostWindowId(): Promise<number | null> {
  const stored = await getStoredWindowId();
  if (stored == null) {
    return null;
  }
  const win = await windowExists(stored);
  if (win) {
    return stored;
  }
  await setStoredWindowId(null);
  return null;
}

async function createHostWindow(minimized: boolean): Promise<number | null> {
  const url = hostUrl();

  const applyMinimized = async (id: number): Promise<void> => {
    try {
      await chrome.windows.update(id, { state: "minimized", focused: false });
    } catch {
      // Platform may not support minimized popup; leave as created.
    }
  };

  try {
    let win: chrome.windows.Window | undefined;

    if (minimized) {
      try {
        win = await chrome.windows.create({
          url,
          type: "popup",
          focused: false,
          state: "minimized",
          width: DEFAULT_WIDTH,
          height: DEFAULT_HEIGHT,
        });
      } catch {
        // Some platforms reject state: "minimized" on create — fall back.
        win = await chrome.windows.create({
          url,
          type: "popup",
          focused: false,
          width: DEFAULT_WIDTH,
          height: DEFAULT_HEIGHT,
        });
        if (win?.id != null) {
          await applyMinimized(win.id);
        }
      }
    } else {
      win = await chrome.windows.create({
        url,
        type: "popup",
        focused: true,
        state: "normal",
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
      });
    }

    if (win?.id == null) {
      return null;
    }
    await setStoredWindowId(win.id);
    return win.id;
  } catch {
    return null;
  }
}

/**
 * Ensure a single session-host popup exists.
 * Prefer minimized when first creating (warm keep-alive).
 * If already open, leave state alone (user may have focused it).
 */
export async function ensureSessionHost(): Promise<number | null> {
  const existing = await resolveHostWindowId();
  if (existing != null) {
    return existing;
  }
  return createHostWindow(true);
}

/**
 * Close the host window and clear stored id. Suppresses re-warm briefly.
 */
export async function teardownSessionHost(): Promise<void> {
  tearingDown = true;
  if (recreateTimer != null) {
    clearTimeout(recreateTimer);
    recreateTimer = null;
  }

  const id = await resolveHostWindowId();
  if (id != null) {
    try {
      await chrome.windows.remove(id);
    } catch {
      // already closed
    }
  }
  await setStoredWindowId(null);

  // Allow onRemoved-driven re-warm again after intentional teardown settles.
  setTimeout(() => {
    tearingDown = false;
  }, RECREATE_DELAY_MS + 50);
}

/**
 * Toggle host visibility: show normal+focused vs minimize.
 * Creates the host if missing (shown normal).
 */
export async function toggleSessionHost(): Promise<void> {
  let id = await resolveHostWindowId();

  if (id == null) {
    id = await createHostWindow(false);
    if (id != null) {
      try {
        await chrome.windows.update(id, { state: "normal", focused: true });
      } catch {
        // ignore
      }
    }
    return;
  }

  try {
    const win = await chrome.windows.get(id);
    const isMinimized = win.state === "minimized";
    const isFocused = win.focused === true;

    if (isMinimized || !isFocused) {
      await chrome.windows.update(id, { state: "normal", focused: true });
    } else {
      await chrome.windows.update(id, { state: "minimized", focused: false });
    }
  } catch {
    await setStoredWindowId(null);
    const newId = await createHostWindow(false);
    if (newId != null) {
      try {
        await chrome.windows.update(newId, { state: "normal", focused: true });
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Apply host lifecycle for persist mode.
 * Side panel always opens on action click (settings live there).
 * Host window stays minimized in the background for warm iframes only.
 */
export async function syncPersistMode(enabled: boolean): Promise<void> {
  // Always open Chrome Side Panel on toolbar/shortcut — do not steal the action.
  await chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true,
  });

  if (enabled) {
    await ensureSessionHost();
  } else {
    await teardownSessionHost();
  }
}

function scheduleRecreateIfNeeded(): void {
  if (tearingDown) {
    return;
  }
  if (recreateTimer != null) {
    clearTimeout(recreateTimer);
  }
  recreateTimer = setTimeout(() => {
    recreateTimer = null;
    void (async () => {
      if (tearingDown) {
        return;
      }
      const persist = await getPersistEnabled();
      if (!persist) {
        return;
      }
      const existing = await resolveHostWindowId();
      if (existing != null) {
        return;
      }
      await ensureSessionHost();
    })();
  }, RECREATE_DELAY_MS);
}

/**
 * Register windows.onRemoved re-warm. Safe to call multiple times.
 */
export function registerSessionHostLifecycle(): void {
  if (listenersRegistered) {
    return;
  }
  listenersRegistered = true;

  chrome.windows.onRemoved.addListener((windowId) => {
    const matchesCache = cachedWindowId != null && windowId === cachedWindowId;

    if (matchesCache) {
      cachedWindowId = null;
      void chrome.storage.session.remove(WINDOW_ID_KEY).catch(() => {
        // ignore
      });
      scheduleRecreateIfNeeded();
      return;
    }

    void (async () => {
      const stored = await getStoredWindowId();
      if (stored === windowId) {
        await setStoredWindowId(null);
        scheduleRecreateIfNeeded();
      }
    })();
  });
}

/**
 * SW startup / install: register listeners and sync host to persist flag.
 */
export async function bootstrapSessionHost(): Promise<void> {
  registerSessionHostLifecycle();
  const persist = await getPersistEnabled();
  await syncPersistMode(persist);
}
