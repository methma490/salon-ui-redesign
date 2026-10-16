'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'dart-salon-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read persisted theme or default to light
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const initialTheme: Theme = stored || 'light';
    setThemeState(initialTheme);

    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const computedResolved: 'light' | 'dark' =
      initialTheme === 'system' ? (isSystemDark ? 'dark' : 'light') : initialTheme;

    setResolvedTheme(computedResolved);
    applyThemeClass(computedResolved);
    setMounted(true);
  }, []);

  const applyThemeClass = (resolved: 'light' | 'dark') => {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);

    let nextResolved: 'light' | 'dark' = 'light';
    if (newTheme === 'system') {
      nextResolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      nextResolved = newTheme;
    }

    setResolvedTheme(nextResolved);
    applyThemeClass(nextResolved);
  };

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  // Listen to system theme changes if theme === 'system'
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const next = e.matches ? 'dark' : 'light';
        setResolvedTheme(next);
        applyThemeClass(next);
      }
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: mounted ? resolvedTheme : 'light', setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
