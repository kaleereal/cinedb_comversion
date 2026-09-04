import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeSettings } from '../types';

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'dark',
  fontSize: 'md',
  colors: {
    bg: '#020617', // slate-950
    card: '#0f172a', // slate-900
    cardBorder: '#1e293b', // slate-800
    textPrimary: '#f8fafc', // slate-50
    textSecondary: '#94a3b8', // slate-400
    primary: '#4f46e5', // indigo-600
    accent: '#818cf8', // indigo-400
    danger: '#f43f5e', // rose-500
  },
};

const THEME_STORAGE_KEY = 'cinerate_theme_settings_v1';

interface ThemeContextType {
  savedTheme: ThemeSettings;
  draftTheme: ThemeSettings;
  isThemeEditMode: boolean;
  startThemeEditMode: () => void;
  updateDraftTheme: (updates: Partial<ThemeSettings>) => void;
  updateDraftColor: (colorKey: keyof ThemeSettings['colors'], value: string) => void;
  saveThemeChanges: () => void;
  cancelThemeChanges: () => void;
  currentTheme: ThemeSettings;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function getStoredThemeSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_SETTINGS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_THEME_SETTINGS;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedTheme, setSavedTheme] = useState<ThemeSettings>(getStoredThemeSettings);
  const [draftTheme, setDraftTheme] = useState<ThemeSettings>(savedTheme);
  const [isThemeEditMode, setIsThemeEditMode] = useState<boolean>(false);

  const currentTheme = isThemeEditMode ? draftTheme : savedTheme;

  // Apply CSS Custom Properties & font scale to document.documentElement (Poin 7 & 8)
  useEffect(() => {
    const root = document.documentElement;
    const { colors, fontSize } = currentTheme;

    root.style.setProperty('--color-bg', colors.bg);
    root.style.setProperty('--color-card', colors.card);
    root.style.setProperty('--color-card-border', colors.cardBorder);
    root.style.setProperty('--color-text-primary', colors.textPrimary);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-danger', colors.danger);

    // Apply font size scale
    const fontScaleMap = {
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
    };
    root.style.fontSize = fontScaleMap[fontSize] || '16px';
  }, [currentTheme]);

  const startThemeEditMode = () => {
    setDraftTheme({ ...savedTheme });
    setIsThemeEditMode(true);
  };

  const updateDraftTheme = (updates: Partial<ThemeSettings>) => {
    setDraftTheme((prev) => ({
      ...prev,
      ...updates,
      colors: {
        ...prev.colors,
        ...(updates.colors || {}),
      },
    }));
  };

  const updateDraftColor = (colorKey: keyof ThemeSettings['colors'], value: string) => {
    setDraftTheme((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorKey]: value,
      },
    }));
  };

  const saveThemeChanges = () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(draftTheme));
    setSavedTheme(draftTheme);
    setIsThemeEditMode(false);
  };

  const cancelThemeChanges = () => {
    setDraftTheme({ ...savedTheme });
    setIsThemeEditMode(false);
  };

  return (
    <ThemeContext.Provider
      value={{
        savedTheme,
        draftTheme,
        isThemeEditMode,
        startThemeEditMode,
        updateDraftTheme,
        updateDraftColor,
        saveThemeChanges,
        cancelThemeChanges,
        currentTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
