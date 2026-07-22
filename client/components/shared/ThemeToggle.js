'use client';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

/**
 * ThemeToggle — quick icon button for the topbar
 * Single click flips light <-> dark (most common real-world pattern —
 * users rarely need the 3-way "system" option exposed at this level,
 * that lives in Settings instead, see ThemeSettingsPicker below)
 */
export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative w-9 h-9 rounded-lg flex items-center justify-center
        hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
    >
      <Sun className={`h-4.5 w-4.5 text-amber-500 absolute transition-all duration-300 ${
        theme === 'dark' ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
      }`} />
      <Moon className={`h-4.5 w-4.5 text-blue-400 absolute transition-all duration-300 ${
        theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
      }`} />
    </button>
  );
}