import React, { useState } from 'react';
import { 
  Pencil, 
  Check, 
  X, 
  Loader2, 
  Image as ImageIcon,
  Palette,
  Sun,
  Moon,
  Sparkles,
  Shield,
  LogOut,
  User,
  Sliders,
  Type
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, ThemeColor, ChatBackground } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { checkUsernameAvailable } from '../../services/userService';

const ACCENT_COLORS: { id: ThemeColor; hex: string; name: string }[] = [
  { id: 'emerald', hex: '#10b981', name: 'Teal Green' },
  { id: 'crimson', hex: '#ef4444', name: 'Coral Red' },
  { id: 'purple', hex: '#a855f7', name: 'Purple' },
  { id: 'rose', hex: '#ec4899', name: 'Pink' },
  { id: 'cyan', hex: '#06b6d4', name: 'Cyan' },
  { id: 'amber', hex: '#f97316', name: 'Orange' },
];

const WALLPAPERS: { id: ChatBackground; name: string; bgClass: string }[] = [
  { id: 'default', name: 'Dark Slate', bgClass: 'bg-[#111b21]' },
  { id: 'midnight', name: 'Midnight', bgClass: 'bg-[#0f172a]' },
  { id: 'emerald_mist', name: 'Teal Forest', bgClass: 'bg-[#064e3b]' },
  { id: 'warm_sunset', name: 'Deep Olive', bgClass: 'bg-[#362f1c]' },
  { id: 'dark_grid', name: 'Black Grid', bgClass: 'bg-[#0a0a0a]' },
  { id: 'doodle', name: 'Pattern', bgClass: 'bg-[#18222d] bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:12px_12px]' },
];

