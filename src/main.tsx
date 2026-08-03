import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n";
import { ThemeProvider, detectSystemTheme } from "./theme";
import { SIDE_PANEL_PORT } from "./messages";
import "./styles.css";

// Apply system theme as early as possible to reduce wrong-theme flash
// before chrome.storage preference is read.
const earlyTheme = detectSystemTheme();
document.documentElement.dataset.theme = earlyTheme;
document.documentElement.style.colorScheme = earlyTheme;

// Report liveness to the service worker so shortcut toggle can close
// reliably even when keyboard focus is inside a provider iframe.
// Reconnect when the SW restarts (port drops but this document stays open).
function connectSidePanelPort(): void {
  try {
    const port = chrome.runtime.connect({ name: SIDE_PANEL_PORT });
    void chrome.windows.getCurrent().then((win) => {
      if (typeof win.id === "number") {
        try {
          port.postMessage({ windowId: win.id });
        } catch {
          // Port already gone.
        }
      }
    });
    port.onDisconnect.addListener(() => {
      // Brief delay so a closing panel is not immediately re-registered.
      setTimeout(() => {
        // If the document is going away, connect will fail harmlessly.
        connectSidePanelPort();
      }, 150);
    });
  } catch {
    // SW unavailable during rare teardown races — ignore.
  }
}
connectSidePanelPort();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
);
