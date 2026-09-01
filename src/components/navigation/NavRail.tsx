import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  CircleDashed, 
  Users, 
  Gamepad2,
  Sliders, 
  User, 
  Bell, 
  Sun, 
  Moon, 
  HelpCircle,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';

export type AppNavTab = 'chats' | 'status' | 'contacts' | 'games' | 'settings' | 'profile';

interface NavRailProps {
  activeTab: AppNavTab;
  onTabChange: (tab: AppNavTab) => void;
  unreadChatsCount?: number;
  activeStatusCount?: number;
  activeGamesCount?: number;
  onOpenHelp?: () => void;
}

export const NavRail: React.FC<NavRailProps> = ({
  activeTab,
  onTabChange,
  unreadChatsCount = 0,
  activeStatusCount = 0,
  activeGamesCount = 0,
  onOpenHelp
}) => {
  const { profile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { effectiveTheme, toggleTheme, colorConfig } = useTheme();
  const { settings, updateSettings, showToast } = useNotifications();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleToggleNotifications = () => {
    const next = !settings.sounds;
    updateSettings({ sounds: next });
    showToast('info', next ? 'Sound notifications enabled' : 'Sound notifications muted');
  };

  const navItems: { id: AppNavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'chats',
      label: 'Chats',
      icon: <MessageSquare className="w-5 h-5 stroke-[1.8]" />,
      badge: unreadChatsCount > 0 ? unreadChatsCount : undefined
    },
    {
      id: 'status',
      label: 'Status',
      icon: <CircleDashed className="w-5 h-5 stroke-[1.8]" />,
      badge: activeStatusCount > 0 ? activeStatusCount : undefined
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: <Users className="w-5 h-5 stroke-[1.8]" />,
    },
    {
      id: 'games',
      label: 'Games',
      icon: <Gamepad2 className="w-5 h-5 stroke-[1.8]" />,
      badge: activeGamesCount > 0 ? activeGamesCount : undefined
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Sliders className="w-5 h-5 stroke-[1.8]" />
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="w-5 h-5 stroke-[1.8]" />
    }
  ];

  return (
    <nav 
      id="pulse-nav-rail"
      aria-label="Main Navigation"
      className="w-[68px] sm:w-[72px] h-full flex flex-col items-center justify-between py-4 bg-[#f0f2f5] dark:bg-[#0c1317] border-r border-[#e9edef] dark:border-[#1e293b]/60 select-none flex-shrink-0 z-30 transition-colors"
    >
      {/* Top Section: Brand & Nav Items */}
      <div className="flex flex-col items-center w-full space-y-5">
        {/* Brand Logo "Pulse" */}
        <button
          type="button"
          onClick={() => onTabChange('chats')}
          className="group flex flex-col items-center justify-center text-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title="Pulse Messenger"
        >
          <span 
            style={{ color: colorConfig.primaryHex }}
            className="text-base sm:text-lg font-black tracking-tight drop-shadow-xs transition-colors"
          >
            Pulse
          </span>
        </button>

        {/* Navigation Tabs */}
        <div className="flex flex-col items-center w-full space-y-2 px-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`relative w-full py-2.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#1e293b]/80 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#1e293b]/40'
                }`}
                style={isActive ? { color: colorConfig.primaryHex } : undefined}
                title={item.label}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-[#f0f2f5] dark:border-[#0c1317]">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span 
                  className={`text-[10px] tracking-tight font-medium ${
                    isActive ? 'font-bold' : 'text-slate-600 dark:text-slate-400'
                  }`}
                  style={isActive ? { color: colorConfig.primaryHex } : undefined}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Notification, Theme, Help */}
      <div className="flex flex-col items-center w-full space-y-3 px-2">
        {/* Admin Link if Admin */}
        {isAdmin && (
          <a
            href="/admin"
            className="w-full py-2 rounded-xl flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-[#1e293b]/50 transition"
            title="Admin Dashboard"
          >
            <ShieldCheck className="w-4 h-4 stroke-[1.8]" />
            <span className="text-[9px] font-semibold mt-0.5">Admin</span>
          </a>
        )}

        {/* Notifications Sound Toggle */}
        <button
          type="button"
          onClick={handleToggleNotifications}
          className={`p-2 rounded-xl transition cursor-pointer ${
            settings.sounds 
              ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#1e293b]/50' 
              : 'text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-400'
          }`}
          title={settings.sounds ? 'Sound Notifications: On' : 'Sound Notifications: Off'}
          aria-label="Toggle notifications"
        >
          <Bell className="w-4 h-4 stroke-[1.8]" />
        </button>

        {/* Theme Toggle (Light / Dark) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 py-1.5 px-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-[#1e293b]/50 transition cursor-pointer w-full"
          title={`Switch to ${effectiveTheme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle color theme"
        >
          {effectiveTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 stroke-[1.8]" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 stroke-[1.8]" />
          )}
          <span className="text-[10px] font-medium mt-0.5 text-slate-600 dark:text-slate-400">
            {effectiveTheme === 'dark' ? 'Light' : 'Dark'}
          </span>
        </button>

        {/* Help / FAQ Icon Button */}
        <button
          type="button"
          onClick={onOpenHelp}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#1e293b]/50 transition cursor-pointer"
          title="Help & Shortcuts"
          aria-label="Help and shortcuts"
        >
          <HelpCircle className="w-5 h-5 stroke-[1.8]" />
        </button>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="p-2 rounded-xl text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
          title="Sign Out"
          aria-label="Sign out"
        >
          <LogOut className="w-5 h-5 stroke-[1.8]" />
        </button>
      </div>
    </nav>
  );
};

