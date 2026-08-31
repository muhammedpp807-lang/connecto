import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Pencil, 
  Check, 
  X, 
  Loader2, 
  User, 
  AtSign, 
  FileText, 
  Globe, 
  MapPin, 
  Mail, 
  ShieldCheck, 
  Trash2,
  Image as ImageIcon 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { uploadMediaFile } from '../../services/storageService';
import { checkUsernameAvailable } from '../../services/userService';

export const ProfilePageView: React.FC = () => {
  const { profile, updateProfileData } = useAuth();
  const { showToast } = useNotifications();
  const { colorConfig } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [about, setAbout] = useState(profile?.about || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [statusMessage, setStatusMessage] = useState(profile?.statusMessage || '');
  const [coverUrl, setCoverUrl] = useState(profile?.coverURL || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 100 * 1024 * 1024) {
      showToast('error', 'Image must be under 100MB.');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const path = `avatars/${profile.uid}/${Date.now()}_${file.name}`;
      const url = await uploadMediaFile(path, file);
      await updateProfileData({ photoURL: url });
      showToast('success', 'Profile photo updated!');
    } catch {
      showToast('error', 'Failed to upload profile photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;
    try {
      await updateProfileData({ photoURL: '' });
      showToast('success', 'Profile photo removed');
    } catch {
      showToast('error', 'Failed to remove photo');
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 100 * 1024 * 1024) {
      showToast('error', 'Cover image must be under 100MB.');
      return;
    }

    try {
      setIsUploadingCover(true);
      const path = `covers/${profile.uid}/${Date.now()}_${file.name}`;
      const url = await uploadMediaFile(path, file);
      setCoverUrl(url);
      await updateProfileData({ coverURL: url });
      showToast('success', 'Cover photo updated!');
    } catch {
      showToast('error', 'Failed to upload cover photo.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!displayName.trim() || !username.trim()) {
      showToast('error', 'Display name and username are required.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanUser = username.trim().toLowerCase();
      if (cleanUser !== profile.username?.toLowerCase()) {
        const isFree = await checkUsernameAvailable(cleanUser);
        if (!isFree) {
          showToast('error', 'This username is already in use.');
          setIsSaving(false);
          return;
        }
      }

      await updateProfileData({
        displayName: displayName.trim(),
        username: cleanUser,
        about: about.trim(),
        website: website.trim(),
        location: location.trim(),
        statusMessage: statusMessage.trim()
      });

      showToast('success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch {
      showToast('error', 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const cleanDisplayName = profile?.displayName || 'My Profile';
  const initials = profile?.displayName
    ? profile.displayName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '';

  return (
    <div className="flex-1 h-full flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a] text-slate-900 dark:text-slate-100 overflow-y-auto select-none transition-colors">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={coverInputRef}
        onChange={handleCoverUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Top Banner / Cover */}
      <div
        className="w-full h-44 sm:h-56 relative bg-slate-300 dark:bg-[#111b21] bg-cover bg-center border-b border-[#e9edef] dark:border-[#1f2c34]"
        style={
          coverUrl || profile?.coverURL
            ? { backgroundImage: `url(${coverUrl || profile?.coverURL})` }
            : {
                background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)'
              }
        }
      >
        {/* Change Cover Button at Top Right */}
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={isUploadingCover}
          className="absolute top-6 right-8 px-4 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-2 border border-white/20 transition-transform active:scale-95 cursor-pointer shadow-lg"
        >
          {isUploadingCover ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
          <span>Change Cover</span>
        </button>
      </div>

      {/* Centered Profile Identity Section */}
      <div className="flex flex-col items-center -mt-16 sm:-mt-20 px-6 pb-12 space-y-4">
        {/* Large Centered Avatar with Camera Badge */}
        <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-[#f0f2f5] dark:ring-[#0b141a] overflow-hidden bg-slate-200 dark:bg-[#202c33] shadow-2xl flex items-center justify-center">
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName || 'Profile'}
                className="w-full h-full object-cover"
              />
            ) : initials ? (
              <div 
                style={{ backgroundColor: colorConfig.primaryHex }}
                className="w-full h-full flex items-center justify-center text-white text-3xl sm:text-4xl font-bold tracking-tight"
              >
                {initials}
              </div>
            ) : (
              <div className="w-full h-full bg-slate-300 dark:bg-[#202c33] flex items-center justify-center text-slate-600 dark:text-slate-300">
                <User className="w-14 h-14 stroke-[1.75]" />
              </div>
            )}
          </div>

          {/* Camera Overlay Icon on Avatar */}
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
            <Camera className="w-8 h-8 drop-shadow" />
          </div>

          {/* Mini Camera icon badge at bottom-right of avatar */}
          <div 
            style={{ backgroundColor: colorConfig.primaryHex }}
            className="absolute bottom-1 right-1 w-8 h-8 rounded-full text-white flex items-center justify-center border-2 border-[#f0f2f5] dark:border-[#0b141a] shadow group-hover:scale-110 transition"
          >
            {isUploadingPhoto ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Username */}
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {cleanDisplayName}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
            @{profile?.username || 'username'}
          </p>
        </div>

        {/* Action Buttons: Edit Profile & Remove Photo */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDisplayName(profile?.displayName || '');
              setUsername(profile?.username || '');
              setAbout(profile?.about || '');
              setWebsite(profile?.website || '');
              setLocation(profile?.location || '');
              setStatusMessage(profile?.statusMessage || '');
              setIsEditing(true);
            }}
            className="px-6 py-2.5 rounded-xl bg-white dark:bg-[#202c33] hover:bg-slate-100 dark:hover:bg-[#2a3942] text-slate-900 dark:text-white text-sm font-semibold flex items-center gap-2 border border-[#e9edef] dark:border-[#2a3942] transition-colors cursor-pointer shadow-xs"
          >
            <Pencil className="w-4 h-4" style={{ color: colorConfig.primaryHex }} />
            <span>Edit Profile</span>
          </button>

          {profile?.photoURL && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#202c33] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center gap-1.5 border border-[#e9edef] dark:border-[#2a3942] transition cursor-pointer shadow-xs"
              title="Remove Profile Photo"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Remove Photo</span>
            </button>
          )}
        </div>

        {/* Information Overview Grid */}
        <div className="w-full max-w-lg mt-6 bg-white dark:bg-[#111b21] rounded-2xl border border-[#e9edef] dark:border-[#1f2c34] p-6 space-y-4 divide-y divide-[#e9edef] dark:divide-[#1f2c34] shadow-xs">
          <div className="pt-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Bio</span>
            <p className="text-sm text-slate-800 dark:text-slate-200 mt-1">{profile?.about || 'No bio yet.'}</p>
          </div>

          <div className="pt-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Status Message</span>
            <p className="text-sm font-medium mt-1" style={{ color: colorConfig.primaryHex }}>
              {profile?.statusMessage || 'Available'}
            </p>
          </div>

          {profile?.website && (
            <div className="pt-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Website</span>
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs hover:underline"
                style={{ color: colorConfig.primaryHex }}
              >
                {profile.website}
              </a>
            </div>
          )}

          {profile?.location && (
            <div className="pt-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</span>
              <span className="text-xs text-slate-700 dark:text-slate-300">{profile.location}</span>
            </div>
          )}

          <div className="pt-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{profile?.email || 'Encrypted'}</span>
          </div>
        </div>
      </div>

      {/* Edit Profile Full Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-[#1f2c34] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#e9edef] dark:border-[#1f2c34] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Profile Details</h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1f2c34]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#202c33] border border-slate-300 dark:border-[#2a3942] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1"
                  placeholder="Your Name"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#202c33] border border-slate-300 dark:border-[#2a3942] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1"
                  placeholder="username"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bio / About</label>
                <textarea
                  rows={2}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#202c33] border border-slate-300 dark:border-[#2a3942] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 resize-none"
                  placeholder="Tell something about yourself"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Message</label>
                <input
                  type="text"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#202c33] border border-slate-300 dark:border-[#2a3942] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1"
                  placeholder="Available, Busy, at Work..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#202c33] border border-slate-300 dark:border-[#2a3942] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#202c33] border border-slate-300 dark:border-[#2a3942] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1"
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#e9edef] dark:border-[#1f2c34]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1f2c34] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                style={{ backgroundColor: colorConfig.primaryHex }}
                className="px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-md cursor-pointer"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

