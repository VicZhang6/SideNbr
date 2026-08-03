/**
 * Reliable open/close toggle for Chrome Side Panel.
 *
 * Chrome requires `sidePanel.open()` to run in the same user-gesture turn as
 * the action click / `_execute_action` shortcut. Any `await` before `open()`
 * drops the gesture and open fails silently — which is why Google Chrome
 * could not open the panel after we took over from openPanelOnActionClick,
 * while more permissive browsers (e.g. Dia) still worked.
 *
 * Rules:
 * - Open: no await before `sidePanel.open()` (sync open-state check only).
 * - Close: may await freely (`close` / setOptions do not need a gesture).
 */

import { SIDE_PANEL_PORT } from "./messages";

const SIDE_PANEL_PATH = "sidepanel.html";

/** windowId → open side-panel ports (document alive while panel is open). */
const openPortsByWindow = new Map<number, Set<chrome.runtime.Port>>();

function trackPort(port: chrome.runtime.Port, windowId: number): void {
  let set = openPortsByWindow.get(windowId);
  if (!set) {
    set = new Set();
    openPortsByWindow.set(windowId, set);
  }
  set.add(port);
  port.onDisconnect.addListener(() => {
    const s = openPortsByWindow.get(windowId);
    if (!s) {
      return;
    }
    s.delete(port);
    if (s.size === 0) {
      openPortsByWindow.delete(windowId);
    }
  });
}

/** Synchronous: true when we currently hold a live side-panel port. */
function hasOpenPort(windowId: number): boolean {
  const ports = openPortsByWindow.get(windowId);
  return Boolean(ports && ports.size > 0);
}

/** Any window has a live side-panel port (single-window fallback). */
function hasAnyOpenPort(): boolean {
  for (const ports of openPortsByWindow.values()) {
    if (ports.size > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Register port listener once so the SW knows when the panel document is live.
 * Side panel pages call `chrome.runtime.connect({ name: SIDE_PANEL_PORT })`.
 */
export function registerSidePanelPortTracking(): void {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== SIDE_PANEL_PORT) {
      return;
    }

    let assigned = false;
    const assign = (windowId: number) => {
      if (assigned || !Number.isFinite(windowId)) {
        return;
      }
      assigned = true;
      trackPort(port, windowId);
    };

    port.onMessage.addListener((msg: unknown) => {
      if (
        msg &&
        typeof msg === "object" &&
        "windowId" in msg &&
        typeof (msg as { windowId: unknown }).windowId === "number"
      ) {
        assign((msg as { windowId: number }).windowId);
      }
    });

    // Fallback if the windowId message is delayed/lost (async OK here).
    void (async () => {
      const open = await querySidePanelContexts();
      if (open.length === 1) {
        assign(open[0]!.windowId);
      }
    })();
  });
}

type SidePanelContext = {
  windowId: number;
  tabId?: number;
};

async function querySidePanelContexts(): Promise<SidePanelContext[]> {
  if (!chrome.runtime.getContexts) {
    return [];
  }
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["SIDE_PANEL" as chrome.runtime.ContextType],
    });
    return contexts
      .filter((c) => typeof c.windowId === "number")
      .map((c) => ({
        windowId: c.windowId as number,
        tabId: typeof c.tabId === "number" ? c.tabId : undefined,
      }));
  } catch {
    return [];
  }
}

async function closeSidePanel(windowId: number, tabId?: number): Promise<void> {
  const sidePanel = chrome.sidePanel as typeof chrome.sidePanel & {
    close?: (options: { windowId?: number; tabId?: number }) => Promise<void>;
  };

  if (typeof sidePanel.close === "function") {
    try {
      await sidePanel.close({ windowId });
      return;
    } catch {
      // Fall through: try tabId, then setOptions dance.
    }
    if (typeof tabId === "number") {
      try {
        await sidePanel.close({ tabId });
        return;
      } catch {
        // fall through
      }
    }
  }

  // Older Chrome: briefly disable to force-close, then re-enable for next open.
  try {
    await chrome.sidePanel.setOptions({ enabled: false });
    await chrome.sidePanel.setOptions({
      enabled: true,
      path: SIDE_PANEL_PATH,
    });
  } catch {
    // ignore
  }
}

/**
 * Open immediately — must stay free of prior awaits (user gesture).
 */
function openSidePanelSync(tab: chrome.tabs.Tab): void {
  const tabId = tab.id;
  const windowId = tab.windowId;

  if (typeof tabId === "number") {
    void chrome.sidePanel.open({ tabId }).catch(() => {
      if (typeof windowId === "number") {
        void chrome.sidePanel.open({ windowId }).catch(() => {
          // Restricted page or gesture lost — nothing more we can do.
        });
      }
    });
    return;
  }

  if (typeof windowId === "number") {
    void chrome.sidePanel.open({ windowId }).catch(() => {
      // ignore
    });
  }
}

/**
 * Toggle SideNbr side panel for the tab that triggered the action / shortcut.
 *
 * Open path is gesture-safe (no await before open).
 * Close path may use async APIs freely.
 */
export function toggleSidePanel(tab: chrome.tabs.Tab): void {
  const windowId = tab.windowId;
  if (typeof windowId !== "number") {
    return;
  }

  // Sync only: ports prove the panel document is alive → close.
  // Do not await getContexts here — that would burn the open gesture.
  if (hasOpenPort(windowId)) {
    void closeSidePanel(windowId, tab.id);
    return;
  }

  // Single tracked panel (windowId message race): still treat as open → close.
  if (openPortsByWindow.size === 1 && hasAnyOpenPort()) {
    const onlyWindowId = openPortsByWindow.keys().next().value;
    if (typeof onlyWindowId === "number") {
      void closeSidePanel(onlyWindowId, tab.id);
      return;
    }
  }

  // Assume closed → open in this turn (keeps user gesture).
  // If the panel was already open after an SW restart (ports empty until
  // reconnect), open() is effectively a no-op; the next click closes.
  openSidePanelSync(tab);
}

/**
 * Action click / keyboard `_execute_action` should run our toggle — not
 * Chrome's built-in openPanelOnActionClick path alone.
 */
export async function installSidePanelToggleBehavior(): Promise<void> {
  await chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: false,
  });
}

/**
 * Register once: toolbar icon + `_execute_action` shortcut.
 * Handler must not be async — open must stay in the gesture turn.
 */
export function registerSidePanelActionToggle(): void {
  chrome.action.onClicked.addListener((tab) => {
    toggleSidePanel(tab);
  });
}
