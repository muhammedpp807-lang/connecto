import React, { createContext, useContext, useState, useEffect } from 'react';
import { ToastNotification, UserSettings } from '../types';
import { playNotificationSound } from '../utils/soundUtils';
import { safeGetItem, safeSetItem } from '../services/storageEngine';

interface NotificationContextType {
  toasts: ToastNotification[];
  settings: UserSettings;
  showToast: (type: ToastNotification['type'], message: string, title?: string) => void;
  removeToast: (id: string) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  requestBrowserPermission: () => Promise<boolean>;
}

const DEFAULT_SETTINGS: UserSettings = {
  appearance: 'system',
  sounds: true,
  browserNotifications: false,
  readReceipts: true,
  lastSeenPrivacy: 'everyone',
  onlineStatusPrivacy: 'everyone'
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = safeGetItem<Partial<UserSettings>>('connecto_user_settings');
      if (saved && typeof saved === 'object') return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (updates: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      safeSetItem('connecto_user_settings', next);
      return next;
    });
  };

  const showToast = (type: ToastNotification['type'], message: string, title?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const newToast: ToastNotification = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    if (settings.sounds && type !== 'info') {
      playNotificationSound();
    }

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const requestBrowserPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    try {
      const perm = await Notification.requestPermission();
      const granted = perm === 'granted';
      updateSettings({ browserNotifications: granted });
      return granted;
    } catch {
      return false;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        settings,
        showToast,
        removeToast,
        updateSettings,
        requestBrowserPermission
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
