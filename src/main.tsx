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

// Port liveness for side-panel toggle (reconnect when SW restarts).
function connectSidePanelPort(): void {
  try {
    const port = chrome.runtime.connect({ name: SIDE_PANEL_PORT });
    port.onDisconnect.addListener(() => {
      setTimeout(() => {
        connectSidePanelPort();
      }, 150);
    });
  } catch {
    // SW unavailable during rare teardown races.
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
