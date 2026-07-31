import type { Messages } from "../types";

export const en: Messages = {
  "toolbar.aria": "AI services toolbar",
  "toolbar.refresh": "Refresh current service",
  "toolbar.openOfficial": "Open official site",
  "toolbar.settings": "Settings",
  "toolbar.settingsOpen": "Open settings",
  loading: "Loading…",
  "providerSelect.aria": "Select AI service",
  "error.slowTitle": "Slow to load",
  "error.slowBody":
    "{label} is taking a long time to load. This may be due to network issues or embedding restrictions. You can wait, refresh the side panel, or open the official site.",
  "error.offlineTitle": "You are offline",
  "error.offlineBody":
    "This device appears offline. Check your connection, then refresh the side panel or open the service on its official site.",
  "error.blockedTitle": "Cannot load in the side panel",
  "error.blockedBody":
    "{label} may block embedding or failed to load. Try refreshing the side panel; if it still fails, open the official site.",
  "error.reload": "Refresh side panel",
  "error.openOfficial": "Open official site",
  "error.dismiss": "Dismiss",
  "onboarding.hint":
    "You can change the wake shortcut in Settings or at chrome://extensions/shortcuts (macOS: Command+Shift+A, Windows/Linux: Alt+Shift+A).",
  "onboarding.openShortcuts": "Open shortcut settings",
  "onboarding.dismiss": "Got it",
  "onboarding.aria": "Shortcut tip",
  "settings.title": "{name} Settings",
  "settings.close": "Close",
  "settings.providersTitle": "Enabled AI services",
  "settings.providersHelp":
    "Only enabled services appear in the toolbar. Switching does not destroy already opened pages (avoids reloading). Turning a service off frees its memory. Min {min}, max {max} (now {count}/{max}).",
  "settings.enable": "Enable {label}",
  "settings.disable": "Disable {label}",
  "settings.shortcutTitle": "Wake shortcut",
  "settings.toggleSidepanel": "Open / close side panel",
  "settings.command": "Command",
  "settings.bound": "Bound",
  "settings.unbound": "Not bound — set it in Chrome",
  "settings.configureShortcut": "Configure shortcut",
  "settings.refreshStatus": "Refresh status",
  "settings.shortcutFootnote":
    "Chrome does not allow extensions to rewrite system shortcuts directly; this opens chrome://extensions/shortcuts.",
  "settings.allCommands": "All commands",
  "settings.openSource": "Open source",
  "settings.openSourceMit": "Open source · MIT",
  "settings.openRepo": "Open repository in a new tab",
  "settings.openExtensionDetails": "Open extension details",
  "settings.cannotReadShortcut": "Could not read shortcut binding",
  "settings.openingShortcuts": "Opening shortcut settings…",
  "settings.openedShortcuts":
    "Opened Chrome shortcuts page. Status refreshes when you return.",
  "settings.cannotOpenShortcuts":
    "Could not open automatically. Visit {url} manually.",
  "settings.minOne": "Keep at least {min} service(s).",
  "settings.maxFour": "Enable at most {max} services.",
  "settings.language": "Language",
  "settings.languageHelp":
    "Default follows the browser language. You can force English or Chinese.",
  "settings.langAuto": "System default",
  "settings.langEn": "English",
  "settings.langZh": "中文",
  "settings.appearance": "Appearance",
  "settings.appearanceHelp":
    "Default follows system light/dark mode.",
  "settings.themeAuto": "System default",
  "settings.themeLight": "Light",
  "settings.themeDark": "Dark",
  "shortcut.unbound": "Not bound",
  "common.close": "Close",
};
