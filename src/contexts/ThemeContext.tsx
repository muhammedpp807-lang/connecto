import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeColor = 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'cyan';
export type ChatBackground = 'default' | 'doodle' | 'subtle_dots' | 'dark_grid' | 'geometric' | 'warm_sunset' | 'emerald_mist' | 'midnight';
export type AppBackground = 'default' | 'slate' | 'deep_dark' | 'warm_soft' | 'aurora' | 'oled_black';

interface ThemeContextType {
  theme: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  themeColor: ThemeColor;
  chatBackground: ChatBackground;
  appBackground: AppBackground;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setThemeColor: (color: ThemeColor) => void;
  setChatBackground: (bg: ChatBackground) => void;
  setAppBackground: (bg: AppBackground) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('connecto_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'system';
  });

  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    const saved = localStorage.getItem('connecto_theme_color');
    if (['blue', 'emerald', 'purple', 'amber', 'rose', 'cyan'].includes(saved || '')) {
      return saved as ThemeColor;
    }
    return 'blue';
  });

  const [chatBackground, setChatBackgroundState] = useState<ChatBackground>(() => {
    const saved = localStorage.getItem('connecto_chat_bg');
    if (saved) return saved as ChatBackground;
    return 'default';
  });

  const [appBackground, setAppBackgroundState] = useState<AppBackground>(() => {
    const saved = localStorage.getItem('connecto_app_bg');
    if (saved) return saved as AppBackground;
    return 'default';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let isDark = false;
      if (theme === 'dark') isDark = true;
      else if (theme === 'system') isDark = mediaQuery.matches;

      if (isDark) {
        root.classList.add('dark');
        setEffectiveTheme('dark');
      } else {
        root.classList.remove('dark');
        setEffectiveTheme('light');
      }
    };

    applyTheme();
    localStorage.setItem('connecto_theme', theme);

    const listener = () => {
      if (theme === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    localStorage.setItem('connecto_theme_color', color);
  };

  const setChatBackground = (bg: ChatBackground) => {
    setChatBackgroundState(bg);
    localStorage.setItem('connecto_chat_bg', bg);
  };

  const setAppBackground = (bg: AppBackground) => {
    setAppBackgroundState(bg);
    localStorage.setItem('connecto_app_bg', bg);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        effectiveTheme,
        themeColor,
        chatBackground,
        appBackground,
        setTheme,
        toggleTheme,
        setThemeColor,
        setChatBackground,
        setAppBackground
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
