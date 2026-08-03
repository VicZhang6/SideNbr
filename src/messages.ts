export const MSG = {
  PERSIST_CHANGED: "sidenbr/persist-changed",
  ENSURE_SESSION_HOST: "sidenbr/ensure-session-host",
  TEARDOWN_SESSION_HOST: "sidenbr/teardown-session-host",
  SESSION_HOST_STATUS: "sidenbr/session-host-status",
  SYNC_PROVIDERS: "sidenbr/sync-providers", // { enabled: ProviderId[], active: ProviderId }
  GET_PERSIST: "sidenbr/get-persist",
} as const;

/** Port name: side panel document ↔ service worker (open-state tracking). */
export const SIDE_PANEL_PORT = "sidenbr-sidepanel";
