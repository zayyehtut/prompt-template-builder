import { useState, useEffect, useCallback } from 'react';
import { storage } from '../lib/storage';

export type Theme = 'light' | 'dark' | 'pixel-light' | 'pixel-dark';

const themes: Theme[] = ['light', 'dark', 'pixel-light', 'pixel-dark'];

// --- Centralized State ---
let currentState: Theme = 'dark';
const listeners = new Set<(theme: Theme) => void>();

const updateDOM = (newTheme: Theme) => {
  document.documentElement.dataset.theme = newTheme;
  if (newTheme.includes('dark')) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

const changeTheme = (newTheme: Theme) => {
  currentState = newTheme;
  storage.setTheme(newTheme);
  updateDOM(newTheme);
  listeners.forEach(listener => listener(newTheme));
};

// Listen for changes from other tabs/popups
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.theme) {
    const newTheme = changes.theme.newValue as Theme;
    if (newTheme !== currentState) {
      changeTheme(newTheme);
    }
  }
});

// Load initial theme once
storage.getTheme().then(storedTheme => {
  changeTheme(storedTheme || 'dark');
});

// --- React Hook ---
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(currentState);

  useEffect(() => {
    const listener = (newTheme: Theme) => {
      setTheme(newTheme);
    };
    listeners.add(listener);
    
    // Sync with current state in case it changed between render and effect
    if (theme !== currentState) {
        setTheme(currentState);
    }

    return () => {
      listeners.delete(listener);
    };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const currentIndex = themes.indexOf(currentState);
    const nextIndex = (currentIndex + 1) % themes.length;
    changeTheme(themes[nextIndex]);
  }, []);

  return { theme: theme as Theme, changeTheme, toggleTheme };
}; 