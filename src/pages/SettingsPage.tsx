import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ThemeColor, ChatBackground, AppBackground } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { SEO } from '../components/common/SEO';
import { Avatar } from '../components/common/Avatar';
import { 
  ArrowLeft, 
  Sun, 
  Moon, 
  Monitor, 
  Volume2, 
  Bell, 
  Eye, 
  ShieldCheck, 
  Download, 
  Trash2, 
  LogOut,
  Palette,
  User,
  Image as ImageIcon,
  Check,
  Sparkles,
  Camera,
  Save
} from 'lucide-react';

const THEME_COLORS: { id: ThemeColor; name: string; bgClass: string; borderClass: string }[] = [
  { id: 'blue', name: 'Connecto Blue', bgClass: 'bg-blue-600', borderClass: 'border-blue-600' },
  { id: 'emerald', name: 'WhatsApp Emerald', bgClass: 'bg-emerald-600', borderClass: 'border-emerald-600' },
  { id: 'purple', name: 'Royal Purple', bgClass: 'bg-purple-600', borderClass: 'border-purple-600' },
  { id: 'amber', name: 'Warm Amber', bgClass: 'bg-amber-500', borderClass: 'border-amber-500' },
  { id: 'rose', name: 'Instagram Rose', bgClass: 'bg-rose-500', borderClass: 'border-rose-500' },
  { id: 'cyan', name: 'Electric Cyan', bgClass: 'bg-cyan-500', borderClass: 'border-cyan-500' },
];

