"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_STORAGE_KEY = "axon_theme";

// Store for theme state
let themeListeners: Array<() => void> = [];
let currentTheme: Theme = "light";

function getThemeSnapshot(): Theme {
  return currentTheme;
}

function getThemeServerSnapshot(): Theme {
  return "light";
}

function subscribeTheme(callback: () => void): () => void {
  themeListeners.push(callback);
  return () => {
    themeListeners = themeListeners.filter((l) => l !== callback);
  };
}

function setThemeValue(newTheme: Theme) {
  currentTheme = newTheme;
  if (typeof window !== "undefined") {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    // Update DOM
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(newTheme);
  }
  themeListeners.forEach((l) => l());
}

// Initialize from localStorage on client
if (typeof window !== "undefined") {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored && (stored === "light" || stored === "dark")) {
    currentTheme = stored;
  }
  // Apply initial theme to DOM
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(currentTheme);
}

interface ThemeProviderProps {
  readonly children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeValue(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeValue(currentTheme === "light" ? "dark" : "light");
  }, []);

  // Ensure DOM is synced on mount (for SSR hydration)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