export const SettingsPageView: React.FC = () => {
  const { profile, updateProfileData, logout } = useAuth();
  const { effectiveTheme, setTheme, themeColor, setThemeColor, bubbleSettings, setBubbleSettings, chatBackground, setChatBackground, colorConfig } = useTheme();
  const { showToast } = useNotifications();

  // Profile Edit modal/state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (field: string, initial: string) => {
    setEditingField(field);
    setEditValue(initial || '');
  };

  const handleSaveField = async () => {
    if (!profile || !editingField) return;

    setIsSaving(true);
    try {
      if (editingField === 'username') {
        const clean = editValue.trim().toLowerCase();
        if (!clean) {
          showToast('error', 'Username cannot be empty');
          setIsSaving(false);
          return;
        }
        if (clean !== profile.username?.toLowerCase()) {
          const isFree = await checkUsernameAvailable(clean);
          if (!isFree) {
            showToast('error', 'Username is already taken');
            setIsSaving(false);
            return;
          }
        }
        await updateProfileData({ username: clean });
      } else if (editingField === 'displayName') {
        if (!editValue.trim()) {
          showToast('error', 'Display name cannot be empty');
          setIsSaving(false);
          return;
        }
        await updateProfileData({ displayName: editValue.trim() });
      } else if (editingField === 'about' || editingField === 'bio') {
        await updateProfileData({ about: editValue.trim() });
      } else if (editingField === 'statusMessage') {
        await updateProfileData({ statusMessage: editValue.trim() });
      } else if (editingField === 'website') {
        await updateProfileData({ website: editValue.trim() });
      } else if (editingField === 'location') {
        await updateProfileData({ location: editValue.trim() });
      }

      showToast('success', 'Profile updated!');
      setEditingField(null);
    } catch {
      showToast('error', 'Failed to update profile field');
    } finally {
      setIsSaving(false);
    }
  };

  const profileRows = [
    { key: 'displayName', label: 'Display Name', value: profile?.displayName || 'Not set' },
    { key: 'username', label: 'Username', value: profile?.username ? `@${profile.username}` : 'Not set' },
    { key: 'bio', label: 'Bio', value: profile?.about || 'Not set' },
    { key: 'statusMessage', label: 'Status Message', value: profile?.statusMessage || 'Not set' },
    { key: 'website', label: 'Website', value: profile?.website || 'Not set' },
    { key: 'location', label: 'Location', value: profile?.location || 'Not set' },
  ];

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-[#0b141a] text-slate-900 dark:text-slate-100 overflow-y-auto select-none transition-colors">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 border-b border-[#e9edef] dark:border-[#1f2c34] bg-[#f0f2f5] dark:bg-[#111b21]">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
      </div>

      <div className="px-8 py-6 max-w-4xl space-y-10 pb-16">
        {/* Section 1: Appearance */}
        <div className="space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Appearance
          </h2>

          {/* Theme Switch */}
          <div className="flex items-center justify-between py-3 border-b border-[#e9edef] dark:border-[#1f2c34]">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Theme</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Switch between dark and light mode</p>
            </div>
            <button
              type="button"
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              style={effectiveTheme === 'dark' ? { backgroundColor: colorConfig.primaryHex } : undefined}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                effectiveTheme === 'dark' ? '' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  effectiveTheme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Accent Color */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Accent Color</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Choose your favorite primary theme accent</p>
            <div className="flex items-center gap-3 pt-1">
              {ACCENT_COLORS.map((c) => {
                const isSelected = themeColor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setThemeColor(c.id)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-8 h-8 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                      isSelected ? 'ring-2 ring-slate-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-[#0b141a] scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    title={c.name}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Font Size</h3>
            <div className="flex items-center gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => {
                const isSelected = bubbleSettings.fontSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setBubbleSettings({ fontSize: size })}
                    style={isSelected ? { borderColor: colorConfig.primaryHex, color: colorConfig.primaryHex } : undefined}
                    className={`px-5 py-2 rounded-xl text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-[#1f2c34] border'
                        : 'bg-[#f0f2f5] dark:bg-[#111b21] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1f2c34]'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Wallpaper */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Chat Wallpaper</h3>
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {WALLPAPERS.map((wp) => {
                const isSelected = chatBackground === wp.id;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => setChatBackground(wp.id)}
                    style={isSelected ? { borderColor: colorConfig.primaryHex } : undefined}
                    className={`w-14 h-14 rounded-xl border-2 transition-transform cursor-pointer flex-shrink-0 relative overflow-hidden ${wp.bgClass} ${
                      isSelected ? 'scale-105' : 'border-[#e9edef] dark:border-[#1f2c34] hover:border-slate-400'
                    }`}
                    title={wp.name}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[3]" style={{ color: colorConfig.primaryHex }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: Profile Information */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Profile Information
          </h2>

          <div className="divide-y divide-[#e9edef] dark:divide-[#1f2c34] border border-[#e9edef] dark:border-[#1f2c34] rounded-2xl overflow-hidden bg-[#f0f2f5]/40 dark:bg-[#111b21]/40">
            {profileRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between py-3.5 group hover:bg-[#f0f2f5] dark:hover:bg-[#111b21]/80 px-4 transition-colors"
              >
                <div className="min-w-0 pr-4">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">{row.label}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white block truncate mt-0.5">{row.value}</span>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(row.key, row.value === 'Not set' ? '' : row.value.replace(/^@/, ''))}
                  className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#1f2c34] transition cursor-pointer"
                  title={`Edit ${row.label}`}
                >
                  <Pencil className="w-4 h-4 stroke-[1.8]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Field Edit Dialog Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit {editingField === 'displayName' ? 'Display Name' : editingField === 'about' || editingField === 'bio' ? 'Bio' : editingField.charAt(0).toUpperCase() + editingField.slice(1)}
              </h3>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1f2c34] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-[#202c33] border border-slate-200 dark:border-[#2a3942] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition"
              placeholder={`Enter ${editingField}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveField();
              }}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1f2c34] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveField}
                disabled={isSaving}
                style={{ backgroundColor: colorConfig.primaryHex }}
                className="px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 hover:opacity-95 cursor-pointer shadow-xs"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
