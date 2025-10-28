"use client";

import React, { createContext, useContext } from "react";
import { useTheme } from "@/hooks/use-theme";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: "light" | "dark" | "system";
};

type ThemeContextType = ReturnType<typeof useTheme>;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, defaultTheme = "light" }: ThemeProviderProps) {
  const themeData = useTheme();

  // Set default theme on mount if not set
  React.useEffect(() => {
    if (!themeData.mounted) return;
    if (!localStorage.getItem("theme") && defaultTheme !== "system") {
      themeData.setTheme(defaultTheme);
    }
  }, [themeData, defaultTheme]);

  return <ThemeContext.Provider value={themeData}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
