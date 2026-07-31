export type Locale = "en" | "zh";

export const LOCALES: Locale[] = ["en", "zh"];

export const DEFAULT_LOCALE: Locale = "en";

export type LocaleMode = "auto" | Locale;

export type MessageKey = keyof Messages;

/**
 * Full message catalog shape. Values live in locales/en.ts and locales/zh.ts.
 */
export interface Messages {
  "toolbar.aria": string;
  "toolbar.refresh": string;
  "toolbar.openOfficial": string;
  "toolbar.settings": string;
  "toolbar.settingsOpen": string;
  loading: string;
  "providerSelect.aria": string;
  "error.slowTitle": string;
  "error.slowBody": string;
  "error.offlineTitle": string;
  "error.offlineBody": string;
  "error.blockedTitle": string;
  "error.blockedBody": string;
  "error.reload": string;
  "error.openOfficial": string;
  "error.dismiss": string;
  "onboarding.hint": string;
  "onboarding.openShortcuts": string;
  "onboarding.dismiss": string;
  "onboarding.aria": string;
  "settings.title": string;
  "settings.close": string;
  "settings.providersTitle": string;
  "settings.providersHelp": string;
  "settings.enable": string;
  "settings.disable": string;
  "settings.shortcutTitle": string;
  "settings.toggleSidepanel": string;
  "settings.command": string;
  "settings.bound": string;
  "settings.unbound": string;
  "settings.configureShortcut": string;
  "settings.refreshStatus": string;
  "settings.shortcutFootnote": string;
  "settings.allCommands": string;
  "settings.openSource": string;
  "settings.openSourceMit": string;
  "settings.openRepo": string;
  "settings.openExtensionDetails": string;
  "settings.cannotReadShortcut": string;
  "settings.openingShortcuts": string;
  "settings.openedShortcuts": string;
  "settings.cannotOpenShortcuts": string;
  "settings.minOne": string;
  "settings.maxFour": string;
  "settings.language": string;
  "settings.languageHelp": string;
  "settings.langAuto": string;
  "settings.langEn": string;
  "settings.langZh": string;
  "settings.appearance": string;
  "settings.appearanceHelp": string;
  "settings.themeAuto": string;
  "settings.themeLight": string;
  "settings.themeDark": string;
  "shortcut.unbound": string;
  "common.close": string;
}

export type TranslateFn = (
  key: keyof Messages,
  vars?: Record<string, string | number>
) => string;
