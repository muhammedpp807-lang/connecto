import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeColor, BubbleSettings, BubbleRadius, BubbleFontSize, BubbleColorScheme } from '../types';
import { safeGetItem, safeSetItem } from '../services/storageEngine';

export type ThemeMode = 'light' | 'dark' | 'system';
export type { ThemeColor };

export type ChatBackground = 
  | 'default' 
  | 'doodle' 
  | 'subtle_dots' 
  | 'dark_grid' 
  | 'geometric' 
  | 'warm_sunset' 
  | 'emerald_mist' 
  | 'midnight' 
  | 'cyber_neon'
  | 'starry_sky'
  | 'custom';

export type AppBackground = 
  | 'default' 
  | 'slate' 
  | 'deep_dark' 
  | 'warm_soft' 
  | 'aurora' 
  | 'oled_black'
  | 'nebula_glow'
  | 'forest_mist'
  | 'cyber_grid'
  | 'sunset_dream'
  | 'custom';

export const DEFAULT_BUBBLE_SETTINGS: BubbleSettings = {
  radius: 'rounded',
  fontSize: 'medium',
  colorScheme: 'theme',
  bubbleOpacity: 100,
  densePadding: false
};

export interface ThemeColorConfig {
  id: ThemeColor;
  name: string;
  primaryHex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  ringClass: string;
  glowClass: string;
  gradientFrom: string;
  gradientTo: string;
}

export const THEME_COLOR_MAP: Record<ThemeColor, ThemeColorConfig> = {
  blue: {
    id: 'blue',
    name: 'Connecto Blue',
    primaryHex: '#2563eb',
    bgClass: 'bg-blue-600',
    textClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-600 dark:border-blue-500',
    ringClass: 'ring-blue-500/30',
    glowClass: 'shadow-blue-500/20',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-indigo-600'
  },
  emerald: {
    id: 'emerald',
    name: 'WhatsApp Emerald',
    primaryHex: '#00a884',
    bgClass: 'bg-[#008069] dark:bg-[#005c4b]',
    textClass: 'text-[#00a884] dark:text-[#00a884]',
    borderClass: 'border-[#00a884]',
    ringClass: 'ring-[#00a884]/30',
    glowClass: 'shadow-[#00a884]/20',
    gradientFrom: 'from-[#00a884]',
    gradientTo: 'to-[#005c4b]'
  },
  purple: {
    id: 'purple',
    name: 'Royal Purple',
    primaryHex: '#9333ea',
    bgClass: 'bg-purple-600',
    textClass: 'text-purple-600 dark:text-purple-400',
    borderClass: 'border-purple-600 dark:border-purple-500',
    ringClass: 'ring-purple-500/30',
    glowClass: 'shadow-purple-500/20',
    gradientFrom: 'from-purple-600',
    gradientTo: 'to-fuchsia-600'
  },
  amber: {
    id: 'amber',
    name: 'Warm Amber',
    primaryHex: '#d97706',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-500 dark:border-amber-400',
    ringClass: 'ring-amber-500/30',
    glowClass: 'shadow-amber-500/20',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-orange-500'
  },
  rose: {
    id: 'rose',
    name: 'Instagram Rose',
    primaryHex: '#e11d48',
    bgClass: 'bg-rose-500',
    textClass: 'text-rose-600 dark:text-rose-400',
    borderClass: 'border-rose-500 dark:border-rose-400',
    ringClass: 'ring-rose-500/30',
    glowClass: 'shadow-rose-500/20',
    gradientFrom: 'from-rose-500',
    gradientTo: 'to-pink-600'
  },
  cyan: {
    id: 'cyan',
    name: 'Electric Cyan',
    primaryHex: '#0891b2',
    bgClass: 'bg-cyan-500',
    textClass: 'text-cyan-600 dark:text-cyan-400',
    borderClass: 'border-cyan-500 dark:border-cyan-400',
    ringClass: 'ring-cyan-500/30',
    glowClass: 'shadow-cyan-500/20',
    gradientFrom: 'from-cyan-500',
    gradientTo: 'to-blue-500'
  },
  indigo: {
    id: 'indigo',
    name: 'Cosmic Indigo',
    primaryHex: '#4f46e5',
    bgClass: 'bg-indigo-600',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    borderClass: 'border-indigo-600 dark:border-indigo-500',
    ringClass: 'ring-indigo-500/30',
    glowClass: 'shadow-indigo-500/20',
    gradientFrom: 'from-indigo-600',
    gradientTo: 'to-purple-700'
  },
  orange: {
    id: 'orange',
    name: 'Vibrant Orange',
    primaryHex: '#ea580c',
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-600 dark:text-orange-400',
    borderClass: 'border-orange-500 dark:border-orange-400',
    ringClass: 'ring-orange-500/30',
    glowClass: 'shadow-orange-500/20',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-red-500'
  },
  teal: {
    id: 'teal',
    name: 'Oceanic Teal',
    primaryHex: '#0d9488',
    bgClass: 'bg-teal-600',
    textClass: 'text-teal-600 dark:text-teal-400',
    borderClass: 'border-teal-600 dark:border-teal-500',
    ringClass: 'ring-teal-500/30',
    glowClass: 'shadow-teal-500/20',
    gradientFrom: 'from-teal-600',
    gradientTo: 'to-emerald-600'
  },
  crimson: {
    id: 'crimson',
    name: 'Ruby Crimson',
    primaryHex: '#dc2626',
    bgClass: 'bg-red-600',
    textClass: 'text-red-600 dark:text-red-400',
    borderClass: 'border-red-600 dark:border-red-500',
    ringClass: 'ring-red-500/30',
    glowClass: 'shadow-red-500/20',
    gradientFrom: 'from-red-600',
    gradientTo: 'to-rose-700'
  }
};

