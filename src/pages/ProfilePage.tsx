import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Avatar } from '../components/common/Avatar';
import { SEO } from '../components/common/SEO';
import { uploadMediaFile } from '../services/storageService';
import { checkUsernameAvailable } from '../services/userService';
import { 
  ArrowLeft, 
  Camera, 
  User, 
  AtSign, 
  FileText, 
  Mail, 
  Check, 
  Loader2, 
  Shuffle, 
  Shield,
  LogOut 
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { profile, updateProfileData, logout } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [about, setAbout] = useState(profile?.about || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Avatar image must be under 5MB.');
      return;
    }

    try {
      setUploadingAvatar(true);
      const path = `avatars/${profile.uid}/${Date.now()}_${file.name}`;
      const url = await uploadMediaFile(path, file);
      setPhotoURL(url);
      await updateProfileData({ photoURL: url });
      showToast('success', 'Profile photo updated!');
    } catch (err) {
      showToast('error', 'Failed to upload photo.');
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRandomizeAvatar = async () => {
    const randomSeed = Math.random().toString(36).substring(2, 8);
    const newAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`;
    setPhotoURL(newAvatar);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !username) {
      showToast('error', 'Display name and username are required.');
      return;
    }

    setSaving(true);
    try {
      // Check username if changed
      if (profile && username.toLowerCase() !== profile.username.toLowerCase()) {
        const isFree = await checkUsernameAvailable(username);
        if (!isFree) {
          showToast('error', 'This username is already taken.');
          setSaving(false);
          return;
        }
      }

      await updateProfileData({
        displayName: displayName.trim(),
        username: username.toLowerCase().trim(),
        about: about.trim(),
        photoURL
      });

      showToast('success', 'Profile saved successfully!');
    } catch (err) {
      showToast('error', 'Failed to update profile.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0c12] text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 transition-colors">
      <SEO title="User Profile – Connecto" description="Manage your personal profile, avatar, and account details." />

      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Chats
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Settings</span>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 sm:p-8 shadow-xl space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative group">
              <Avatar
                src={photoURL}
                name={displayName || 'User'}
                size="xl"
                isOnline={profile?.isOnline}
                showOnlineStatus
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition backdrop-blur-2xs cursor-pointer"
                title="Change Avatar"
              >
                {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFile}
              accept="image/*"
              className="hidden"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#1e2530] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0d1117] transition cursor-pointer"
              >
                Upload Photo
              </button>
              <button
                type="button"
                onClick={handleRandomizeAvatar}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#1e2530] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0d1117] transition flex items-center gap-1 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5 text-blue-500" /> Randomize
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Display Name
              </label>
              <div className="relative rounded-2xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative rounded-2xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <AtSign className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                About / Bio
              </label>
              <div className="relative rounded-2xl shadow-xs">
                <div className="absolute top-3 left-3.5 pointer-events-none text-slate-400">
                  <FileText className="w-4 h-4" />
                </div>
                <textarea
                  rows={3}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Tell your contacts what you're working on..."
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address (Read-Only)
              </label>
              <div className="relative rounded-2xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-[#0d1117]/60 border border-slate-200 dark:border-[#1e2530]/60 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-4 flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition disabled:opacity-50 cursor-pointer shadow-blue-900/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save Profile
                </>
              )}
            </button>

            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
