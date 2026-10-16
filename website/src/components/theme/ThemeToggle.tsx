'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative inline-flex items-center justify-center gap-2 rounded-full p-2 text-slate-600 transition-all duration-300 hover:text-violet-600 hover:bg-violet-50 dark:text-slate-300 dark:hover:text-violet-300 dark:hover:bg-violet-950/50 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer ${className}`}
    >
      <div className="relative size-4.5 flex items-center justify-center">
        <Sun
          className={`size-4.5 absolute transition-all duration-300 ${
            isDark
              ? 'rotate-90 scale-0 opacity-0 text-amber-400'
              : 'rotate-0 scale-100 opacity-100 text-amber-500'
          }`}
        />
        <Moon
          className={`size-4.5 absolute transition-all duration-300 ${
            isDark
              ? 'rotate-0 scale-100 opacity-100 text-violet-300'
              : '-rotate-90 scale-0 opacity-0 text-slate-600'
          }`}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold select-none">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