interface ThemeContextType {
  theme: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  themeColor: ThemeColor;
  colorConfig: ThemeColorConfig;
  chatBackground: ChatBackground;
  appBackground: AppBackground;
  customAppWallpaper: string;
  customChatWallpaper: string;
  chatWallpaperBlur: number;
  chatWallpaperBrightness: number;
  bubbleSettings: BubbleSettings;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setThemeColor: (color: ThemeColor) => void;
  setChatBackground: (bg: ChatBackground) => void;
  setAppBackground: (bg: AppBackground) => void;
  setCustomAppWallpaper: (url: string) => void;
  setCustomChatWallpaper: (url: string) => void;
  setChatWallpaperBlur: (blur: number) => void;
  setChatWallpaperBrightness: (brightness: number) => void;
  setBubbleSettings: (settings: Partial<BubbleSettings>) => void;
  resetBubbleSettings: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = safeGetItem<ThemeMode>('connecto_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'system';
  });

  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    const saved = safeGetItem<string>('connecto_theme_color');
    if (saved && Object.keys(THEME_COLOR_MAP).includes(saved)) {
      return saved as ThemeColor;
    }
    return 'emerald';
  });

  const [chatBackground, setChatBackgroundState] = useState<ChatBackground>(() => {
    const saved = safeGetItem<ChatBackground>('connecto_chat_bg');
    if (saved) return saved;
    return 'default';
  });

  const [appBackground, setAppBackgroundState] = useState<AppBackground>(() => {
    const saved = safeGetItem<AppBackground>('connecto_app_bg');
    if (saved) return saved;
    return 'default';
  });

  const [customAppWallpaper, setCustomAppWallpaperState] = useState<string>(() => {
    return safeGetItem<string>('connecto_custom_app_wallpaper') || '';
  });

  const [customChatWallpaper, setCustomChatWallpaperState] = useState<string>(() => {
    return safeGetItem<string>('connecto_custom_chat_wallpaper') || '';
  });

  const [chatWallpaperBlur, setChatWallpaperBlurState] = useState<number>(() => {
    const saved = safeGetItem<number | string>('connecto_chat_blur');
    return saved ? Number(saved) : 0;
  });

  const [chatWallpaperBrightness, setChatWallpaperBrightnessState] = useState<number>(() => {
    const saved = safeGetItem<number | string>('connecto_chat_brightness');
    return saved ? Number(saved) : 100;
  });

  const [bubbleSettings, setBubbleSettingsState] = useState<BubbleSettings>(() => {
    try {
      const saved = safeGetItem<Partial<BubbleSettings>>('connecto_bubble_settings');
      if (saved && typeof saved === 'object') {
        return { ...DEFAULT_BUBBLE_SETTINGS, ...saved };
      }
    } catch {
      // fallback
    }
    return DEFAULT_BUBBLE_SETTINGS;
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  // Update primary theme colors & dark mode
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
    safeSetItem('connecto_theme', theme);

    const listener = () => {
      if (theme === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  // Update CSS Accent color variables dynamically
  useEffect(() => {
    const root = document.documentElement;
    const config = THEME_COLOR_MAP[themeColor] || THEME_COLOR_MAP.blue;
    root.style.setProperty('--color-primary', config.primaryHex);
    root.setAttribute('data-theme-color', themeColor);
  }, [themeColor]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    safeSetItem('connecto_theme_color', color);
  };

  const setChatBackground = (bg: ChatBackground) => {
    setChatBackgroundState(bg);
    safeSetItem('connecto_chat_bg', bg);
  };

  const setAppBackground = (bg: AppBackground) => {
    setAppBackgroundState(bg);
    safeSetItem('connecto_app_bg', bg);
  };

  const setCustomAppWallpaper = (url: string) => {
    setCustomAppWallpaperState(url);
    safeSetItem('connecto_custom_app_wallpaper', url);
  };

  const setCustomChatWallpaper = (url: string) => {
    setCustomChatWallpaperState(url);
    safeSetItem('connecto_custom_chat_wallpaper', url);
  };

  const setChatWallpaperBlur = (blur: number) => {
    setChatWallpaperBlurState(blur);
    safeSetItem('connecto_chat_blur', blur);
  };

  const setChatWallpaperBrightness = (brightness: number) => {
    setChatWallpaperBrightnessState(brightness);
    safeSetItem('connecto_chat_brightness', brightness);
  };

  const setBubbleSettings = (partial: Partial<BubbleSettings>) => {
    setBubbleSettingsState((prev) => {
      const updated = { ...prev, ...partial };
      safeSetItem('connecto_bubble_settings', updated);
      return updated;
    });
  };

  const resetBubbleSettings = () => {
    setBubbleSettingsState(DEFAULT_BUBBLE_SETTINGS);
    safeSetItem('connecto_bubble_settings', DEFAULT_BUBBLE_SETTINGS);
  };

  const colorConfig = THEME_COLOR_MAP[themeColor] || THEME_COLOR_MAP.blue;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        effectiveTheme,
        themeColor,
        colorConfig,
        chatBackground,
        appBackground,
        customAppWallpaper,
        customChatWallpaper,
        chatWallpaperBlur,
        chatWallpaperBrightness,
        bubbleSettings,
        setTheme,
        toggleTheme,
        setThemeColor,
        setChatBackground,
        setAppBackground,
        setCustomAppWallpaper,
        setCustomChatWallpaper,
        setChatWallpaperBlur,
        setChatWallpaperBrightness,
        setBubbleSettings,
        resetBubbleSettings
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

