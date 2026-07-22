'use client';
import { useState, useEffect, useCallback } from 'react';

/**
 * useTheme — reads/writes the theme set by theme-init-script.js
 *
 * Real-world behavior matched:
 * - 3 modes: 'light' | 'dark' | 'system'
 * - 'system' means "follow OS preference" and live-updates if OS theme changes
 *   while the tab is open (e.g. macOS auto dark mode at sunset)
 * - Explicit light/dark choice overrides system and persists in localStorage
 */
export const useTheme = () => {
  // Read initial state from the DOM (already set by the inline script before hydration)
  const [theme, setThemeState] = useState('light'); // resolved: 'light' | 'dark'
  const [mode, setModeState]   = useState('system');  // user's actual preference: 'light' | 'dark' | 'system'

  useEffect(() => {
    const storedMode = localStorage.getItem('theme-mode') || 'system';
    setModeState(storedMode);

    const resolved = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setThemeState(resolved);
  }, []);

  // Live-update when OS theme changes AND user's mode is 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const currentMode = localStorage.getItem('theme-mode') || 'system';
      if (currentMode !== 'system') return; // user has an explicit override, ignore OS changes
      applyTheme(e.matches ? 'dark' : 'light');
      setThemeState(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const applyTheme = (resolvedTheme) => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  };

  const setMode = useCallback((newMode) => {
    // newMode: 'light' | 'dark' | 'system'
    localStorage.setItem('theme-mode', newMode);
    setModeState(newMode);

    const resolved = newMode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : newMode;

    // Store the RESOLVED theme too — this is what theme-init-script.js reads on next load
    // for instant correct paint (system mode still needs a concrete value cached for the flash-prevention script)
    localStorage.setItem('theme', resolved);
    applyTheme(resolved);
    setThemeState(resolved);
  }, []);

  // Simple toggle: light <-> dark (skips 'system', for a quick single-click toggle button)
  const toggleTheme = useCallback(() => {
    setMode(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setMode]);

  return { theme, mode, setMode, toggleTheme };
};