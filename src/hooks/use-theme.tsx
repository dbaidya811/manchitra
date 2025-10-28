"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light"); // Default to light
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("theme") as Theme;
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      // Check for old darkMode localStorage and migrate
      const oldDarkMode = localStorage.getItem("darkMode");
      if (oldDarkMode === "true") {
        setTheme("dark");
        localStorage.setItem("theme", "dark");
        localStorage.removeItem("darkMode"); // Clean up old key
      } else {
        setTheme("light");
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const effectiveTheme = theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

    if (effectiveTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : prev === "dark" ? "system" : "light"));
  };

  return { theme, setTheme, toggleTheme, mounted };
}
