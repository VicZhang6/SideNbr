/**
 * Reliable open/close toggle for Chrome Side Panel.
 *
 * Chrome requires `sidePanel.open()` in the same user-gesture turn as the
 * action click / `_execute_action`. Any await before open() drops the gesture.
 *
 * Open-state is a simple port count: sidepanel.html connects on load and
 * reconnects after SW restarts. No per-window indexing — close path may await
 * getContexts for the target windowId.
 */

import { SIDE_PANEL_PORT } from "./messages";

const SIDE_PANEL_PATH = "sidepanel.html";

/** Live side-panel ports (document alive while panel is open). */
const panelPorts = new Set<chrome.runtime.Port>();

function isPanelOpenSync(): boolean {
  return panelPorts.size > 0;
}

/**
 * Register once: side panel documents connect with SIDE_PANEL_PORT.
 */
export function registerSidePanelPortTracking(): void {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== SIDE_PANEL_PORT) {
      return;
    }
    panelPorts.add(port);
    port.onDisconnect.addListener(() => {
      panelPorts.delete(port);
    });
  });
}

async function resolveCloseTarget(
  tab?: chrome.tabs.Tab
): Promise<{ windowId?: number; tabId?: number }> {
  if (chrome.runtime.getContexts) {
    try {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: ["SIDE_PANEL" as chrome.runtime.ContextType],
      });
      const withWindow = contexts.find((c) => typeof c.windowId === "number");
      if (withWindow && typeof withWindow.windowId === "number") {
        return {
          windowId: withWindow.windowId,
          tabId:
            typeof withWindow.tabId === "number"
              ? withWindow.tabId
              : tab?.id,
        };
      }
    } catch {
      // fall through
    }
  }
  return {
    windowId: typeof tab?.windowId === "number" ? tab.windowId : undefined,
    tabId: typeof tab?.id === "number" ? tab.id : undefined,
  };
}

async function closeSidePanel(tab?: chrome.tabs.Tab): Promise<void> {
  const { windowId, tabId } = await resolveCloseTarget(tab);
  const sidePanel = chrome.sidePanel as typeof chrome.sidePanel & {
    close?: (options: { windowId?: number; tabId?: number }) => Promise<void>;
  };

  if (typeof sidePanel.close === "function") {
    if (typeof windowId === "number") {
      try {
        await sidePanel.close({ windowId });
        return;
      } catch {
        // try tabId
      }
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

  // Older Chrome: briefly disable to force-close, then re-enable.
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

/** Open immediately — must stay free of prior awaits (user gesture). */
function openSidePanelSync(tab: chrome.tabs.Tab): void {
  const tabId = tab.id;
  const windowId = tab.windowId;

  if (typeof tabId === "number") {
    void chrome.sidePanel.open({ tabId }).catch(() => {
      if (typeof windowId === "number") {
        void chrome.sidePanel.open({ windowId }).catch(() => {
          // Restricted page or gesture lost.
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
 * Toggle side panel. Open path is gesture-safe (sync open-state only).
 */
export function toggleSidePanel(tab: chrome.tabs.Tab): void {
  if (isPanelOpenSync()) {
    void closeSidePanel(tab);
    return;
  }
  // Ports empty after SW restart while panel still open → open() is a no-op;
  // next click closes once the panel reconnects.
  openSidePanelSync(tab);
}

/** Disable Chrome's built-in openPanelOnActionClick — we own the toggle. */
export async function installSidePanelToggleBehavior(): Promise<void> {
  await chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: false,
  });
}

/** Register once: toolbar icon + `_execute_action` shortcut. */
export function registerSidePanelActionToggle(): void {
  chrome.action.onClicked.addListener((tab) => {
    toggleSidePanel(tab);
  });
}
