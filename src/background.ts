/**
 * Service worker: Side Panel behavior + session host lifecycle +
 * frame-header compatibility (DNR) and session-host lifecycle.
 * DNR helpers no-op when the permission is unavailable.
 */

import {
  MSG,
  bootstrapSessionHost,
  ensureSessionHost,
  getPersistEnabled,
  syncPersistMode,
  teardownSessionHost,
} from "./session-host-manager";
import {
  installSidePanelToggleBehavior,
  registerSidePanelActionToggle,
  registerSidePanelPortTracking,
} from "./side-panel-toggle";

const FRAME_HEADER_RULES: chrome.declarativeNetRequest.Rule[] = [
  {
    id: 2001,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          header: "x-frame-options",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy-report-only",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "x-content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
      ],
    },
    condition: {
      urlFilter: "||perplexity.ai^",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.SUB_FRAME],
    },
  },
  {
    id: 2002,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          header: "x-frame-options",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy-report-only",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "x-content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
      ],
    },
    condition: {
      urlFilter: "||chatgpt.com^",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.SUB_FRAME],
    },
  },
  {
    id: 2003,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          header: "x-frame-options",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy-report-only",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "x-content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
      ],
    },
    condition: {
      urlFilter: "||openai.com^",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.SUB_FRAME],
    },
  },
  {
    id: 2004,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          header: "x-frame-options",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy-report-only",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "x-content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
      ],
    },
    condition: {
      urlFilter: "||deepseek.com^",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.SUB_FRAME],
    },
  },
  {
    id: 2005,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          header: "x-frame-options",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy-report-only",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "x-content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
      ],
    },
    condition: {
      urlFilter: "||grok.com^",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.SUB_FRAME],
    },
  },
  {
    id: 2006,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          header: "x-frame-options",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy-report-only",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "x-content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
      ],
    },
    condition: {
      urlFilter: "||x.ai^",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.SUB_FRAME],
    },
  },
];

/**
 * Register dynamic DNR rules as a second path
 * (static rules.json may fail to load silently after partial reloads).
 */
async function installFrameBypassRules(): Promise<void> {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) {
    return;
  }

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: FRAME_HEADER_RULES.map((r) => r.id),
      addRules: FRAME_HEADER_RULES,
    });
  } catch {
    // Store-safe build lacks DNR permission — expected.
  }
}

/**
 * Cached Service Workers can re-serve framed responses with old CSP/XFO.
 * browsingData may be unavailable in some contexts — ignore failures.
 */
async function clearProviderServiceWorkers(): Promise<void> {
  if (!chrome.browsingData?.remove) {
    return;
  }

  try {
    await chrome.browsingData.remove(
      {
        origins: [
          "https://www.perplexity.ai",
          "https://perplexity.ai",
          "https://chatgpt.com",
          "https://openai.com",
          "https://www.openai.com",
          "https://chat.deepseek.com",
          "https://deepseek.com",
          "https://grok.com",
          "https://x.ai",
        ],
      },
      {
        serviceWorkers: true,
      }
    );
  } catch {
    // Permission missing or origins restricted — ignore.
  }
}

function messageType(message: unknown): string | null {
  if (typeof message === "string") {
    return message;
  }
  if (message && typeof message === "object" && "type" in message) {
    const t = (message as { type: unknown }).type;
    return typeof t === "string" ? t : null;
  }
  return null;
}

/**
 * Persist / session-host message handlers.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const type = messageType(message);
  if (!type) {
    return;
  }

  if (type === MSG.ENSURE_SESSION_HOST) {
    void ensureSessionHost()
      .then((windowId) => sendResponse({ ok: true, windowId }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (type === MSG.TEARDOWN_SESSION_HOST) {
    void teardownSessionHost()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (type === MSG.PERSIST_CHANGED) {
    const enabled = Boolean(
      message &&
        typeof message === "object" &&
        "enabled" in message &&
        (message as { enabled: unknown }).enabled
    );
    void syncPersistMode(enabled)
      .then(() => sendResponse({ ok: true, enabled }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (type === MSG.SYNC_PROVIDERS) {
    void (async () => {
      try {
        const persist = await getPersistEnabled();
        if (persist) {
          await ensureSessionHost();
        }
        sendResponse({ ok: true });
      } catch {
        sendResponse({ ok: false });
      }
    })();
    return true;
  }

  if (type === MSG.GET_PERSIST) {
    void getPersistEnabled()
      .then((persist) => sendResponse({ persist }))
      .catch(() => sendResponse({ persist: false }));
    return true;
  }
});

// Side panel open/close is owned by side-panel-toggle (action + Alt+A).
// Session host is a minimized warm-up window only; it must not steal the action.

registerSidePanelPortTracking();
registerSidePanelActionToggle();

/**
 * Keep host in sync when user toggles persist or enabled providers
 * via storage (settings UI may write storage without messaging).
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes.persistSessions) {
    const enabled = changes.persistSessions.newValue === true;
    void syncPersistMode(enabled);
  }

  if (changes.enabledProviders) {
    void (async () => {
      if (await getPersistEnabled()) {
        await ensureSessionHost();
      }
    })();
  }
});

async function bootstrap(): Promise<void> {
  // Always use our toggle (open/close); never openPanelOnActionClick-only.
  try {
    await installSidePanelToggleBehavior();
  } catch {
    // ignore
  }
  try {
    await bootstrapSessionHost();
  } catch {
    // Host optional; panel toggle still works via action listener.
  }
  await installFrameBypassRules();
  await clearProviderServiceWorkers();
}

chrome.runtime.onInstalled.addListener(() => {
  void bootstrap();
});

chrome.runtime.onStartup.addListener(() => {
  void bootstrap();
});

// First load after service worker starts (reload without reinstall)
void bootstrap();
