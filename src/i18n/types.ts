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
  "toolbar.settingsUpdateAvailable": string;
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
  "login.hintTitle": string;
  "login.hintBody": string;
  "login.openWindow": string;
  "login.dismiss": string;
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
  "settings.customTitle": string;
  "settings.customAdd": string;
  "settings.customName": string;
  "settings.customUrl": string;
  "settings.customIcon": string;
  "settings.customSave": string;
  "settings.customCancel": string;
  "settings.customDelete": string;
  "settings.customEmpty": string;
  "settings.customInvalidUrl": string;
  "settings.customInvalidName": string;
  "settings.emoji": string;
  "settings.brandIcons": string;
  "settings.shortcutTitle": string;
  "settings.toggleSidepanel": string;
  "settings.command": string;
  "settings.bound": string;
  "settings.unbound": string;
  "settings.configureShortcut": string;
  "settings.refreshStatus": string;
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
  "settings.navAppearance": string;
  "settings.navServices": string;
  "settings.navLab": string;
  "settings.navShortcuts": string;
  "settings.navAbout": string;
  "settings.appearance": string;
  "settings.appearanceHelp": string;
  "settings.themeAuto": string;
  "settings.themeLight": string;
  "settings.themeDark": string;
  "settings.orderTitle": string;
  "settings.orderHelp": string;
  "settings.orderEmpty": string;
  "settings.orderDrag": string;
  "settings.persistTitle": string;
  "settings.persistHelp": string;
  "settings.persistOn": string;
  "settings.persistOff": string;
  "settings.persistWarning": string;
  "settings.aboutTitle": string;
  "settings.version": string;
  "settings.currentVersion": string;
  "settings.checkUpdate": string;
  "settings.checkingUpdate": string;
  "settings.upToDate": string;
  "settings.updateAvailable": string;
  "settings.openRelease": string;
  "settings.downloadUpdate": string;
  "settings.updateCheckFailed": string;
  "settings.configTitle": string;
  "settings.configHelp": string;
  "settings.configExport": string;
  "settings.configImport": string;
  "settings.configExportOk": string;
  "settings.configImportOk": string;
  "settings.configImportInvalid": string;
  "settings.configImportUnsupported": string;
  "settings.configImportFailed": string;
  "shortcut.unbound": string;
  "common.close": string;
}

export type TranslateFn = (
  key: keyof Messages,
  vars?: Record<string, string | number>
) => string;
