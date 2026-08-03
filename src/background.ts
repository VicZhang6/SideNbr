/**
 * Service worker: Side Panel behavior + session host lifecycle +
 * frame-header compatibility (DNR) and session-host lifecycle.
 * DNR helpers no-op when the permission is unavailable.
 */

import {
  bootstrapSessionHost,
  ensureSessionHost,
  getPersistEnabled,
  syncPersistMode,
  teardownSessionHost,
} from "./session-host-manager";
import {
  MSG,
  parseExtensionMessage,
  type ExtensionMessage,
} from "./messages";
import {
  installSidePanelToggleBehavior,
  registerSidePanelActionToggle,
  registerSidePanelPortTracking,
} from "./side-panel-toggle";
import {
  handleLoginState,
  openLoginWindow,
  registerLoginWindowLifecycle,
} from "./login-window";

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

type SendResponse = (response?: unknown) => void;

/**
 * Typed message dispatch. Returns true when sendResponse will be called async.
 */
function dispatchMessage(
  msg: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: SendResponse
): boolean {
  switch (msg.type) {
    case MSG.ENSURE_SESSION_HOST:
      void ensureSessionHost()
        .then((windowId) => sendResponse({ ok: true, windowId }))
        .catch(() => sendResponse({ ok: false }));
      return true;

    case MSG.TEARDOWN_SESSION_HOST:
      void teardownSessionHost()
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;

    case MSG.PERSIST_CHANGED:
      void syncPersistMode(msg.enabled)
        .then(() => sendResponse({ ok: true, enabled: msg.enabled }))
        .catch(() => sendResponse({ ok: false }));
      return true;

    case MSG.SYNC_PROVIDERS:
      void (async () => {
        try {
          if (await getPersistEnabled()) {
            await ensureSessionHost();
          }
          sendResponse({ ok: true });
        } catch {
          sendResponse({ ok: false });
        }
      })();
      return true;

    case MSG.GET_PERSIST:
      void getPersistEnabled()
        .then((persist) => sendResponse({ persist }))
        .catch(() => sendResponse({ persist: false }));
      return true;

    case MSG.OPEN_LOGIN_WINDOW:
      void openLoginWindow(msg.providerId, msg.url)
        .then((result) => sendResponse(result))
        .catch(() => sendResponse({ ok: false }));
      return true;

    case MSG.LOGIN_STATE:
      handleLoginState(msg, sender);
      return false;

    case MSG.LOGIN_HINT:
    case MSG.LOGIN_SUCCESS:
    case MSG.SESSION_HOST_STATUS:
      // Side panel / other pages handle these; SW ignores.
      return false;

    default:
      return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const msg = parseExtensionMessage(message);
  if (!msg) {
    return;
  }
  return dispatchMessage(msg, sender, sendResponse);
});

// Side panel open/close is owned by side-panel-toggle (action + Alt+A).
// Session host is a minimized warm-up window only; it must not steal the action.

registerSidePanelPortTracking();
registerSidePanelActionToggle();
registerLoginWindowLifecycle();

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