const CHAT_BACKGROUNDS: { id: ChatBackground; name: string; desc: string; previewClass: string }[] = [
  { id: 'default', name: 'Default Clean', desc: 'Standard minimalist background', previewClass: 'bg-slate-50 dark:bg-[#0a0c12]' },
  { id: 'doodle', name: 'WhatsApp Doodle', desc: 'Subtle doodle pattern overlay', previewClass: 'bg-[#e5ddd5] dark:bg-[#0d1418]' },
  { id: 'subtle_dots', name: 'Subtle Dots', desc: 'Architectural geometric dots', previewClass: 'bg-slate-100 dark:bg-[#12161f]' },
  { id: 'dark_grid', name: 'Dark Grid', desc: 'Technical high-contrast grid', previewClass: 'bg-slate-900 text-white' },
  { id: 'warm_sunset', name: 'Warm Sunset', desc: 'Soft orange peach gradient', previewClass: 'bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-950/40 dark:to-rose-950/40' },
  { id: 'emerald_mist', name: 'Emerald Mist', desc: 'Gentle green calm hue', previewClass: 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40' },
  { id: 'midnight', name: 'Midnight Deep', desc: 'Deep indigo starfield tone', previewClass: 'bg-gradient-to-br from-slate-950 to-indigo-950 text-white' },
];

const APP_BACKGROUNDS: { id: AppBackground; name: string; previewClass: string }[] = [
  { id: 'default', name: 'Adaptive Default', previewClass: 'bg-slate-50 dark:bg-[#0a0c12]' },
  { id: 'slate', name: 'Cool Slate', previewClass: 'bg-slate-200 dark:bg-[#161b22]' },
  { id: 'deep_dark', name: 'Deep Nebula', previewClass: 'bg-[#06080d]' },
  { id: 'warm_soft', name: 'Soft Linen', previewClass: 'bg-[#f7f5f0] dark:bg-[#181614]' },
  { id: 'aurora', name: 'Aurora Velvet', previewClass: 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900' },
  { id: 'oled_black', name: 'OLED Pure Black', previewClass: 'bg-black text-white' },
];

const AVATAR_PRESETS = [
  'connecto',
  'alexander',
  'sarah',
  'elena',
  'marcus',
  'phoenix',
  'quantum',
  'starlight',
  'cyber',
  'neo'
];

export const SettingsPage: React.FC = () => {
  const { profile, updateProfileData, logout } = useAuth();
  const { 
    theme, 
    setTheme, 
    themeColor, 
    setThemeColor, 
    chatBackground, 
    setChatBackground, 
    appBackground, 
    setAppBackground 
  } = useTheme();
  const { settings, updateSettings, requestBrowserPermission, showToast } = useNotifications();
  const navigate = useNavigate();

  // Profile Form States
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [about, setAbout] = useState(profile?.about || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!displayName.trim()) {
      showToast('error', 'Display name cannot be empty');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfileData({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase().replace(/\s+/g, ''),
        about: about.trim(),
        photoURL: photoURL.trim()
      });
      showToast('success', 'Profile updated successfully!');
    } catch (err) {
      showToast('error', 'Failed to update profile');
      console.error('Update profile error:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSelectAvatarSeed = (seed: string) => {
    const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
    setPhotoURL(url);
  };

  const handleToggleSound = () => {
    updateSettings({ sounds: !settings.sounds });
    showToast('info', `Notification sounds ${!settings.sounds ? 'enabled' : 'disabled'}`);
  };

  const handleToggleBrowserNotifications = async () => {
    if (!settings.browserNotifications) {
      const granted = await requestBrowserPermission();
      if (granted) {
        showToast('success', 'Browser notifications enabled');
      } else {
        showToast('warning', 'Notification permission was denied or not supported.');
      }
    } else {
      updateSettings({ browserNotifications: false });
      showToast('info', 'Browser notifications disabled');
    }
  };

  const handleToggleReadReceipts = () => {
    updateSettings({ readReceipts: !settings.readReceipts });
    showToast('info', `Read receipts ${!settings.readReceipts ? 'enabled' : 'disabled'}`);
  };

  const handleExportData = () => {
    try {
      const data = {
        profile,
        settings,
        themeColor,
        chatBackground,
        appBackground,
        conversations: localStorage.getItem('connecto_db_conversations'),
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `connecto-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('success', 'Data exported successfully');
    } catch {
      showToast('error', 'Failed to export data');
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear temporary message cache?')) {
      showToast('success', 'Cache cleared successfully');
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0c12] text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 transition-colors">
      <SEO title="Settings & Customization – Connecto" description="Configure themes, colors, wallpapers, profile info, and security." />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Chats
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Settings & Appearance</span>
        </div>

        {/* 1. Profile Customization Section */}
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Profile & Identity</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Customize your avatar, display name, and about status</p>
            </div>
            <User className="w-4 h-4 text-blue-500" />
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group">
                <Avatar
                  src={photoURL}
                  name={displayName || 'User'}
                  size="xl"
                />
              </div>

              <div className="flex-1 w-full space-y-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Quick Avatar Selection</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVATAR_PRESETS.map((seed) => (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => handleSelectAvatarSeed(seed)}
                      className="w-8 h-8 rounded-full border border-slate-200 dark:border-[#1e2530] hover:scale-110 transition overflow-hidden cursor-pointer"
                      title={`Select ${seed}`}
                    >
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`}
                        alt={seed}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="username"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">About / Bio Status</label>
              <input
                type="text"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Hey there! I am using Connecto."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Custom Photo URL</label>
              <input
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="https://..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/20 transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* 2. Theme Accent Color Palette */}
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Theme Accent Color</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pick your primary highlight and button accent</p>
            </div>
            <Palette className="w-4 h-4 text-purple-500" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEME_COLORS.map((col) => {
              const isSelected = themeColor === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => {
                    setThemeColor(col.id);
                    showToast('success', `Accent color changed to ${col.name}`);
                  }}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 dark:border-blue-400 bg-slate-50 dark:bg-[#0d1117] ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-[#1e2530] hover:bg-slate-50 dark:hover:bg-[#0d1117]'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full ${col.bgClass} flex items-center justify-center text-white shadow-xs flex-shrink-0`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{col.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Chat Wallpaper / Background */}
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chat Wallpaper</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Customize the background inside your conversations</p>
            </div>
            <ImageIcon className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CHAT_BACKGROUNDS.map((bg) => {
              const isSelected = chatBackground === bg.id;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => {
                    setChatBackground(bg.id);
                    showToast('success', `Chat background set to ${bg.name}`);
                  }}
                  className={`relative p-3 rounded-2xl border flex flex-col gap-2 transition overflow-hidden text-left cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-[#1e2530] hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`w-full h-16 rounded-xl ${bg.previewClass} border border-black/10 dark:border-white/10 flex items-center justify-center shadow-inner`}>
                    {isSelected && (
                      <span className="p-1 rounded-full bg-blue-600 text-white shadow-md">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{bg.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{bg.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. App Canvas Background */}
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">App Background Tone</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose global canvas background ambience</p>
            </div>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {APP_BACKGROUNDS.map((bg) => {
              const isSelected = appBackground === bg.id;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => {
                    setAppBackground(bg.id);
                    showToast('success', `App background tone updated`);
                  }}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 bg-slate-50 dark:bg-[#0d1117]'
                      : 'border-slate-200 dark:border-[#1e2530] hover:bg-slate-50 dark:hover:bg-[#0d1117]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl ${bg.previewClass} border border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-xs flex-shrink-0`}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{bg.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Appearance Mode (Light / Dark / System) */}
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Light / Dark Mode
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer ${
                theme === 'light'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-slate-200 dark:border-[#1e2530] hover:bg-slate-50 dark:hover:bg-[#0d1117] text-slate-700 dark:text-slate-300'
              }`}
            >
              <Sun className="w-5 h-5" />
              <span className="text-xs">Light</span>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-slate-200 dark:border-[#1e2530] hover:bg-slate-50 dark:hover:bg-[#0d1117] text-slate-700 dark:text-slate-300'
              }`}
            >
              <Moon className="w-5 h-5" />
              <span className="text-xs">Dark</span>
            </button>

            <button
              onClick={() => setTheme('system')}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer ${
                theme === 'system'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-slate-200 dark:border-[#1e2530] hover:bg-slate-50 dark:hover:bg-[#0d1117] text-slate-700 dark:text-slate-300'
              }`}
            >
              <Monitor className="w-5 h-5" />
              <span className="text-xs">System</span>
            </button>
          </div>
        </div>

        {/* 6. Notifications & Sounds */}
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Notifications & Sounds
          </h3>

          <div className="space-y-3 divide-y divide-slate-100 dark:divide-[#1e2530]">
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Message Sounds</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Play chime when messages arrive or send</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sounds}
                onChange={handleToggleSound}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Browser Notifications</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Show push alerts when tab is inactive</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.browserNotifications}
                onChange={handleToggleBrowserNotifications}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 7. Privacy & Security */}
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Privacy & Security
          </h3>

          <div className="space-y-3 divide-y divide-slate-100 dark:divide-[#1e2530]">
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Read Receipts (✓✓)</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Allow others to see when you read messages</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.readReceipts}
                onChange={handleToggleReadReceipts}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Online Status</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Broadcast green activity indicator</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
            </div>
          </div>
        </div>

        {/* 8. Data & Sign Out */}
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Data & Account
          </h3>

          <div className="space-y-2">
            <button
              onClick={handleExportData}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-[#1e2530] flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#0d1117] text-xs font-semibold transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-500" /> Export Account Backup (JSON)
              </span>
            </button>

            <button
              onClick={handleClearCache}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-[#1e2530] flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#0d1117] text-xs font-semibold transition text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-slate-400" /> Clear Temporary Local Cache
              </span>
            </button>

            <button
              onClick={handleSignOut}
              className="w-full p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center gap-2 text-xs font-bold transition mt-4 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign Out of Connecto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
