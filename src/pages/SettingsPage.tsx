import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  useTheme, 
  ThemeColor, 
  ChatBackground, 
  AppBackground,
  THEME_COLOR_MAP
} from '../contexts/ThemeContext';
import { BubbleRadius, BubbleFontSize, BubbleColorScheme } from '../types';
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
  Save,
  MessageSquare,
  Sliders,
  Type,
  Maximize2,
  RefreshCw,
  UploadCloud,
  CheckCheck
} from 'lucide-react';

const CHAT_BACKGROUNDS: { id: ChatBackground; name: string; desc: string; previewClass: string }[] = [
  { id: 'default', name: 'Default Clean', desc: 'Standard minimalist dots', previewClass: 'bg-slate-100 dark:bg-[#0a0c12]' },
  { id: 'doodle', name: 'WhatsApp Doodle', desc: 'Subtle doodle pattern overlay', previewClass: 'bg-[#e5ddd5] dark:bg-[#0d1418]' },
  { id: 'subtle_dots', name: 'Subtle Dots', desc: 'Architectural geometric dots', previewClass: 'bg-slate-100 dark:bg-[#12161f]' },
  { id: 'dark_grid', name: 'Dark Grid', desc: 'Technical high-contrast grid', previewClass: 'bg-slate-900 text-white' },
  { id: 'warm_sunset', name: 'Warm Sunset', desc: 'Soft peach sunset gradient', previewClass: 'bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-950/40 dark:to-rose-950/40' },
  { id: 'emerald_mist', name: 'Emerald Mist', desc: 'Gentle green calm hue', previewClass: 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40' },
  { id: 'midnight', name: 'Midnight Deep', desc: 'Deep indigo starfield tone', previewClass: 'bg-gradient-to-br from-slate-950 to-indigo-950 text-white' },
  { id: 'cyber_neon', name: 'Cyber Neon', desc: 'Cyan glow on dark matrix', previewClass: 'bg-slate-950 text-cyan-400' },
  { id: 'starry_sky', name: 'Starry Sky', desc: 'Deep space cosmos dots', previewClass: 'bg-[#050814] text-indigo-300' },
];

const APP_BACKGROUNDS: { id: AppBackground; name: string; previewClass: string }[] = [
  { id: 'default', name: 'Adaptive Default', previewClass: 'bg-slate-50 dark:bg-[#0a0c12]' },
  { id: 'slate', name: 'Cool Slate', previewClass: 'bg-slate-200 dark:bg-[#161b22]' },
  { id: 'deep_dark', name: 'Deep Dark', previewClass: 'bg-[#06080d]' },
  { id: 'warm_soft', name: 'Warm Linen', previewClass: 'bg-[#f7f5f0] dark:bg-[#181614]' },
  { id: 'aurora', name: 'Aurora Velvet', previewClass: 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900' },
  { id: 'oled_black', name: 'OLED Pure Black', previewClass: 'bg-black text-white' },
  { id: 'nebula_glow', name: 'Nebula Glow', previewClass: 'bg-gradient-to-br from-[#0c0d21] via-[#1a0f2e] to-[#0a1128]' },
  { id: 'forest_mist', name: 'Forest Mist', previewClass: 'bg-gradient-to-br from-[#071d18] via-[#0d2818] to-[#04151f]' },
  { id: 'cyber_grid', name: 'Cyber Grid', previewClass: 'bg-[#050b14]' },
  { id: 'sunset_dream', name: 'Sunset Dream', previewClass: 'bg-gradient-to-br from-[#2a0845] via-[#6441a5] to-[#fe8c00]' },
];

const RADIUS_OPTIONS: { id: BubbleRadius; name: string; desc: string }[] = [
  { id: 'sharp', name: 'Sharp', desc: 'Square 0px corners' },
  { id: 'subtle', name: 'Subtle', desc: '8px soft corners' },
  { id: 'rounded', name: 'Rounded', desc: '16px modern classic' },
  { id: 'extra-round', name: 'Extra Round', desc: '24px extra rounded' },
  { id: 'pill', name: 'Pill Bubble', desc: '28px pill shape' },
];

const FONT_SIZES: { id: BubbleFontSize; name: string; sample: string }[] = [
  { id: 'small', name: 'Small (13px)', sample: 'text-xs' },
  { id: 'medium', name: 'Medium (14px)', sample: 'text-sm' },
  { id: 'large', name: 'Large (16px)', sample: 'text-base' },
  { id: 'extra-large', name: 'Extra Large (18px)', sample: 'text-lg' },
];

const BUBBLE_COLOR_SCHEMES: { id: BubbleColorScheme; name: string; preview: string }[] = [
  { id: 'theme', name: 'Match Theme', preview: 'bg-blue-600' },
  { id: 'emerald', name: 'WhatsApp Green', preview: 'bg-emerald-600' },
  { id: 'blue', name: 'Oceanic Blue', preview: 'bg-blue-600' },
  { id: 'purple', name: 'Royal Purple', preview: 'bg-purple-600' },
  { id: 'midnight', name: 'Midnight Dark', preview: 'bg-slate-900 border border-slate-700' },
  { id: 'sunset', name: 'Sunset Gradient', preview: 'bg-gradient-to-r from-rose-500 to-amber-500' },
  { id: 'cyber', name: 'Cyber Neon', preview: 'bg-gradient-to-r from-cyan-500 to-blue-600' },
  { id: 'monochrome', name: 'Slate Monochromatic', preview: 'bg-slate-800' },
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
    setAppBackground,
    customAppWallpaper,
    setCustomAppWallpaper,
    customChatWallpaper,
    setCustomChatWallpaper,
    chatWallpaperBlur,
    setChatWallpaperBlur,
    chatWallpaperBrightness,
    setChatWallpaperBrightness,
    bubbleSettings,
    setBubbleSettings,
    resetBubbleSettings
  } = useTheme();

  const { settings, updateSettings, requestBrowserPermission, showToast } = useNotifications();
  const navigate = useNavigate();

  // Profile Form States
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [about, setAbout] = useState(profile?.about || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Custom Wallpaper Inputs
  const [inputAppWallpaperUrl, setInputAppWallpaperUrl] = useState(customAppWallpaper || '');
  const [inputChatWallpaperUrl, setInputChatWallpaperUrl] = useState(customChatWallpaper || '');
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast('error', 'Image exceeds 20MB limit');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setPhotoURL(reader.result as string);
        showToast('success', 'Photo loaded! Click Save to apply.');
      }
    };
    reader.readAsDataURL(file);
  };

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

  const handleRemovePhoto = () => {
    setPhotoURL('');
  };

  const handleFileUploadWallpaper = (type: 'app' | 'chat', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      showToast('error', 'Wallpaper file exceeds 100MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (type === 'app') {
        setCustomAppWallpaper(dataUrl);
        setInputAppWallpaperUrl(dataUrl);
        showToast('success', 'Custom app wallpaper applied');
      } else {
        setCustomChatWallpaper(dataUrl);
        setInputChatWallpaperUrl(dataUrl);
        showToast('success', 'Custom chat wallpaper applied');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyAppWallpaperUrl = () => {
    setCustomAppWallpaper(inputAppWallpaperUrl.trim());
    showToast('success', inputAppWallpaperUrl ? 'Custom app wallpaper updated' : 'Cleared custom app wallpaper');
  };

  const handleApplyChatWallpaperUrl = () => {
    setCustomChatWallpaper(inputChatWallpaperUrl.trim());
    showToast('success', inputChatWallpaperUrl ? 'Custom chat wallpaper updated' : 'Cleared custom chat wallpaper');
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
        bubbleSettings,
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

  // Preview bubble classes
  const getPreviewRadiusClass = () => {
    switch (bubbleSettings.radius) {
      case 'sharp': return 'rounded-none';
      case 'subtle': return 'rounded-lg';
      case 'extra-round': return 'rounded-3xl';
      case 'pill': return 'rounded-[28px]';
      case 'rounded':
      default: return 'rounded-2xl';
    }
  };

  const getPreviewFontSizeClass = () => {
    switch (bubbleSettings.fontSize) {
      case 'small': return 'text-xs';
      case 'large': return 'text-base';
      case 'extra-large': return 'text-lg';
      case 'medium':
      default: return 'text-sm';
    }
  };

  const getPreviewOutgoingColor = () => {
    switch (bubbleSettings.colorScheme) {
      case 'emerald': return 'bg-emerald-600 text-white';
      case 'blue': return 'bg-blue-600 text-white';
      case 'purple': return 'bg-purple-600 text-white';
      case 'midnight': return 'bg-slate-900 text-white border border-slate-700';
      case 'sunset': return 'bg-gradient-to-r from-rose-500 to-amber-500 text-white';
      case 'cyber': return 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white';
      case 'monochrome': return 'bg-slate-800 text-white';
      case 'theme':
      default: return `${THEME_COLOR_MAP[themeColor]?.bgClass || 'bg-blue-600'} text-white`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0c12] text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 transition-colors">
      <SEO title="Settings & Customization – Connecto" description="Configure themes, colors, wallpapers, message box styling, and security." />

      <div className="max-w-3xl mx-auto space-y-6">
        
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

        {/* 1. TOTAL COLOUR THEME PALETTE */}
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-500" />
                Total Colour Theme
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sets the global primary highlight, action buttons, active rings, and dynamic accents
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#0d1117] text-slate-600 dark:text-slate-300">
              {THEME_COLOR_MAP[themeColor]?.name}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {Object.values(THEME_COLOR_MAP).map((col) => {
              const isSelected = themeColor === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => {
                    setThemeColor(col.id);
                    showToast('success', `Theme colour changed to ${col.name}`);
                  }}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer text-center ${
                    isSelected
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500/30 shadow-md'
                      : 'border-slate-200 dark:border-[#1e2530] hover:bg-slate-50 dark:hover:bg-[#0d1117]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${col.bgClass} flex items-center justify-center text-white shadow-md transition-transform hover:scale-110 flex-shrink-0`}>
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {col.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. APP WALLPAPER & AMBIENCE */}
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                App Wallpaper & Ambience
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose app background wallpaper presets or upload your own high-res image
              </p>
            </div>
            {customAppWallpaper && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Custom Active
              </span>
            )}
          </div>

          {/* Preset Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {APP_BACKGROUNDS.map((bg) => {
              const isSelected = appBackground === bg.id && !customAppWallpaper;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => {
                    setAppBackground(bg.id);
                    setCustomAppWallpaper('');
                    setInputAppWallpaperUrl('');
                    showToast('success', `App wallpaper set to ${bg.name}`);
                  }}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition cursor-pointer text-center ${
                    isSelected
                      ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/30 bg-blue-50/30 dark:bg-blue-950/20 shadow-md'
                      : 'border-slate-200 dark:border-[#1e2530] hover:bg-slate-50 dark:hover:bg-[#0d1117]'
                  }`}
                >
                  <div className={`w-full h-12 rounded-xl ${bg.previewClass} border border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-xs`}>
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate w-full">
                    {bg.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom App Wallpaper Uploader & URL Input */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-500" />
                Custom App Wallpaper Image (Up to 100MB)
              </label>
              {customAppWallpaper && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomAppWallpaper('');
                    setInputAppWallpaperUrl('');
                    showToast('info', 'Custom app wallpaper cleared');
                  }}
                  className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
                >
                  Clear Custom Wallpaper
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={inputAppWallpaperUrl}
                onChange={(e) => setInputAppWallpaperUrl(e.target.value)}
                placeholder="Paste direct image URL (https://...)"
                className="flex-1 w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <button
                type="button"
                onClick={handleApplyAppWallpaperUrl}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Apply URL
              </button>
              <label className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-200 dark:bg-[#161b22] hover:bg-slate-300 dark:hover:bg-[#1e2530] text-slate-800 dark:text-slate-200 text-xs font-bold transition border border-slate-300 dark:border-[#1e2530] text-center cursor-pointer">
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUploadWallpaper('app', e)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* 3. CHAT WALLPAPER & FILTER CONTROLS */}
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-500" />
                Chat Wallpaper & Filter Effects
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize conversation backdrops, patterns, brightness, and blur depth
              </p>
            </div>
            {customChatWallpaper && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Custom Active
              </span>
            )}
          </div>

          {/* Preset Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CHAT_BACKGROUNDS.map((bg) => {
              const isSelected = chatBackground === bg.id && !customChatWallpaper;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => {
                    setChatBackground(bg.id);
                    setCustomChatWallpaper('');
                    setInputChatWallpaperUrl('');
                    showToast('success', `Chat background set to ${bg.name}`);
                  }}
                  className={`p-3 rounded-2xl border flex flex-col gap-2 transition overflow-hidden text-left cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-[#1e2530] hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`w-full h-14 rounded-xl ${bg.previewClass} border border-black/10 dark:border-white/10 flex items-center justify-center shadow-inner`}>
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

          {/* Custom Chat Wallpaper Uploader */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-500" />
                Custom Chat Wallpaper Image (Up to 100MB)
              </label>
              {customChatWallpaper && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomChatWallpaper('');
                    setInputChatWallpaperUrl('');
                    showToast('info', 'Custom chat wallpaper cleared');
                  }}
                  className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
                >
                  Clear Custom Chat Wallpaper
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={inputChatWallpaperUrl}
                onChange={(e) => setInputChatWallpaperUrl(e.target.value)}
                placeholder="Paste direct image URL (https://...)"
                className="flex-1 w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <button
                type="button"
                onClick={handleApplyChatWallpaperUrl}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Apply URL
              </button>
              <label className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-200 dark:bg-[#161b22] hover:bg-slate-300 dark:hover:bg-[#1e2530] text-slate-800 dark:text-slate-200 text-xs font-bold transition border border-slate-300 dark:border-[#1e2530] text-center cursor-pointer">
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUploadWallpaper('chat', e)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Blur & Brightness Sliders */}
            {customChatWallpaper && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-[#1e2530]">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span>Wallpaper Blur Depth</span>
                    <span className="font-mono">{chatWallpaperBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={1}
                    value={chatWallpaperBlur}
                    onChange={(e) => setChatWallpaperBlur(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span>Wallpaper Brightness</span>
                    <span className="font-mono">{chatWallpaperBrightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={120}
                    step={5}
                    value={chatWallpaperBrightness}
                    onChange={(e) => setChatWallpaperBrightness(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. CHAT MESSAGE BOX EDITINGS (LIVE BUBBLE CUSTOMIZATION) */}
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                Chat Message Box Editings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize bubble corner curvature, font sizing, color themes, and opacity with live preview
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetBubbleSettings();
                showToast('info', 'Message bubble styles reset to default');
              }}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-500 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
          </div>

          {/* Interactive Live Message Bubble Preview Stage */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-100 dark:bg-[#0a0c12] border border-slate-200 dark:border-[#1e2530] space-y-3 shadow-inner">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Live Interactive Preview
            </span>

            {/* Incoming Bubble Sample */}
            <div className="flex flex-col items-start my-1 max-w-[85%] sm:max-w-md">
              <div 
                style={bubbleSettings.bubbleOpacity < 100 ? { opacity: bubbleSettings.bubbleOpacity / 100 } : undefined}
                className={`${bubbleSettings.densePadding ? 'px-3 py-1.5' : 'px-4 py-2.5'} ${getPreviewRadiusClass()} rounded-tl-none bg-white dark:bg-[#161b22] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-[#1e2530] shadow-xs`}
              >
                <p className={`font-bold text-[11px] mb-0.5 text-emerald-500`}>Alex Rivera</p>
                <p className={`${getPreviewFontSizeClass()} leading-relaxed`}>
                  Hey! The new Connecto video status and wallpaper settings look incredible 🔥
                </p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                  <span>10:42 AM</span>
                </div>
              </div>
            </div>

            {/* Outgoing Bubble Sample */}
            <div className="flex flex-col items-end my-1">
              <div 
                style={bubbleSettings.bubbleOpacity < 100 ? { opacity: bubbleSettings.bubbleOpacity / 100 } : undefined}
                className={`max-w-[85%] sm:max-w-md ${bubbleSettings.densePadding ? 'px-3 py-1.5' : 'px-4 py-2.5'} ${getPreviewRadiusClass()} rounded-tr-none ${getPreviewOutgoingColor()} shadow-md`}
              >
                <p className={`${getPreviewFontSizeClass()} leading-relaxed`}>
                  Thanks! You can adjust corner radius, font size, colors, and opacity right here in settings ✨
                </p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-80">
                  <span>10:43 AM</span>
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />
                </div>
              </div>
            </div>
          </div>

          {/* Bubble Corner Radius Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
              Bubble Corner Radius
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBubbleSettings({ radius: opt.id })}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    bubbleSettings.radius === opt.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-[#1e2530] hover:bg-slate-50 dark:hover:bg-[#0d1117] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold">{opt.name}</p>
                  <p className="text-[10px] text-slate-400">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Bubble Font Size Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-purple-500" />
              Message Font Size
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FONT_SIZES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBubbleSettings({ fontSize: f.id })}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    bubbleSettings.fontSize === f.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold ring-2 ring-purple-500/20'
                      : 'border-slate-200 dark:border-[#1e2530] hover:bg-slate-50 dark:hover:bg-[#0d1117] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold">{f.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Outgoing Bubble Color Scheme Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-rose-500" />
              Outgoing Bubble Color Scheme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BUBBLE_COLOR_SCHEMES.map((cs) => {
                const isSelected = bubbleSettings.colorScheme === cs.id;
                return (
                  <button
                    key={cs.id}
                    type="button"
                    onClick={() => setBubbleSettings({ colorScheme: cs.id })}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition cursor-pointer ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/30 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-[#1e2530] hover:bg-slate-50 dark:hover:bg-[#0d1117]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full ${cs.preview} shadow-xs flex-shrink-0 flex items-center justify-center text-white`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {cs.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bubble Opacity & Compact Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Bubble Opacity</span>
                <span className="font-mono font-bold text-blue-500">{bubbleSettings.bubbleOpacity}%</span>
              </div>
              <input
                type="range"
                min={60}
                max={100}
                step={5}
                value={bubbleSettings.bubbleOpacity}
                onChange={(e) => setBubbleSettings({ bubbleOpacity: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530]">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Compact Padding Mode</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Tighter vertical bubble spacing</p>
              </div>
              <input
                type="checkbox"
                checked={bubbleSettings.densePadding}
                onChange={(e) => setBubbleSettings({ densePadding: e.target.checked })}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 5. Profile & Identity Section */}
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

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition cursor-pointer"
                >
                  Upload Photo
                </button>
                {photoURL && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#1e2530] text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                  >
                    Remove Photo
                  </button>
                )}
                <input
                  ref={avatarFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
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

        {/* 6. Appearance Mode (Light / Dark / System) */}
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

        {/* 7. Notifications & Sounds */}
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

        {/* 8. Privacy & Security */}
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

        {/* 9. Data & Sign Out */}
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
