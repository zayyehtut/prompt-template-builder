import { useState, useEffect, useCallback } from 'react';
import { storage } from '../lib/storage';

export type Theme = 'light' | 'dark' | 'pixel-light' | 'pixel-dark';

const themes: Theme[] = ['light', 'dark', 'pixel-light', 'pixel-dark'];

export const useTheme = (targetDocument: Document = document) => {
  const [theme, setTheme] = useState<Theme | null>(null);

  const changeTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    storage.setTheme(newTheme);
    targetDocument.documentElement.dataset.theme = newTheme;
    // For tailwind's 'dark:' variant to work
    if (newTheme.includes('dark')) {
      targetDocument.documentElement.classList.add('dark');
    } else {
      targetDocument.documentElement.classList.remove('dark');
    }
  }, [targetDocument]);

  useEffect(() => {
    const loadTheme = async () => {
      const storedTheme = (await storage.getTheme()) || 'dark';
      changeTheme(storedTheme);
    };
    loadTheme();
  }, [changeTheme]);

  const toggleTheme = useCallback(() => {
    if (!theme) return;
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    changeTheme(themes[nextIndex]);
  }, [theme, changeTheme]);

  return { theme, changeTheme, toggleTheme };
}; 