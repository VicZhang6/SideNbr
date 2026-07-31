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
  loadThemePreference,
  saveThemePreference,
} from "../storage";
import { detectSystemTheme, listenSystemTheme } from "./detect";
import {
  DEFAULT_THEME_MODE,
  type Theme,
  type ThemeMode,
} from "./types";

function applyDocumentTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function resolveTheme(mode: ThemeMode): Theme {
  return mode === "auto" ? detectSystemTheme() : mode;
}

export interface ThemeContextValue {
  /** Resolved light | dark (after auto → system). */
  theme: Theme;
  /** User preference: auto | light | dark. */
  themeMode: ThemeMode;
  /** Persist preference and apply resolved theme. */
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = detectSystemTheme();
    applyDocumentTheme(initial);
    return initial;
  });
  const [themeMode, setThemeModeState] = useState<ThemeMode>(DEFAULT_THEME_MODE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const preference = await loadThemePreference();
      if (cancelled) return;

      if (preference === "light" || preference === "dark") {
        setThemeModeState(preference);
        setThemeState(preference);
        applyDocumentTheme(preference);
      } else {
        // null / auto → follow system
        const system = detectSystemTheme();
        setThemeModeState("auto");
        setThemeState(system);
        applyDocumentTheme(system);
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // When mode is auto, re-resolve on system preference changes.
  useEffect(() => {
    if (themeMode !== "auto") return;

    return listenSystemTheme((next) => {
      setThemeState(next);
      applyDocumentTheme(next);
    });
  }, [themeMode]);

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
      if (areaName !== "local" || !changes.themePreference) return;
      const next = changes.themePreference.newValue;
      if (next === "light" || next === "dark") {
        setThemeModeState(next);
        setThemeState(next);
        applyDocumentTheme(next);
      } else {
        // "auto", removed, or unknown → follow system
        const system = detectSystemTheme();
        setThemeModeState("auto");
        setThemeState(system);
        applyDocumentTheme(system);
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    const resolved = resolveTheme(mode);
    setThemeState(resolved);
    applyDocumentTheme(resolved);
    void saveThemePreference(mode);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themeMode,
      setThemeMode,
    }),
    [theme, themeMode, setThemeMode]
  );

  // Avoid flashing the wrong theme before preference is loaded.
  // System theme is already applied in the initial state above.
  if (!ready) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
