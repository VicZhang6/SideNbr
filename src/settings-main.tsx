import React from "react";
import ReactDOM from "react-dom/client";
import SettingsApp from "./SettingsApp";
import { I18nProvider } from "./i18n";
import { ThemeProvider, detectSystemTheme } from "./theme";
import "./styles.css";

// Apply system theme as early as possible to reduce wrong-theme flash
// before chrome.storage preference is read.
const earlyTheme = detectSystemTheme();
document.documentElement.dataset.theme = earlyTheme;
document.documentElement.style.colorScheme = earlyTheme;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <SettingsApp />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
);
