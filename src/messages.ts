/**
 * Extension message protocol (side panel ↔ SW ↔ content scripts).
 * Single source of truth for type strings and parse helpers.
 */

export const MSG = {
  PERSIST_CHANGED: "sidenbr/persist-changed",
  ENSURE_SESSION_HOST: "sidenbr/ensure-session-host",
  TEARDOWN_SESSION_HOST: "sidenbr/teardown-session-host",
  SESSION_HOST_STATUS: "sidenbr/session-host-status",
  SYNC_PROVIDERS: "sidenbr/sync-providers",
  GET_PERSIST: "sidenbr/get-persist",
  /** Side panel → SW: open top-level popup for provider login. */
  OPEN_LOGIN_WINDOW: "sidenbr/open-login-window",
  /** Content script → SW: login-like UI present or gone. */
  LOGIN_STATE: "sidenbr/login-state",
  /** SW → side panel: show/hide login hint for provider. */
  LOGIN_HINT: "sidenbr/login-hint",
  /** SW → side panel: login window finished — reload iframe. */
  LOGIN_SUCCESS: "sidenbr/login-success",
} as const;

export type MsgType = (typeof MSG)[keyof typeof MSG];

/** Port name: side panel document ↔ service worker (open-state tracking). */
export const SIDE_PANEL_PORT = "sidenbr-sidepanel";

/**
 * Content-script message type string — must stay equal to MSG.LOGIN_STATE.
 * Content bundle cannot import this module (classic script); keep in sync.
 */
export const CONTENT_LOGIN_STATE_TYPE = MSG.LOGIN_STATE;

// ── Typed payloads ──────────────────────────────────────────────────────────

export type OpenLoginWindowMessage = {
  type: typeof MSG.OPEN_LOGIN_WINDOW;
  providerId: string;
  url: string;
};

export type LoginStateMessage = {
  type: typeof MSG.LOGIN_STATE;
  providerId: string;
  isLogin: boolean;
  topLevel: boolean;
};

export type LoginHintMessage = {
  type: typeof MSG.LOGIN_HINT;
  providerId: string;
  show: boolean;
};

export type LoginSuccessMessage = {
  type: typeof MSG.LOGIN_SUCCESS;
  providerId: string;
};

export type PersistChangedMessage = {
  type: typeof MSG.PERSIST_CHANGED;
  enabled: boolean;
};

export type SyncProvidersMessage = {
  type: typeof MSG.SYNC_PROVIDERS;
  enabled?: unknown;
  active?: unknown;
};

export type SimpleTypeMessage = {
  type:
    | typeof MSG.ENSURE_SESSION_HOST
    | typeof MSG.TEARDOWN_SESSION_HOST
    | typeof MSG.GET_PERSIST
    | typeof MSG.SESSION_HOST_STATUS;
};

export type ExtensionMessage =
  | OpenLoginWindowMessage
  | LoginStateMessage
  | LoginHintMessage
  | LoginSuccessMessage
  | PersistChangedMessage
  | SyncProvidersMessage
  | SimpleTypeMessage;

// ── Parse helpers ───────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function readString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function readBool(obj: Record<string, unknown>, key: string): boolean | null {
  const v = obj[key];
  return typeof v === "boolean" ? v : null;
}

/**
 * Parse a runtime message into a typed ExtensionMessage, or null if unknown.
 */
export function parseExtensionMessage(raw: unknown): ExtensionMessage | null {
  if (typeof raw === "string") {
    if (
      raw === MSG.ENSURE_SESSION_HOST ||
      raw === MSG.TEARDOWN_SESSION_HOST ||
      raw === MSG.GET_PERSIST ||
      raw === MSG.SESSION_HOST_STATUS
    ) {
      return { type: raw };
    }
    return null;
  }

  if (!isRecord(raw)) {
    return null;
  }

  const type = raw.type;
  if (typeof type !== "string") {
    return null;
  }

  switch (type) {
    case MSG.ENSURE_SESSION_HOST:
    case MSG.TEARDOWN_SESSION_HOST:
    case MSG.GET_PERSIST:
    case MSG.SESSION_HOST_STATUS:
      return { type };

    case MSG.PERSIST_CHANGED:
      return { type, enabled: raw.enabled === true };

    case MSG.SYNC_PROVIDERS:
      return {
        type,
        enabled: raw.enabled,
        active: raw.active,
      };

    case MSG.OPEN_LOGIN_WINDOW: {
      const providerId = readString(raw, "providerId");
      const url = readString(raw, "url");
      if (!providerId || !url) return null;
      return { type, providerId, url };
    }

    case MSG.LOGIN_STATE: {
      const providerId = readString(raw, "providerId");
      const isLogin = readBool(raw, "isLogin");
      const topLevel = readBool(raw, "topLevel");
      if (!providerId || isLogin == null || topLevel == null) return null;
      return { type, providerId, isLogin, topLevel };
    }

    case MSG.LOGIN_HINT: {
      const providerId = readString(raw, "providerId");
      const show = readBool(raw, "show");
      if (!providerId || show == null) return null;
      return { type, providerId, show };
    }

    case MSG.LOGIN_SUCCESS: {
      const providerId = readString(raw, "providerId");
      if (!providerId) return null;
      return { type, providerId };
    }

    default:
      return null;
  }
}

/** Fire-and-forget message to other extension pages (side panel, etc.). */
export function broadcastExtensionMessage(
  message: ExtensionMessage
): void {
  try {
    void chrome.runtime.sendMessage(message).catch(() => {
      // No receiving page — fine.
    });
  } catch {
    // ignore
  }
}
