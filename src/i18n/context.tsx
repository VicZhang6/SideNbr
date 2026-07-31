import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loadLocalePreference,
  saveLocalePreference,
} from "../storage";
import { detectBrowserLocale, detectLocale } from "./detect";
import {
  DEFAULT_LOCALE,
  type Locale,
  type LocaleMode,
  type Messages,
  type TranslateFn,
} from "./types";

import { en } from "./locales/en";
import { zh } from "./locales/zh";

const catalogs: Record<Locale, Messages> = { en, zh };

function applyDocumentLang(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
}

function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return String(vars[name]);
    }
    return match;
  });
}

function translate(
  locale: Locale,
  key: keyof Messages,
  vars?: Record<string, string | number>
): string {
  const catalog = catalogs[locale] ?? ({} as Messages);
  const fallbackCatalog = catalogs[DEFAULT_LOCALE] ?? ({} as Messages);
  const raw =
    (catalog[key] as string | undefined) ??
    (fallbackCatalog[key] as string | undefined) ??
    String(key);
  return interpolate(raw, vars);
}

export interface I18nContextValue {
  locale: Locale;
  localeMode: LocaleMode;
  t: TranslateFn;
  setLocale: (locale: Locale) => void;
  setLocaleMode: (mode: LocaleMode) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [localeMode, setLocaleModeState] = useState<LocaleMode>("auto");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const preference = await loadLocalePreference();
      if (cancelled) return;

      if (preference) {
        setLocaleModeState(preference);
        setLocaleState(preference);
        applyDocumentLang(preference);
      } else {
        const detected = await detectLocale();
        if (cancelled) return;
        setLocaleModeState("auto");
        setLocaleState(detected);
        applyDocumentLang(detected);
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep in sync if storage changes elsewhere (e.g. another extension page).
  useEffect(() => {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage?.onChanged?.addListener
    ) {
      return;
    }

    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local" || !changes.localePreference) return;
      const next = changes.localePreference.newValue;
      if (next === "en" || next === "zh") {
        setLocaleModeState(next);
        setLocaleState(next);
        applyDocumentLang(next);
      } else {
        // "auto", removed, or unknown → follow browser
        const browserLocale = detectBrowserLocale();
        setLocaleModeState("auto");
        setLocaleState(browserLocale);
        applyDocumentLang(browserLocale);
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleModeState(next);
    setLocaleState(next);
    applyDocumentLang(next);
    void saveLocalePreference(next);
  }, []);

  const setLocaleMode = useCallback((mode: LocaleMode) => {
    setLocaleModeState(mode);
    if (mode === "auto") {
      const browserLocale = detectBrowserLocale();
      setLocaleState(browserLocale);
      applyDocumentLang(browserLocale);
      void saveLocalePreference("auto");
    } else {
      setLocaleState(mode);
      applyDocumentLang(mode);
      void saveLocalePreference(mode);
    }
  }, []);

  const t: TranslateFn = useCallback(
    (key, vars) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      localeMode,
      t,
      setLocale,
      setLocaleMode,
    }),
    [locale, localeMode, t, setLocale, setLocaleMode]
  );

  // Avoid flashing the wrong language before preference is loaded.
  if (!ready) {
    return null;
  }

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
