import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { useTheme } from '../src/hooks/useTheme';
import { storage } from '../src/lib/storage';

vi.mock('../src/lib/storage', () => ({
  storage: {
    getTheme: vi.fn(),
    setTheme: vi.fn(),
  },
}));

describe('useTheme Hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.documentElement.className = '';
    document.documentElement.dataset.theme = '';
  });

  it('should initialize with the stored theme', async () => {
    (storage.getTheme as Mock).mockResolvedValue('pixel-dark');
    const { result } = renderHook(() => useTheme());
    
    await waitFor(() => {
      expect(result.current.theme).toBe('pixel-dark');
      expect(document.documentElement.dataset.theme).toBe('pixel-dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should initialize with "dark" as default if no theme is stored', async () => {
    (storage.getTheme as Mock).mockResolvedValue(null);
    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
    });
  });

  it('should toggle through all themes in order', async () => {
    (storage.getTheme as Mock).mockResolvedValue('dark');
    const { result } = renderHook(() => useTheme());

    // Wait for initial theme to be loaded
    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
    });

    // dark -> pixel-light
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('pixel-light');
    expect(storage.setTheme).toHaveBeenCalledWith('pixel-light');
    expect(document.documentElement.dataset.theme).toBe('pixel-light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // pixel-light -> pixel-dark
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('pixel-dark');
    expect(storage.setTheme).toHaveBeenCalledWith('pixel-dark');
    expect(document.documentElement.dataset.theme).toBe('pixel-dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    // pixel-dark -> light
    act(() => {
        result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('light');
    expect(storage.setTheme).toHaveBeenCalledWith('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // light -> dark (cycle complete)
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('dark');
    expect(storage.setTheme).toHaveBeenCalledWith('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should change to a specific theme directly', async () => {
    (storage.getTheme as Mock).mockResolvedValue('dark');
    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
        expect(result.current.theme).toBe('dark');
    });
    
    act(() => {
      result.current.changeTheme('pixel-light');
    });

    expect(result.current.theme).toBe('pixel-light');
    expect(storage.setTheme).toHaveBeenCalledWith('pixel-light');
    expect(document.documentElement.dataset.theme).toBe('pixel-light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
}); 