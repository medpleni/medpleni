"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_STORAGE_KEY = "medpleni_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Tenta ler do localStorage ou do atributo já injetado pelo script anti-flicker
    const currentAttr = document.documentElement.getAttribute("data-theme") as Theme | null;
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;

    if (currentAttr && (currentAttr === "dark" || currentAttr === "light")) {
      setThemeState(currentAttr);
    } else if (stored && (stored === "dark" || stored === "light")) {
      setThemeState(stored);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      // Preferência do sistema operacional
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = prefersDark ? "dark" : "light";
      setThemeState(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn("Não foi possível salvar tema no localStorage:", e);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
