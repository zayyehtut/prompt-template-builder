import { useState, useEffect } from 'react';
import { storage } from '../lib/storage';

export type Theme = 'light' | 'dark' | 'pixel-light' | 'pixel-dark';

const themes: Theme[] = ['light', 'dark', 'pixel-light', 'pixel-dark'];

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const loadTheme = async () => {
      const storedTheme = (await storage.getTheme()) || 'dark';
      changeTheme(storedTheme);
    };
    loadTheme();
  }, []);

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    storage.setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;
    // For tailwind's 'dark:' variant to work
    if (newTheme.includes('dark')) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  const toggleTheme = () => {
    if (!theme) return; // Don't do anything if theme is not yet loaded
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    changeTheme(themes[nextIndex]);
  };

  return { theme, changeTheme, toggleTheme };
}; 