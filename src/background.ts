/**
 * Service worker: Side Panel behavior + (private build) frame-header bypass.
 * Store-safe builds only use setPanelBehavior; DNR helpers no-op when permission is missing.
 */

async function configureSidePanel(): Promise<void> {
  await chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true,
  });
}

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
];

/**
 * Private build only: register dynamic DNR rules as a second path
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
 * Private build may declare browsingData; store-safe skips this.
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

async function bootstrap(): Promise<void> {
  await configureSidePanel();
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
