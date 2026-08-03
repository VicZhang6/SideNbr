export const MSG = {
  PERSIST_CHANGED: "sidenbr/persist-changed",
  ENSURE_SESSION_HOST: "sidenbr/ensure-session-host",
  TEARDOWN_SESSION_HOST: "sidenbr/teardown-session-host",
  SESSION_HOST_STATUS: "sidenbr/session-host-status",
  SYNC_PROVIDERS: "sidenbr/sync-providers", // { enabled: ProviderId[], active: ProviderId }
  GET_PERSIST: "sidenbr/get-persist",
  /** Side panel / UI → SW: open top-level popup for provider login. */
  OPEN_LOGIN_WINDOW: "sidenbr/open-login-window", // { providerId, url }
  /** Content script → SW: login-like UI present or gone. */
  LOGIN_STATE: "sidenbr/login-state", // { providerId, isLogin, topLevel }
  /** SW → side panel: show/hide login hint for provider. */
  LOGIN_HINT: "sidenbr/login-hint", // { providerId, show }
  /** SW → side panel: login window finished — reload iframe. */
  LOGIN_SUCCESS: "sidenbr/login-success", // { providerId }
} as const;

/** Port name: side panel document ↔ service worker (open-state tracking). */
export const SIDE_PANEL_PORT = "sidenbr-sidepanel";
